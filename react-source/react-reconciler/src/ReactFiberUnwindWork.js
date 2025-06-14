/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { ClassComponent, HostRoot, HostComponent, HostHoistable, HostSingleton, HostPortal, ContextProvider, ActivityComponent, SuspenseComponent, SuspenseListComponent, OffscreenComponent, LegacyHiddenComponent, CacheComponent, TracingMarkerComponent } from './ReactWorkTags';
import { DidCapture, NoFlags, ShouldCapture } from './ReactFiberFlags';
import { NoMode, ProfileMode } from './ReactTypeOfMode';
import { enableProfilerTimer, enableTransitionTracing, enableRenderableContext } from 'shared/ReactFeatureFlags';
import { popHostContainer, popHostContext } from './ReactFiberHostContext';
import { popSuspenseListContext, popSuspenseHandler } from './ReactFiberSuspenseContext';
import { popHiddenContext } from './ReactFiberHiddenContext';
import { resetHydrationState } from './ReactFiberHydrationContext';
import { isContextProvider as isLegacyContextProvider, popContext as popLegacyContext, popTopLevelContextObject as popTopLevelLegacyContextObject } from './ReactFiberContext';
import { popProvider } from './ReactFiberNewContext';
import { popCacheProvider } from './ReactFiberCacheComponent';
import { transferActualDuration } from './ReactProfilerTimer';
import { popTreeContext } from './ReactFiberTreeContext';
import { popRootTransition, popTransition } from './ReactFiberTransition';
import { popMarkerInstance, popRootMarkerInstance } from './ReactFiberTracingMarkerComponent';

function unwindWork(current, workInProgress, renderLanes) {
  // Note: This intentionally doesn't check if we're hydrating because comparing
  // to the current tree provider fiber is just as fast and less error-prone.
  // Ideally we would have a special version of the work loop only
  // for hydration.
  popTreeContext(workInProgress);

  switch (workInProgress.tag) {
    case ClassComponent:
      {
        var Component = workInProgress.type;

        if (isLegacyContextProvider(Component)) {
          popLegacyContext(workInProgress);
        }

        var flags = workInProgress.flags;

        if (flags & ShouldCapture) {
          workInProgress.flags = flags & ~ShouldCapture | DidCapture;

          if (enableProfilerTimer && (workInProgress.mode & ProfileMode) !== NoMode) {
            transferActualDuration(workInProgress);
          }

          return workInProgress;
        }

        return null;
      }

    case HostRoot:
      {
        var root = workInProgress.stateNode;
        var _cache = workInProgress.memoizedState.cache;
        popCacheProvider(workInProgress, _cache);

        if (enableTransitionTracing) {
          popRootMarkerInstance(workInProgress);
        }

        popRootTransition(workInProgress, root, renderLanes);
        popHostContainer(workInProgress);
        popTopLevelLegacyContextObject(workInProgress);
        var _flags = workInProgress.flags;

        if ((_flags & ShouldCapture) !== NoFlags && (_flags & DidCapture) === NoFlags) {
          // There was an error during render that wasn't captured by a suspense
          // boundary. Do a second pass on the root to unmount the children.
          workInProgress.flags = _flags & ~ShouldCapture | DidCapture;
          return workInProgress;
        } // We unwound to the root without completing it. Exit.


        return null;
      }

    case HostHoistable:
    case HostSingleton:
    case HostComponent:
      {
        // TODO: popHydrationState
        popHostContext(workInProgress);
        return null;
      }

    case ActivityComponent:
      {
        var activityState = workInProgress.memoizedState;

        if (activityState !== null) {
          popSuspenseHandler(workInProgress);

          if (workInProgress.alternate === null) {
            throw new Error('Threw in newly mounted dehydrated component. This is likely a bug in ' + 'React. Please file an issue.');
          }

          resetHydrationState();
        }

        var _flags2 = workInProgress.flags;

        if (_flags2 & ShouldCapture) {
          workInProgress.flags = _flags2 & ~ShouldCapture | DidCapture; // Captured a suspense effect. Re-render the boundary.

          if (enableProfilerTimer && (workInProgress.mode & ProfileMode) !== NoMode) {
            transferActualDuration(workInProgress);
          }

          return workInProgress;
        }

        return null;
      }

    case SuspenseComponent:
      {
        popSuspenseHandler(workInProgress);
        var suspenseState = workInProgress.memoizedState;

        if (suspenseState !== null && suspenseState.dehydrated !== null) {
          if (workInProgress.alternate === null) {
            throw new Error('Threw in newly mounted dehydrated component. This is likely a bug in ' + 'React. Please file an issue.');
          }

          resetHydrationState();
        }

        var _flags3 = workInProgress.flags;

        if (_flags3 & ShouldCapture) {
          workInProgress.flags = _flags3 & ~ShouldCapture | DidCapture; // Captured a suspense effect. Re-render the boundary.

          if (enableProfilerTimer && (workInProgress.mode & ProfileMode) !== NoMode) {
            transferActualDuration(workInProgress);
          }

          return workInProgress;
        }

        return null;
      }

    case SuspenseListComponent:
      {
        popSuspenseListContext(workInProgress); // SuspenseList doesn't actually catch anything. It should've been
        // caught by a nested boundary. If not, it should bubble through.

        return null;
      }

    case HostPortal:
      popHostContainer(workInProgress);
      return null;

    case ContextProvider:
      var context;

      if (enableRenderableContext) {
        context = workInProgress.type;
      } else {
        context = workInProgress.type._context;
      }

      popProvider(context, workInProgress);
      return null;

    case OffscreenComponent:
    case LegacyHiddenComponent:
      {
        popSuspenseHandler(workInProgress);
        popHiddenContext(workInProgress);
        popTransition(workInProgress, current);
        var _flags4 = workInProgress.flags;

        if (_flags4 & ShouldCapture) {
          workInProgress.flags = _flags4 & ~ShouldCapture | DidCapture; // Captured a suspense effect. Re-render the boundary.

          if (enableProfilerTimer && (workInProgress.mode & ProfileMode) !== NoMode) {
            transferActualDuration(workInProgress);
          }

          return workInProgress;
        }

        return null;
      }

    case CacheComponent:
      var cache = workInProgress.memoizedState.cache;
      popCacheProvider(workInProgress, cache);
      return null;

    case TracingMarkerComponent:
      if (enableTransitionTracing) {
        if (workInProgress.stateNode !== null) {
          popMarkerInstance(workInProgress);
        }
      }

      return null;

    default:
      return null;
  }
}

