/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { LegacyRoot } from './ReactRootTags';
import { findCurrentHostFiber, findCurrentHostFiberWithNoPortals } from './ReactFiberTreeReflection';
import { get as getInstance } from 'shared/ReactInstanceMap';
import { HostComponent, HostSingleton, ClassComponent, HostRoot, SuspenseComponent, ActivityComponent } from './ReactWorkTags';
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import isArray from 'shared/isArray';
import { enableSchedulingProfiler, enableHydrationLaneScheduling, disableLegacyMode } from 'shared/ReactFeatureFlags';
import ReactSharedInternals from 'shared/ReactSharedInternals';
import { getPublicInstance, rendererVersion, rendererPackageName, extraDevToolsConfig } from './ReactFiberConfig';
import { findCurrentUnmaskedContext, processChildContext, emptyContextObject, isContextProvider as isLegacyContextProvider } from './ReactFiberContext';
import { createFiberRoot } from './ReactFiberRoot';
import { isRootDehydrated } from './ReactFiberShellHydration';
import { injectInternals, markRenderScheduled, onScheduleRoot, injectProfilingHooks } from './ReactFiberDevToolsHook';
import { startUpdateTimerByLane } from './ReactProfilerTimer';
import { requestUpdateLane, scheduleUpdateOnFiber, scheduleInitialHydrationOnRoot, flushRoot, batchedUpdates, flushSyncFromReconciler, flushSyncWork, isAlreadyRendering, deferredUpdates, discreteUpdates, flushPendingEffects } from './ReactFiberWorkLoop';
import { enqueueConcurrentRenderForLane } from './ReactFiberConcurrentUpdates';
import { createUpdate, enqueueUpdate, entangleTransitions } from './ReactFiberClassUpdateQueue';
import { isRendering as ReactCurrentFiberIsRendering, current as ReactCurrentFiberCurrent, runWithFiberInDEV } from './ReactCurrentFiber';
import { StrictLegacyMode } from './ReactTypeOfMode';
import { SyncLane, SelectiveHydrationLane, getHighestPriorityPendingLanes, higherPriorityLane, getBumpedLaneForHydrationByLane } from './ReactFiberLane';
import { scheduleRefresh, scheduleRoot, setRefreshHandler } from './ReactFiberHotReloading';
import ReactVersion from 'shared/ReactVersion';
export { createPortal } from './ReactPortal';
export { createComponentSelector, createHasPseudoClassSelector, createRoleSelector, createTestNameSelector, createTextSelector, getFindAllNodesFailureDescription, findAllNodes, findBoundingRects, focusWithin, observeVisibleRects } from './ReactTestSelectors';
export { startHostTransition } from './ReactFiberHooks';
export { defaultOnUncaughtError, defaultOnCaughtError, defaultOnRecoverableError } from './ReactFiberErrorLogger';
import { getLabelForLane, TotalLanes } from 'react-reconciler/src/ReactFiberLane';
import { registerDefaultIndicator } from './ReactFiberAsyncAction';
var didWarnAboutNestedUpdates;
var didWarnAboutFindNodeInStrictMode;

if (__DEV__) {
  didWarnAboutNestedUpdates = false;
  didWarnAboutFindNodeInStrictMode = {};
}

function getContextForSubtree(parentComponent) {
  if (!parentComponent) {
    return emptyContextObject;
  }

  var fiber = getInstance(parentComponent);
  var parentContext = findCurrentUnmaskedContext(fiber);

  if (fiber.tag === ClassComponent) {
    var Component = fiber.type;

    if (isLegacyContextProvider(Component)) {
      return processChildContext(fiber, Component, parentContext);
    }
  }

  return parentContext;
}

function findHostInstance(component) {
  var fiber = getInstance(component);

  if (fiber === undefined) {
    if (typeof component.render === 'function') {
      throw new Error('Unable to find node on an unmounted component.');
    } else {
      var keys = Object.keys(component).join(',');
      throw new Error("Argument appears to not be a ReactComponent. Keys: " + keys);
    }
  }

  var hostFiber = findCurrentHostFiber(fiber);

  if (hostFiber === null) {
    return null;
  }

  return getPublicInstance(hostFiber.stateNode);
}

