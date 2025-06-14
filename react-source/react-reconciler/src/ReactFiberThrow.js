/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import { ClassComponent, HostRoot, IncompleteClassComponent, IncompleteFunctionComponent, FunctionComponent, ForwardRef, SimpleMemoComponent, ActivityComponent, SuspenseComponent, OffscreenComponent } from './ReactWorkTags';
import { DidCapture, Incomplete, NoFlags, ShouldCapture, LifecycleEffectMask, ForceUpdateForLegacySuspense, ForceClientRender, ScheduleRetry } from './ReactFiberFlags';
import { NoMode, ConcurrentMode } from './ReactTypeOfMode';
import { enableUpdaterTracking, enablePostpone, disableLegacyMode } from 'shared/ReactFeatureFlags';
import { createCapturedValueAtFiber } from './ReactCapturedValue';
import { enqueueCapturedUpdate, createUpdate, CaptureUpdate, ForceUpdate, enqueueUpdate } from './ReactFiberClassUpdateQueue';
import { markFailedErrorBoundaryForHotReloading } from './ReactFiberHotReloading';
import { getShellBoundary, getSuspenseHandler } from './ReactFiberSuspenseContext';
import { renderDidError, queueConcurrentError, renderDidSuspendDelayIfPossible, markLegacyErrorBoundaryAsFailed, isAlreadyFailedLegacyErrorBoundary, attachPingListener, restorePendingUpdaters, renderDidSuspend } from './ReactFiberWorkLoop';
import { propagateParentContextChangesToDeferredTree } from './ReactFiberNewContext';
import { logUncaughtError, logCaughtError } from './ReactFiberErrorLogger';
import { isDevToolsPresent } from './ReactFiberDevToolsHook';
import { SyncLane, includesSomeLane, mergeLanes, pickArbitraryLane } from './ReactFiberLane';
import { getIsHydrating, markDidThrowWhileHydratingDEV, queueHydrationError, HydrationMismatchException } from './ReactFiberHydrationContext';
import { ConcurrentRoot } from './ReactRootTags';
import { noopSuspenseyCommitThenable } from './ReactFiberThenable';
import { REACT_POSTPONE_TYPE } from 'shared/ReactSymbols';
import { runWithFiberInDEV } from './ReactCurrentFiber';
import { callComponentDidCatchInDEV } from './ReactFiberCallUserSpace';

function createRootErrorUpdate(root, errorInfo, lane) {
  var update = createUpdate(lane); // Unmount the root by rendering null.

  update.tag = CaptureUpdate; // Caution: React DevTools currently depends on this property
  // being called "element".

  update.payload = {
    element: null
  };

  update.callback = function () {
    if (__DEV__) {
      runWithFiberInDEV(errorInfo.source, logUncaughtError, root, errorInfo);
    } else {
      logUncaughtError(root, errorInfo);
    }
  };

  return update;
}

function createClassErrorUpdate(lane) {
  var update = createUpdate(lane);
  update.tag = CaptureUpdate;
  return update;
}

function initializeClassErrorUpdate(update, root, fiber, errorInfo) {
  var getDerivedStateFromError = fiber.type.getDerivedStateFromError;

  if (typeof getDerivedStateFromError === 'function') {
    var error = errorInfo.value;

    update.payload = function () {
      return getDerivedStateFromError(error);
    };

    update.callback = function () {
      if (__DEV__) {
        markFailedErrorBoundaryForHotReloading(fiber);
      }

      if (__DEV__) {
        runWithFiberInDEV(errorInfo.source, logCaughtError, root, fiber, errorInfo);
      } else {
        logCaughtError(root, fiber, errorInfo);
      }
    };
  }

  var inst = fiber.stateNode;

  if (inst !== null && typeof inst.componentDidCatch === 'function') {
    // $FlowFixMe[missing-this-annot]
    update.callback = function callback() {
      if (__DEV__) {
        markFailedErrorBoundaryForHotReloading(fiber);
      }

      if (__DEV__) {
        runWithFiberInDEV(errorInfo.source, logCaughtError, root, fiber, errorInfo);
      } else {
        logCaughtError(root, fiber, errorInfo);
      }

      if (typeof getDerivedStateFromError !== 'function') {
        // To preserve the preexisting retry behavior of error boundaries,
        // we keep track of which ones already failed during this batch.
        // This gets reset before we yield back to the browser.
        // TODO: Warn in strict mode if getDerivedStateFromError is
        // not defined.
        markLegacyErrorBoundaryAsFailed(this);
      }

      if (__DEV__) {
        callComponentDidCatchInDEV(this, errorInfo);
      } else {
        var _error = errorInfo.value;
        var stack = errorInfo.stack;
        this.componentDidCatch(_error, {
          componentStack: stack !== null ? stack : ''
        });
      }

      if (__DEV__) {
        if (typeof getDerivedStateFromError !== 'function') {
          // If componentDidCatch is the only error boundary method defined,
          // then it needs to call setState to recover from errors.
          // If no state update is scheduled then the boundary will swallow the error.
          if (!includesSomeLane(fiber.lanes, SyncLane)) {
            console.error('%s: Error boundaries should implement getDerivedStateFromError(). ' + 'In that method, return a state update to display an error message or fallback UI.', getComponentNameFromFiber(fiber) || 'Unknown');
          }
        }
      }
    };
  }
}