function unwindInterruptedWork(current, interruptedWork, renderLanes) {
  // Note: This intentionally doesn't check if we're hydrating because comparing
  // to the current tree provider fiber is just as fast and less error-prone.
  // Ideally we would have a special version of the work loop only
  // for hydration.
  popTreeContext(interruptedWork);

  switch (interruptedWork.tag) {
    case ClassComponent:
      {
        var childContextTypes = interruptedWork.type.childContextTypes;

        if (childContextTypes !== null && childContextTypes !== undefined) {
          popLegacyContext(interruptedWork);
        }

        break;
      }

    case HostRoot:
      {
        var root = interruptedWork.stateNode;
        var _cache2 = interruptedWork.memoizedState.cache;
        popCacheProvider(interruptedWork, _cache2);

        if (enableTransitionTracing) {
          popRootMarkerInstance(interruptedWork);
        }

        popRootTransition(interruptedWork, root, renderLanes);
        popHostContainer(interruptedWork);
        popTopLevelLegacyContextObject(interruptedWork);
        break;
      }

    case HostHoistable:
    case HostSingleton:
    case HostComponent:
      {
        popHostContext(interruptedWork);
        break;
      }

    case HostPortal:
      popHostContainer(interruptedWork);
      break;

    case ActivityComponent:
      {
        if (interruptedWork.memoizedState !== null) {
          popSuspenseHandler(interruptedWork);
        }

        break;
      }

    case SuspenseComponent:
      popSuspenseHandler(interruptedWork);
      break;

    case SuspenseListComponent:
      popSuspenseListContext(interruptedWork);
      break;

    case ContextProvider:
      var context;

      if (enableRenderableContext) {
        context = interruptedWork.type;
      } else {
        context = interruptedWork.type._context;
      }

      popProvider(context, interruptedWork);
      break;

    case OffscreenComponent:
    case LegacyHiddenComponent:
      popSuspenseHandler(interruptedWork);
      popHiddenContext(interruptedWork);
      popTransition(interruptedWork, current);
      break;

    case CacheComponent:
      var cache = interruptedWork.memoizedState.cache;
      popCacheProvider(interruptedWork, cache);
      break;

    case TracingMarkerComponent:
      if (enableTransitionTracing) {
        var instance = interruptedWork.stateNode;

        if (instance !== null) {
          popMarkerInstance(interruptedWork);
        }
      }

      break;

    default:
      break;
  }
}

export { unwindWork, unwindInterruptedWork };