function findHostInstanceWithWarning(component, methodName) {
  if (__DEV__) {
    var fiber = getInstance(component);

    if (fiber === undefined) {
      if (typeof component.render === 'function') {
        throw new Error('Unable to find node on an unmounted component.');
      } else {
        var keys = Object.keys(component).join(',');
        throw new Error("Argument appears to not be a ReactComponent. Keys: " + keys);
      }
    }

    var hostFiber = findCurrentHostFiber(fiber);

    if (hostFiber === null) {
      return null;
    }

    if (hostFiber.mode & StrictLegacyMode) {
      var componentName = getComponentNameFromFiber(fiber) || 'Component';

      if (!didWarnAboutFindNodeInStrictMode[componentName]) {
        didWarnAboutFindNodeInStrictMode[componentName] = true;
        runWithFiberInDEV(hostFiber, function () {
          if (fiber.mode & StrictLegacyMode) {
            console.error('%s is deprecated in StrictMode. ' + '%s was passed an instance of %s which is inside StrictMode. ' + 'Instead, add a ref directly to the element you want to reference. ' + 'Learn more about using refs safely here: ' + 'https://react.dev/link/strict-mode-find-node', methodName, methodName, componentName);
          } else {
            console.error('%s is deprecated in StrictMode. ' + '%s was passed an instance of %s which renders StrictMode children. ' + 'Instead, add a ref directly to the element you want to reference. ' + 'Learn more about using refs safely here: ' + 'https://react.dev/link/strict-mode-find-node', methodName, methodName, componentName);
          }
        });
      }
    }

    return getPublicInstance(hostFiber.stateNode);
  }

  return findHostInstance(component);
}

export function createContainer(containerInfo, tag, hydrationCallbacks, isStrictMode, // TODO: Remove `concurrentUpdatesByDefaultOverride`. It is now ignored.
concurrentUpdatesByDefaultOverride, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator, transitionCallbacks) {
  var hydrate = false;
  var initialChildren = null;
  var root = createFiberRoot(containerInfo, tag, hydrate, initialChildren, hydrationCallbacks, isStrictMode, identifierPrefix, null, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator, transitionCallbacks);
  registerDefaultIndicator(onDefaultTransitionIndicator);
  return root;
}
export function createHydrationContainer(initialChildren, // TODO: Remove `callback` when we delete legacy mode.
callback, containerInfo, tag, hydrationCallbacks, isStrictMode, // TODO: Remove `concurrentUpdatesByDefaultOverride`. It is now ignored.
concurrentUpdatesByDefaultOverride, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator, transitionCallbacks, formState) {
  var hydrate = true;
  var root = createFiberRoot(containerInfo, tag, hydrate, initialChildren, hydrationCallbacks, isStrictMode, identifierPrefix, formState, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator, transitionCallbacks);
  registerDefaultIndicator(onDefaultTransitionIndicator); // TODO: Move this to FiberRoot constructor

  root.context = getContextForSubtree(null); // Schedule the initial render. In a hydration root, this is different from
  // a regular update because the initial render must match was was rendered
  // on the server.
  // NOTE: This update intentionally doesn't have a payload. We're only using
  // the update to schedule work on the root fiber (and, for legacy roots, to
  // enqueue the callback if one is provided).

  var current = root.current;
  var lane = requestUpdateLane(current);

  if (enableHydrationLaneScheduling) {
    lane = getBumpedLaneForHydrationByLane(lane);
  }

  var update = createUpdate(lane);
  update.callback = callback !== undefined && callback !== null ? callback : null;
  enqueueUpdate(current, update, lane);
  scheduleInitialHydrationOnRoot(root, lane);
  return root;
}
export function updateContainer(element, container, parentComponent, callback) {
  var current = container.current;
  var lane = requestUpdateLane(current);
  updateContainerImpl(current, lane, element, container, parentComponent, callback);
  return lane;
}
export function updateContainerSync(element, container, parentComponent, callback) {
  if (!disableLegacyMode && container.tag === LegacyRoot) {
    flushPendingEffects();
  }

  var current = container.current;
  updateContainerImpl(current, SyncLane, element, container, parentComponent, callback);
  return SyncLane;
}