function resetSuspendedComponent(sourceFiber, rootRenderLanes) {
  var currentSourceFiber = sourceFiber.alternate;

  if (currentSourceFiber !== null) {
    // Since we never visited the children of the suspended component, we
    // need to propagate the context change now, to ensure that we visit
    // them during the retry.
    //
    // We don't have to do this for errors because we retry errors without
    // committing in between. So this is specific to Suspense.
    propagateParentContextChangesToDeferredTree(currentSourceFiber, sourceFiber, rootRenderLanes);
  } // Reset the memoizedState to what it was before we attempted to render it.
  // A legacy mode Suspense quirk, only relevant to hook components.


  var tag = sourceFiber.tag;

  if (!disableLegacyMode && (sourceFiber.mode & ConcurrentMode) === NoMode && (tag === FunctionComponent || tag === ForwardRef || tag === SimpleMemoComponent)) {
    var currentSource = sourceFiber.alternate;

    if (currentSource) {
      sourceFiber.updateQueue = currentSource.updateQueue;
      sourceFiber.memoizedState = currentSource.memoizedState;
      sourceFiber.lanes = currentSource.lanes;
    } else {
      sourceFiber.updateQueue = null;
      sourceFiber.memoizedState = null;
    }
  }
}

function markSuspenseBoundaryShouldCapture(suspenseBoundary, returnFiber, sourceFiber, root, rootRenderLanes) {
  // This marks a Suspense boundary so that when we're unwinding the stack,
  // it captures the suspended "exception" and does a second (fallback) pass.
  if (!disableLegacyMode && (suspenseBoundary.mode & ConcurrentMode) === NoMode) {
    // Legacy Mode Suspense
    //
    // If the boundary is in legacy mode, we should *not*
    // suspend the commit. Pretend as if the suspended component rendered
    // null and keep rendering. When the Suspense boundary completes,
    // we'll do a second pass to render the fallback.
    if (suspenseBoundary === returnFiber) {
      // Special case where we suspended while reconciling the children of
      // a Suspense boundary's inner Offscreen wrapper fiber. This happens
      // when a React.lazy component is a direct child of a
      // Suspense boundary.
      //
      // Suspense boundaries are implemented as multiple fibers, but they
      // are a single conceptual unit. The legacy mode behavior where we
      // pretend the suspended fiber committed as `null` won't work,
      // because in this case the "suspended" fiber is the inner
      // Offscreen wrapper.
      //
      // Because the contents of the boundary haven't started rendering
      // yet (i.e. nothing in the tree has partially rendered) we can
      // switch to the regular, concurrent mode behavior: mark the
      // boundary with ShouldCapture and enter the unwind phase.
      suspenseBoundary.flags |= ShouldCapture;
    } else {
      suspenseBoundary.flags |= DidCapture;
      sourceFiber.flags |= ForceUpdateForLegacySuspense; // We're going to commit this fiber even though it didn't complete.
      // But we shouldn't call any lifecycle methods or callbacks. Remove
      // all lifecycle effect tags.

      sourceFiber.flags &= ~(LifecycleEffectMask | Incomplete);

      if (sourceFiber.tag === ClassComponent) {
        var currentSourceFiber = sourceFiber.alternate;

        if (currentSourceFiber === null) {
          // This is a new mount. Change the tag so it's not mistaken for a
          // completed class component. For example, we should not call
          // componentWillUnmount if it is deleted.
          sourceFiber.tag = IncompleteClassComponent;
        } else {
          // When we try rendering again, we should not reuse the current fiber,
          // since it's known to be in an inconsistent state. Use a force update to
          // prevent a bail out.
          var update = createUpdate(SyncLane);
          update.tag = ForceUpdate;
          enqueueUpdate(sourceFiber, update, SyncLane);
        }
      } else if (sourceFiber.tag === FunctionComponent) {
        var _currentSourceFiber = sourceFiber.alternate;

        if (_currentSourceFiber === null) {
          // This is a new mount. Change the tag so it's not mistaken for a
          // completed function component.
          sourceFiber.tag = IncompleteFunctionComponent;
        }
      } // The source fiber did not complete. Mark it with Sync priority to
      // indicate that it still has pending work.


      sourceFiber.lanes = mergeLanes(sourceFiber.lanes, SyncLane);
    }

    return suspenseBoundary;
  } // Confirmed that the boundary is in a concurrent mode tree. Continue
  // with the normal suspend path.
  //
  // After this we'll use a set of heuristics to determine whether this
  // render pass will run to completion or restart or "suspend" the commit.
  // The actual logic for this is spread out in different places.
  //
  // This first principle is that if we're going to suspend when we complete
  // a root, then we should also restart if we get an update or ping that
  // might unsuspend it, and vice versa. The only reason to suspend is
  // because you think you might want to restart before committing. However,
  // it doesn't make sense to restart only while in the period we're suspended.
  //
  // Restarting too aggressively is also not good because it starves out any
  // intermediate loading state. So we use heuristics to determine when.
  // Suspense Heuristics
  //
  // If nothing threw a Promise or all the same fallbacks are already showing,
  // then don't suspend/restart.
  //
  // If this is an initial render of a new tree of Suspense boundaries and
  // those trigger a fallback, then don't suspend/restart. We want to ensure
  // that we can show the initial loading state as quickly as possible.
  //
  // If we hit a "Delayed" case, such as when we'd switch from content back into
  // a fallback, then we should always suspend/restart. Transitions apply
  // to this case. If none is defined, JND is used instead.
  //
  // If we're already showing a fallback and it gets "retried", allowing us to show
  // another level, but there's still an inner boundary that would show a fallback,
  // then we suspend/restart for 500ms since the last time we showed a fallback
  // anywhere in the tree. This effectively throttles progressive loading into a
  // consistent train of commits. This also gives us an opportunity to restart to
  // get to the completed state slightly earlier.
  //
  // If there's ambiguity due to batching it's resolved in preference of:
  // 1) "delayed", 2) "initial render", 3) "retry".
  //
  // We want to ensure that a "busy" state doesn't get force committed. We want to
  // ensure that new initial loading states can commit as soon as possible.


  suspenseBoundary.flags |= ShouldCapture; // TODO: I think we can remove this, since we now use `DidCapture` in
  // the begin phase to prevent an early bailout.

  suspenseBoundary.lanes = rootRenderLanes;
  return suspenseBoundary;
}

