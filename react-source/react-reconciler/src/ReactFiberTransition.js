/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { NoLane } from './ReactFiberLane';
import { enableTransitionTracing, enableViewTransition, enableGestureTransition } from 'shared/ReactFeatureFlags';
import { isPrimaryRenderer } from './ReactFiberConfig';
import { createCursor, push, pop } from './ReactFiberStack';
import { getWorkInProgressRoot, getWorkInProgressTransitions } from './ReactFiberWorkLoop';
import { createCache, retainCache, CacheContext } from './ReactFiberCacheComponent';
import { queueTransitionTypes, entangleAsyncTransitionTypes, entangledTransitionTypes } from './ReactFiberTransitionTypes';
import ReactSharedInternals from 'shared/ReactSharedInternals';
import { entangleAsyncAction, peekEntangledActionLane } from './ReactFiberAsyncAction';
import { startAsyncTransitionTimer } from './ReactProfilerTimer';
import { firstScheduledRoot } from './ReactFiberRootScheduler';
import { startScheduledGesture, cancelScheduledGesture } from './ReactFiberGestureScheduler';
export var NoTransition = null; // Attach this reconciler instance's onStartTransitionFinish implementation to
// the shared internals object. This is used by the isomorphic implementation of
// startTransition to compose all the startTransitions together.
//
//   function startTransition(fn) {
//     return startTransitionDOM(() => {
//       return startTransitionART(() => {
//         return startTransitionThreeFiber(() => {
//           // and so on...
//           return fn();
//         });
//       });
//     });
//   }
//
// Currently we only compose together the code that runs at the end of each
// startTransition, because for now that's sufficient — the part that sets
// isTransition=true on the stack uses a separate shared internal field. But
// really we should delete the shared field and track isTransition per
// reconciler. Leaving this for a future PR.

var prevOnStartTransitionFinish = ReactSharedInternals.S;

ReactSharedInternals.S = function onStartTransitionFinishForReconciler(transition, returnValue) {
  if (typeof returnValue === 'object' && returnValue !== null && typeof returnValue.then === 'function') {
    // If we're going to wait on some async work before scheduling an update.
    // We mark the time so we can later log how long we were blocked on the Action.
    // Ideally, we'd include the sync part of the action too but since that starts
    // in isomorphic code it currently leads to tricky layering. We'd have to pass
    // in performance.now() to this callback but we sometimes use a polyfill.
    startAsyncTransitionTimer(); // This is an async action

    var thenable = returnValue;
    entangleAsyncAction(transition, thenable);
  }

  if (enableViewTransition) {
    if (entangledTransitionTypes !== null) {
      // If we scheduled work on any new roots, we need to add any entangled async
      // transition types to those roots too.
      var root = firstScheduledRoot;

      while (root !== null) {
        queueTransitionTypes(root, entangledTransitionTypes);
        root = root.next;
      }
    }

    var transitionTypes = transition.types;

    if (transitionTypes !== null) {
      // Within this Transition we should've now scheduled any roots we have updates
      // to work on. If there are no updates on a root, then the Transition type won't
      // be applied to that root.
      var _root = firstScheduledRoot;

      while (_root !== null) {
        queueTransitionTypes(_root, transitionTypes);
        _root = _root.next;
      }

      if (peekEntangledActionLane() !== NoLane) {
        // If we have entangled, async actions going on, the update associated with
        // these types might come later. We need to save them for later.
        entangleAsyncTransitionTypes(transitionTypes);
      }
    }
  }

  if (prevOnStartTransitionFinish !== null) {
    prevOnStartTransitionFinish(transition, returnValue);
  }
};

function chainGestureCancellation(root, scheduledGesture, prevCancel) {
  return function cancelGesture() {
    if (scheduledGesture !== null) {
      cancelScheduledGesture(root, scheduledGesture);
    }

    if (prevCancel !== null) {
      prevCancel();
    }
  };
}

if (enableGestureTransition) {
  var prevOnStartGestureTransitionFinish = ReactSharedInternals.G;

  ReactSharedInternals.G = function onStartGestureTransitionFinishForReconciler(transition, provider, options) {
    var cancel = null;

    if (prevOnStartGestureTransitionFinish !== null) {
      cancel = prevOnStartGestureTransitionFinish(transition, provider, options);
    } // For every root that has work scheduled, check if there's a ScheduledGesture
    // matching this provider and if so, increase its ref count so its retained by
    // this cancellation callback. We could add the roots to a temporary array as
    // we schedule them inside the callback to keep track of them. There's a slight
    // nuance here which is that if there's more than one root scheduled with the
    // same provider, but it doesn't update in this callback, then we still update
    // its options and retain it until this cancellation releases. The idea being
    // that it's conceptually started globally.


    var root = firstScheduledRoot;

    while (root !== null) {
      var scheduledGesture = startScheduledGesture(root, provider, options, transition.types);

      if (scheduledGesture !== null) {
        cancel = chainGestureCancellation(root, scheduledGesture, cancel);
      }

      root = root.next;
    }

    if (cancel !== null) {
      return cancel;
    }

    return function cancelGesture() {// Nothing was scheduled but it could've been scheduled by another renderer.
    };
  };
}