function updateContainerImpl(rootFiber, lane, element, container, parentComponent, callback) {
  if (__DEV__) {
    onScheduleRoot(container, element);
  }

  if (enableSchedulingProfiler) {
    markRenderScheduled(lane);
  }

  var context = getContextForSubtree(parentComponent);

  if (container.context === null) {
    container.context = context;
  } else {
    container.pendingContext = context;
  }

  if (__DEV__) {
    if (ReactCurrentFiberIsRendering && ReactCurrentFiberCurrent !== null && !didWarnAboutNestedUpdates) {
      didWarnAboutNestedUpdates = true;
      console.error('Render methods should be a pure function of props and state; ' + 'triggering nested component updates from render is not allowed. ' + 'If necessary, trigger nested updates in componentDidUpdate.\n\n' + 'Check the render method of %s.', getComponentNameFromFiber(ReactCurrentFiberCurrent) || 'Unknown');
    }
  }

  var update = createUpdate(lane); // Caution: React DevTools currently depends on this property
  // being called "element".

  update.payload = {
    element: element
  };
  callback = callback === undefined ? null : callback;

  if (callback !== null) {
    if (__DEV__) {
      if (typeof callback !== 'function') {
        console.error('Expected the last optional `callback` argument to be a ' + 'function. Instead received: %s.', callback);
      }
    }

    update.callback = callback;
  }

  var root = enqueueUpdate(rootFiber, update, lane);

  if (root !== null) {
    startUpdateTimerByLane(lane, 'root.render()');
    scheduleUpdateOnFiber(root, rootFiber, lane);
    entangleTransitions(root, rootFiber, lane);
  }
}

export { batchedUpdates, deferredUpdates, discreteUpdates, flushSyncFromReconciler, flushSyncWork, isAlreadyRendering, flushPendingEffects as flushPassiveEffects };
export function getPublicRootInstance(container) {
  var containerFiber = container.current;

  if (!containerFiber.child) {
    return null;
  }

  switch (containerFiber.child.tag) {
    case HostSingleton:
    case HostComponent:
      return getPublicInstance(containerFiber.child.stateNode);

    default:
      return containerFiber.child.stateNode;
  }
}
export function attemptSynchronousHydration(fiber) {
  switch (fiber.tag) {
    case HostRoot:
      {
        var root = fiber.stateNode;

        if (isRootDehydrated(root)) {
          // Flush the first scheduled "update".
          var lanes = getHighestPriorityPendingLanes(root);
          flushRoot(root, lanes);
        }

        break;
      }

    case ActivityComponent:
    case SuspenseComponent:
      {
        var _root = enqueueConcurrentRenderForLane(fiber, SyncLane);

        if (_root !== null) {
          scheduleUpdateOnFiber(_root, fiber, SyncLane);
        }

        flushSyncWork(); // If we're still blocked after this, we need to increase
        // the priority of any promises resolving within this
        // boundary so that they next attempt also has higher pri.

        var retryLane = SyncLane;
        markRetryLaneIfNotHydrated(fiber, retryLane);
        break;
      }
  }
}

function markRetryLaneImpl(fiber, retryLane) {
  var suspenseState = fiber.memoizedState;

  if (suspenseState !== null && suspenseState.dehydrated !== null) {
    suspenseState.retryLane = higherPriorityLane(suspenseState.retryLane, retryLane);
  }
} // Increases the priority of thenables when they resolve within this boundary.