function throwException(root, returnFiber, sourceFiber, value, rootRenderLanes) {
  // The source fiber did not complete.
  sourceFiber.flags |= Incomplete;

  if (enableUpdaterTracking) {
    if (isDevToolsPresent) {
      // If we have pending work still, restore the original updaters
      restorePendingUpdaters(root, rootRenderLanes);
    }
  }

  if (value !== null && typeof value === 'object') {
    if (enablePostpone && value.$$typeof === REACT_POSTPONE_TYPE) {
      // Act as if this is an infinitely suspending promise.
      value = {
        then: function () {}
      };
    }

    if (typeof value.then === 'function') {
      // This is a wakeable. The component suspended.
      var wakeable = value;
      resetSuspendedComponent(sourceFiber, rootRenderLanes);

      if (__DEV__) {
        if (getIsHydrating() && (disableLegacyMode || sourceFiber.mode & ConcurrentMode)) {
          markDidThrowWhileHydratingDEV();
        }
      } // Mark the nearest Suspense boundary to switch to rendering a fallback.


      var suspenseBoundary = getSuspenseHandler();

      if (suspenseBoundary !== null) {
        switch (suspenseBoundary.tag) {
          case ActivityComponent:
          case SuspenseComponent:
            {
              // If this suspense/activity boundary is not already showing a fallback, mark
              // the in-progress render as suspended. We try to perform this logic
              // as soon as soon as possible during the render phase, so the work
              // loop can know things like whether it's OK to switch to other tasks,
              // or whether it can wait for data to resolve before continuing.
              // TODO: Most of these checks are already performed when entering a
              // Suspense boundary. We should track the information on the stack so
              // we don't have to recompute it on demand. This would also allow us
              // to unify with `use` which needs to perform this logic even sooner,
              // before `throwException` is called.
              if (disableLegacyMode || sourceFiber.mode & ConcurrentMode) {
                if (getShellBoundary() === null) {
                  // Suspended in the "shell" of the app. This is an undesirable
                  // loading state. We should avoid committing this tree.
                  renderDidSuspendDelayIfPossible();
                } else {
                  // If we suspended deeper than the shell, we don't need to delay
                  // the commmit. However, we still call renderDidSuspend if this is
                  // a new boundary, to tell the work loop that a new fallback has
                  // appeared during this render.
                  // TODO: Theoretically we should be able to delete this branch.
                  // It's currently used for two things: 1) to throttle the
                  // appearance of successive loading states, and 2) in
                  // SuspenseList, to determine whether the children include any
                  // pending fallbacks. For 1, we should apply throttling to all
                  // retries, not just ones that render an additional fallback. For
                  // 2, we should check subtreeFlags instead. Then we can delete
                  // this branch.
                  var current = suspenseBoundary.alternate;

                  if (current === null) {
                    renderDidSuspend();
                  }
                }
              }

              suspenseBoundary.flags &= ~ForceClientRender;
              markSuspenseBoundaryShouldCapture(suspenseBoundary, returnFiber, sourceFiber, root, rootRenderLanes); // Retry listener
              //
              // If the fallback does commit, we need to attach a different type of
              // listener. This one schedules an update on the Suspense boundary to
              // turn the fallback state off.
              //
              // Stash the wakeable on the boundary fiber so we can access it in the
              // commit phase.
              //
              // When the wakeable resolves, we'll attempt to render the boundary
              // again ("retry").
              // Check if this is a Suspensey resource. We do not attach retry
              // listeners to these, because we don't actually need them for
              // rendering. Only for committing. Instead, if a fallback commits
              // and the only thing that suspended was a Suspensey resource, we
              // retry immediately.
              // TODO: Refactor throwException so that we don't have to do this type
              // check. The caller already knows what the cause was.

              var isSuspenseyResource = wakeable === noopSuspenseyCommitThenable;

              if (isSuspenseyResource) {
                suspenseBoundary.flags |= ScheduleRetry;
              } else {
                var retryQueue = suspenseBoundary.updateQueue;

                if (retryQueue === null) {
                  suspenseBoundary.updateQueue = new Set([wakeable]);
                } else {
                  retryQueue.add(wakeable);
                } // We only attach ping listeners in concurrent mode. Legacy
                // Suspense always commits fallbacks synchronously, so there are
                // no pings.


                if (disableLegacyMode || suspenseBoundary.mode & ConcurrentMode) {
                  attachPingListener(root, wakeable, rootRenderLanes);
                }
              }

              return false;
            }

          case OffscreenComponent:
            {
              if (disableLegacyMode || suspenseBoundary.mode & ConcurrentMode) {
                suspenseBoundary.flags |= ShouldCapture;

                var _isSuspenseyResource = wakeable === noopSuspenseyCommitThenable;

                if (_isSuspenseyResource) {
                  suspenseBoundary.flags |= ScheduleRetry;
                } else {
                  var offscreenQueue = suspenseBoundary.updateQueue;

                  if (offscreenQueue === null) {
                    var newOffscreenQueue = {
                      transitions: null,
                      markerInstances: null,
                      retryQueue: new Set([wakeable])
                    };
                    suspenseBoundary.updateQueue = newOffscreenQueue;
                  } else {
                    var _retryQueue = offscreenQueue.retryQueue;

                    if (_retryQueue === null) {
                      offscreenQueue.retryQueue = new Set([wakeable]);
                    } else {
                      _retryQueue.add(wakeable);
                    }
                  }

                  attachPingListener(root, wakeable, rootRenderLanes);
                }

                return false;
              }
            }
        }

        throw new Error("Unexpected Suspense handler tag (" + suspenseBoundary.tag + "). This " + 'is a bug in React.');
      } else {
        // No boundary was found. Unless this is a sync update, this is OK.
        // We can suspend and wait for more data to arrive.
        if (disableLegacyMode || root.tag === ConcurrentRoot) {
          // In a concurrent root, suspending without a Suspense boundary is
          // allowed. It will suspend indefinitely without committing.
          //
          // TODO: Should we have different behavior for discrete updates? What
          // about flushSync? Maybe it should put the tree into an inert state,
          // and potentially log a warning. Revisit this for a future release.
          attachPingListener(root, wakeable, rootRenderLanes);
          renderDidSuspendDelayIfPossible();
          return false;
        } else {
          // In a legacy root, suspending without a boundary is always an error.
          var uncaughtSuspenseError = new Error('A component suspended while responding to synchronous input. This ' + 'will cause the UI to be replaced with a loading indicator. To ' + 'fix, updates that suspend should be wrapped ' + 'with startTransition.');
          value = uncaughtSuspenseError;
        }
      }
    }
  } // This is a regular error, not a Suspense wakeable.


  if (getIsHydrating() && (disableLegacyMode || sourceFiber.mode & ConcurrentMode)) {
    markDidThrowWhileHydratingDEV();
    var hydrationBoundary = getSuspenseHandler(); // If the error was thrown during hydration, we may be able to recover by
    // discarding the dehydrated content and switching to a client render.
    // Instead of surfacing the error, find the nearest Suspense boundary
    // and render it again without hydration.

    if (hydrationBoundary !== null) {
      if ((hydrationBoundary.flags & ShouldCapture) === NoFlags) {
        // Set a flag to indicate that we should try rendering the normal
        // children again, not the fallback.
        hydrationBoundary.flags |= ForceClientRender;
      }

      markSuspenseBoundaryShouldCapture(hydrationBoundary, returnFiber, sourceFiber, root, rootRenderLanes); // Even though the user may not be affected by this error, we should
      // still log it so it can be fixed.

      if (value !== HydrationMismatchException) {
        var _wrapperError = new Error('There was an error while hydrating but React was able to recover by ' + 'instead client rendering from the nearest Suspense boundary.', {
          cause: value
        });

        queueHydrationError(createCapturedValueAtFiber(_wrapperError, sourceFiber));
      }

      return false;
    } else {
      if (value !== HydrationMismatchException) {
        var _wrapperError2 = new Error('There was an error while hydrating but React was able to recover by ' + 'instead client rendering the entire root.', {
          cause: value
        });

        queueHydrationError(createCapturedValueAtFiber(_wrapperError2, sourceFiber));
      }

      var _workInProgress = root.current.alternate; // Schedule an update at the root to log the error but this shouldn't
      // actually happen because we should recover.

      _workInProgress.flags |= ShouldCapture;
      var lane = pickArbitraryLane(rootRenderLanes);
      _workInProgress.lanes = mergeLanes(_workInProgress.lanes, lane);
      var rootErrorInfo = createCapturedValueAtFiber(value, sourceFiber);
      var update = createRootErrorUpdate(_workInProgress.stateNode, rootErrorInfo, // This should never actually get logged due to the recovery.
      lane);
      enqueueCapturedUpdate(_workInProgress, update);
      renderDidError();
      return false;
    }
  } else {// Otherwise, fall through to the error path.
  }

  var wrapperError = new Error('There was an error during concurrent rendering but React was able to recover by ' + 'instead synchronously rendering the entire root.', {
    cause: value
  });
  queueConcurrentError(createCapturedValueAtFiber(wrapperError, sourceFiber));
  renderDidError(); // We didn't find a boundary that could handle this type of exception. Start
  // over and traverse parent path again, this time treating the exception
  // as an error.

  if (returnFiber === null) {
    // There's no return fiber, which means the root errored. This should never
    // happen. Return `true` to trigger a fatal error (panic).
    return true;
  }

  var errorInfo = createCapturedValueAtFiber(value, sourceFiber);
  var workInProgress = returnFiber;

  do {
    switch (workInProgress.tag) {
      case HostRoot:
        {
          workInProgress.flags |= ShouldCapture;

          var _lane = pickArbitraryLane(rootRenderLanes);

          workInProgress.lanes = mergeLanes(workInProgress.lanes, _lane);

          var _update = createRootErrorUpdate(workInProgress.stateNode, errorInfo, _lane);

          enqueueCapturedUpdate(workInProgress, _update);
          return false;
        }

      case ClassComponent:
        // Capture and retry
        var ctor = workInProgress.type;
        var instance = workInProgress.stateNode;

        if ((workInProgress.flags & DidCapture) === NoFlags && (typeof ctor.getDerivedStateFromError === 'function' || instance !== null && typeof instance.componentDidCatch === 'function' && !isAlreadyFailedLegacyErrorBoundary(instance))) {
          workInProgress.flags |= ShouldCapture;

          var _lane2 = pickArbitraryLane(rootRenderLanes);

          workInProgress.lanes = mergeLanes(workInProgress.lanes, _lane2); // Schedule the error boundary to re-render using updated state

          var _update2 = createClassErrorUpdate(_lane2);

          initializeClassErrorUpdate(_update2, root, workInProgress, errorInfo);
          enqueueCapturedUpdate(workInProgress, _update2);
          return false;
        }

        break;

      default:
        break;
    } // $FlowFixMe[incompatible-type] we bail out when we get a null


    workInProgress = workInProgress.return;
  } while (workInProgress !== null);

  return false;
}

export { throwException, createRootErrorUpdate, createClassErrorUpdate, initializeClassErrorUpdate };