export function requestCurrentTransition() {
  return ReactSharedInternals.T;
} // When retrying a Suspense/Offscreen boundary, we restore the cache that was
// used during the previous render by placing it here, on the stack.

var resumedCache = createCursor(null); // During the render/synchronous commit phase, we don't actually process the
// transitions. Therefore, we want to lazily combine transitions. Instead of
// comparing the arrays of transitions when we combine them and storing them
// and filtering out the duplicates, we will instead store the unprocessed transitions
// in an array and actually filter them in the passive phase.

var transitionStack = createCursor(null);

function peekCacheFromPool() {
  // Check if the cache pool already has a cache we can use.
  // If we're rendering inside a Suspense boundary that is currently hidden,
  // we should use the same cache that we used during the previous render, if
  // one exists.
  var cacheResumedFromPreviousRender = resumedCache.current;

  if (cacheResumedFromPreviousRender !== null) {
    return cacheResumedFromPreviousRender;
  } // Otherwise, check the root's cache pool.


  var root = getWorkInProgressRoot();
  var cacheFromRootCachePool = root.pooledCache;
  return cacheFromRootCachePool;
}

export function requestCacheFromPool(renderLanes) {
  // Similar to previous function, except if there's not already a cache in the
  // pool, we allocate a new one.
  var cacheFromPool = peekCacheFromPool();

  if (cacheFromPool !== null) {
    return cacheFromPool;
  } // Create a fresh cache and add it to the root cache pool. A cache can have
  // multiple owners:
  // - A cache pool that lives on the FiberRoot. This is where all fresh caches
  //   are originally created (TODO: except during refreshes, until we implement
  //   this correctly). The root takes ownership immediately when the cache is
  //   created. Conceptually, root.pooledCache is an Option<Arc<Cache>> (owned),
  //   and the return value of this function is a &Arc<Cache> (borrowed).
  // - One of several fiber types: host root, cache boundary, suspense
  //   component. These retain and release in the commit phase.


  var root = getWorkInProgressRoot();
  var freshCache = createCache();
  root.pooledCache = freshCache;
  retainCache(freshCache);

  if (freshCache !== null) {
    root.pooledCacheLanes |= renderLanes;
  }

  return freshCache;
}
export function pushRootTransition(workInProgress, root, renderLanes) {
  if (enableTransitionTracing) {
    var rootTransitions = getWorkInProgressTransitions();
    push(transitionStack, rootTransitions, workInProgress);
  }
}
export function popRootTransition(workInProgress, root, renderLanes) {
  if (enableTransitionTracing) {
    pop(transitionStack, workInProgress);
  }
}
export function pushTransition(offscreenWorkInProgress, prevCachePool, newTransitions) {
  if (prevCachePool === null) {
    push(resumedCache, resumedCache.current, offscreenWorkInProgress);
  } else {
    push(resumedCache, prevCachePool.pool, offscreenWorkInProgress);
  }

  if (enableTransitionTracing) {
    if (transitionStack.current === null) {
      push(transitionStack, newTransitions, offscreenWorkInProgress);
    } else if (newTransitions === null) {
      push(transitionStack, transitionStack.current, offscreenWorkInProgress);
    } else {
      push(transitionStack, transitionStack.current.concat(newTransitions), offscreenWorkInProgress);
    }
  }
}
export function popTransition(workInProgress, current) {
  if (current !== null) {
    if (enableTransitionTracing) {
      pop(transitionStack, workInProgress);
    }

    pop(resumedCache, workInProgress);
  }
}
export function getPendingTransitions() {
  if (!enableTransitionTracing) {
    return null;
  }

  return transitionStack.current;
}
export function getSuspendedCache() {
  // This function is called when a Suspense boundary suspends. It returns the
  // cache that would have been used to render fresh data during this render,
  // if there was any, so that we can resume rendering with the same cache when
  // we receive more data.
  var cacheFromPool = peekCacheFromPool();

  if (cacheFromPool === null) {
    return null;
  }

  return {
    // We must also save the parent, so that when we resume we can detect
    // a refresh.
    parent: isPrimaryRenderer ? CacheContext._currentValue : CacheContext._currentValue2,
    pool: cacheFromPool
  };
}
export function getOffscreenDeferredCache() {
  var cacheFromPool = peekCacheFromPool();

  if (cacheFromPool === null) {
    return null;
  }

  return {
    // We must also store the parent, so that when we resume we can detect
    // a refresh.
    parent: isPrimaryRenderer ? CacheContext._currentValue : CacheContext._currentValue2,
    pool: cacheFromPool
  };
}