function markRetryLaneIfNotHydrated(fiber, retryLane) {
  markRetryLaneImpl(fiber, retryLane);
  var alternate = fiber.alternate;

  if (alternate) {
    markRetryLaneImpl(alternate, retryLane);
  }
}

export function attemptContinuousHydration(fiber) {
  if (fiber.tag !== SuspenseComponent && fiber.tag !== ActivityComponent) {
    // We ignore HostRoots here because we can't increase
    // their priority and they should not suspend on I/O,
    // since you have to wrap anything that might suspend in
    // Suspense.
    return;
  }

  var lane = SelectiveHydrationLane;
  var root = enqueueConcurrentRenderForLane(fiber, lane);

  if (root !== null) {
    scheduleUpdateOnFiber(root, fiber, lane);
  }

  markRetryLaneIfNotHydrated(fiber, lane);
}
export function attemptHydrationAtCurrentPriority(fiber) {
  if (fiber.tag !== SuspenseComponent && fiber.tag !== ActivityComponent) {
    // We ignore HostRoots here because we can't increase
    // their priority other than synchronously flush it.
    return;
  }

  var lane = requestUpdateLane(fiber);

  if (enableHydrationLaneScheduling) {
    lane = getBumpedLaneForHydrationByLane(lane);
  }

  var root = enqueueConcurrentRenderForLane(fiber, lane);

  if (root !== null) {
    scheduleUpdateOnFiber(root, fiber, lane);
  }

  markRetryLaneIfNotHydrated(fiber, lane);
}
export { findHostInstance };
export { findHostInstanceWithWarning };
export function findHostInstanceWithNoPortals(fiber) {
  var hostFiber = findCurrentHostFiberWithNoPortals(fiber);

  if (hostFiber === null) {
    return null;
  }

  return getPublicInstance(hostFiber.stateNode);
}

var shouldErrorImpl = function (fiber) {
  return null;
};

export function shouldError(fiber) {
  return shouldErrorImpl(fiber);
}

var shouldSuspendImpl = function (fiber) {
  return false;
};

export function shouldSuspend(fiber) {
  return shouldSuspendImpl(fiber);
}
var overrideHookState = null;
var overrideHookStateDeletePath = null;
var overrideHookStateRenamePath = null;
var overrideProps = null;
var overridePropsDeletePath = null;
var overridePropsRenamePath = null;
var scheduleUpdate = null;
var setErrorHandler = null;
var setSuspenseHandler = null;

if (__DEV__) {
  var copyWithDeleteImpl = function (obj, path, index) {
    var key = path[index];
    var updated = isArray(obj) ? obj.slice() : Object.assign({}, obj);

    if (index + 1 === path.length) {
      if (isArray(updated)) {
        updated.splice(key, 1);
      } else {
        delete updated[key];
      }

      return updated;
    } // $FlowFixMe[incompatible-use] number or string is fine here


    updated[key] = copyWithDeleteImpl(obj[key], path, index + 1);
    return updated;
  };

  var copyWithDelete = function (obj, path) {
    return copyWithDeleteImpl(obj, path, 0);
  };

  var copyWithRenameImpl = function (obj, oldPath, newPath, index) {
    var oldKey = oldPath[index];
    var updated = isArray(obj) ? obj.slice() : Object.assign({}, obj);

    if (index + 1 === oldPath.length) {
      var newKey = newPath[index]; // $FlowFixMe[incompatible-use] number or string is fine here

      updated[newKey] = updated[oldKey];

      if (isArray(updated)) {
        updated.splice(oldKey, 1);
      } else {
        delete updated[oldKey];
      }
    } else {
      // $FlowFixMe[incompatible-use] number or string is fine here
      updated[oldKey] = copyWithRenameImpl( // $FlowFixMe[incompatible-use] number or string is fine here
      obj[oldKey], oldPath, newPath, index + 1);
    }

    return updated;
  };

  var copyWithRename = function (obj, oldPath, newPath) {
    if (oldPath.length !== newPath.length) {
      console.warn('copyWithRename() expects paths of the same length');
      return;
    } else {
      for (var i = 0; i < newPath.length - 1; i++) {
        if (oldPath[i] !== newPath[i]) {
          console.warn('copyWithRename() expects paths to be the same except for the deepest key');
          return;
        }
      }
    }

    return copyWithRenameImpl(obj, oldPath, newPath, 0);
  };

  var copyWithSetImpl = function (obj, path, index, value) {
    if (index >= path.length) {
      return value;
    }

    var key = path[index];
    var updated = isArray(obj) ? obj.slice() : Object.assign({}, obj); // $FlowFixMe[incompatible-use] number or string is fine here

    updated[key] = copyWithSetImpl(obj[key], path, index + 1, value);
    return updated;
  };

  var copyWithSet = function (obj, path, value) {
    return copyWithSetImpl(obj, path, 0, value);
  };

  var findHook = function (fiber, id) {
    // For now, the "id" of stateful hooks is just the stateful hook index.
    // This may change in the future with e.g. nested hooks.
    var currentHook = fiber.memoizedState;

    while (currentHook !== null && id > 0) {
      currentHook = currentHook.next;
      id--;
    }

    return currentHook;
  }; // Support DevTools editable values for useState and useReducer.


  overrideHookState = function (fiber, id, path, value) {
    var hook = findHook(fiber, id);

    if (hook !== null) {
      var newState = copyWithSet(hook.memoizedState, path, value);
      hook.memoizedState = newState;
      hook.baseState = newState; // We aren't actually adding an update to the queue,
      // because there is no update we can add for useReducer hooks that won't trigger an error.
      // (There's no appropriate action type for DevTools overrides.)
      // As a result though, React will see the scheduled update as a noop and bailout.
      // Shallow cloning props works as a workaround for now to bypass the bailout check.

      fiber.memoizedProps = Object.assign({}, fiber.memoizedProps);
      var root = enqueueConcurrentRenderForLane(fiber, SyncLane);

      if (root !== null) {
        scheduleUpdateOnFiber(root, fiber, SyncLane);
      }
    }
  };

  overrideHookStateDeletePath = function (fiber, id, path) {
    var hook = findHook(fiber, id);

    if (hook !== null) {
      var newState = copyWithDelete(hook.memoizedState, path);
      hook.memoizedState = newState;
      hook.baseState = newState; // We aren't actually adding an update to the queue,
      // because there is no update we can add for useReducer hooks that won't trigger an error.
      // (There's no appropriate action type for DevTools overrides.)
      // As a result though, React will see the scheduled update as a noop and bailout.
      // Shallow cloning props works as a workaround for now to bypass the bailout check.

      fiber.memoizedProps = Object.assign({}, fiber.memoizedProps);
      var root = enqueueConcurrentRenderForLane(fiber, SyncLane);

      if (root !== null) {
        scheduleUpdateOnFiber(root, fiber, SyncLane);
      }
    }
  };

  overrideHookStateRenamePath = function (fiber, id, oldPath, newPath) {
    var hook = findHook(fiber, id);

    if (hook !== null) {
      var newState = copyWithRename(hook.memoizedState, oldPath, newPath);
      hook.memoizedState = newState;
      hook.baseState = newState; // We aren't actually adding an update to the queue,
      // because there is no update we can add for useReducer hooks that won't trigger an error.
      // (There's no appropriate action type for DevTools overrides.)
      // As a result though, React will see the scheduled update as a noop and bailout.
      // Shallow cloning props works as a workaround for now to bypass the bailout check.

      fiber.memoizedProps = Object.assign({}, fiber.memoizedProps);
      var root = enqueueConcurrentRenderForLane(fiber, SyncLane);

      if (root !== null) {
        scheduleUpdateOnFiber(root, fiber, SyncLane);
      }
    }
  }; // Support DevTools props for function components, forwardRef, memo, host components, etc.


  overrideProps = function (fiber, path, value) {
    fiber.pendingProps = copyWithSet(fiber.memoizedProps, path, value);

    if (fiber.alternate) {
      fiber.alternate.pendingProps = fiber.pendingProps;
    }

    var root = enqueueConcurrentRenderForLane(fiber, SyncLane);

    if (root !== null) {
      scheduleUpdateOnFiber(root, fiber, SyncLane);
    }
  };

  overridePropsDeletePath = function (fiber, path) {
    fiber.pendingProps = copyWithDelete(fiber.memoizedProps, path);

    if (fiber.alternate) {
      fiber.alternate.pendingProps = fiber.pendingProps;
    }

    var root = enqueueConcurrentRenderForLane(fiber, SyncLane);

    if (root !== null) {
      scheduleUpdateOnFiber(root, fiber, SyncLane);
    }
  };

  overridePropsRenamePath = function (fiber, oldPath, newPath) {
    fiber.pendingProps = copyWithRename(fiber.memoizedProps, oldPath, newPath);

    if (fiber.alternate) {
      fiber.alternate.pendingProps = fiber.pendingProps;
    }

    var root = enqueueConcurrentRenderForLane(fiber, SyncLane);

    if (root !== null) {
      scheduleUpdateOnFiber(root, fiber, SyncLane);
    }
  };

  scheduleUpdate = function (fiber) {
    var root = enqueueConcurrentRenderForLane(fiber, SyncLane);

    if (root !== null) {
      scheduleUpdateOnFiber(root, fiber, SyncLane);
    }
  };

  setErrorHandler = function (newShouldErrorImpl) {
    shouldErrorImpl = newShouldErrorImpl;
  };

  setSuspenseHandler = function (newShouldSuspendImpl) {
    shouldSuspendImpl = newShouldSuspendImpl;
  };
}

function getCurrentFiberForDevTools() {
  return ReactCurrentFiberCurrent;
}

function getLaneLabelMap() {
  if (enableSchedulingProfiler) {
    var map = new Map();
    var lane = 1;

    for (var index = 0; index < TotalLanes; index++) {
      var label = getLabelForLane(lane);
      map.set(lane, label);
      lane *= 2;
    }

    return map;
  } else {
    return null;
  }
}

export function injectIntoDevTools() {
  var internals = {
    bundleType: __DEV__ ? 1 : 0,
    // Might add PROFILE later.
    version: rendererVersion,
    rendererPackageName: rendererPackageName,
    currentDispatcherRef: ReactSharedInternals,
    // Enables DevTools to detect reconciler version rather than renderer version
    // which may not match for third party renderers.
    reconcilerVersion: ReactVersion
  };

  if (extraDevToolsConfig !== null) {
    internals.rendererConfig = extraDevToolsConfig;
  }

  if (__DEV__) {
    internals.overrideHookState = overrideHookState;
    internals.overrideHookStateDeletePath = overrideHookStateDeletePath;
    internals.overrideHookStateRenamePath = overrideHookStateRenamePath;
    internals.overrideProps = overrideProps;
    internals.overridePropsDeletePath = overridePropsDeletePath;
    internals.overridePropsRenamePath = overridePropsRenamePath;
    internals.scheduleUpdate = scheduleUpdate;
    internals.setErrorHandler = setErrorHandler;
    internals.setSuspenseHandler = setSuspenseHandler; // React Refresh

    internals.scheduleRefresh = scheduleRefresh;
    internals.scheduleRoot = scheduleRoot;
    internals.setRefreshHandler = setRefreshHandler; // Enables DevTools to append owner stacks to error messages in DEV mode.

    internals.getCurrentFiber = getCurrentFiberForDevTools;
  }

  if (enableSchedulingProfiler) {
    // Conditionally inject these hooks only if Timeline profiler is supported by this build.
    // This gives DevTools a way to feature detect that isn't tied to version number
    // (since profiling and timeline are controlled by different feature flags).
    internals.getLaneLabelMap = getLaneLabelMap;
    internals.injectProfilingHooks = injectProfilingHooks;
  }

  return injectInternals(internals);
}