/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { enableLegacyHidden, enableSuspenseCallback, enableScopeAPI, enablePersistedModeClonedFlag, enableProfilerTimer, enableTransitionTracing, enableRenderableContext, passChildrenWhenCloningPersistedNodes, disableLegacyMode, enableViewTransition, enableSuspenseyImages } from 'shared/ReactFeatureFlags';
import { now } from './Scheduler';
import { FunctionComponent, ClassComponent, HostRoot, HostComponent, HostHoistable, HostSingleton, HostText, HostPortal, ContextProvider, ContextConsumer, ForwardRef, Fragment, Mode, Profiler, SuspenseComponent, SuspenseListComponent, MemoComponent, SimpleMemoComponent, LazyComponent, IncompleteClassComponent, IncompleteFunctionComponent, ScopeComponent, OffscreenComponent, LegacyHiddenComponent, CacheComponent, TracingMarkerComponent, Throw, ViewTransitionComponent, ActivityComponent } from './ReactWorkTags';
import { NoMode, ConcurrentMode, ProfileMode, SuspenseyImagesMode } from './ReactTypeOfMode';
import { Placement, Update, Visibility, NoFlags, DidCapture, Snapshot, ChildDeletion, StaticMask, MutationMask, Passive, ForceClientRender, MaySuspendCommit, ScheduleRetry, ShouldSuspendCommit, Cloned, ViewTransitionStatic, Hydrate } from './ReactFiberFlags';
import { createInstance, createTextInstance, resolveSingletonInstance, appendInitialChild, finalizeInitialChildren, finalizeHydratedChildren, supportsMutation, supportsPersistence, supportsResources, supportsSingletons, cloneInstance, cloneHiddenInstance, cloneHiddenTextInstance, createContainerChildSet, appendChildToContainerChildSet, finalizeContainerChildren, preparePortalMount, prepareScopeUpdate, maySuspendCommit, maySuspendCommitOnUpdate, maySuspendCommitInSyncRender, mayResourceSuspendCommit, preloadInstance, preloadResource } from './ReactFiberConfig';
import { getRootHostContainer, popHostContext, getHostContext, popHostContainer } from './ReactFiberHostContext';
import { suspenseStackCursor, popSuspenseListContext, popSuspenseHandler, pushSuspenseListContext, setShallowSuspenseListContext, ForceSuspenseFallback, setDefaultShallowSuspenseListContext } from './ReactFiberSuspenseContext';
import { popHiddenContext } from './ReactFiberHiddenContext';
import { findFirstSuspended } from './ReactFiberSuspenseComponent';
import { isContextProvider as isLegacyContextProvider, popContext as popLegacyContext, popTopLevelContextObject as popTopLevelLegacyContextObject } from './ReactFiberContext';
import { popProvider } from './ReactFiberNewContext';
import { prepareToHydrateHostInstance, prepareToHydrateHostTextInstance, prepareToHydrateHostActivityInstance, prepareToHydrateHostSuspenseInstance, popHydrationState, resetHydrationState, getIsHydrating, upgradeHydrationErrorsToRecoverable, emitPendingHydrationWarnings } from './ReactFiberHydrationContext';
import { renderHasNotSuspendedYet, getRenderTargetTime, getWorkInProgressTransitions, shouldRemainOnPreviousScreen, markSpawnedRetryLane } from './ReactFiberWorkLoop';
import { OffscreenLane, SomeRetryLane, NoLanes, includesSomeLane, mergeLanes, claimNextRetryLane, includesOnlySuspenseyCommitEligibleLanes } from './ReactFiberLane';
import { resetChildFibers } from './ReactChildFiber';
import { createScopeInstance } from './ReactFiberScope';
import { transferActualDuration } from './ReactProfilerTimer';
import { popCacheProvider } from './ReactFiberCacheComponent';
import { popTreeContext } from './ReactFiberTreeContext';
import { popRootTransition, popTransition } from './ReactFiberTransition';
import { popMarkerInstance, popRootMarkerInstance } from './ReactFiberTracingMarkerComponent';
import { suspendCommit } from './ReactFiberThenable';
/**
 * Tag the fiber with an update effect. This turns a Placement into
 * a PlacementAndUpdate.
 */

function markUpdate(workInProgress) {
  workInProgress.flags |= Update;
}
/**
 * Tag the fiber with Cloned in persistent mode to signal that
 * it received an update that requires a clone of the tree above.
 */


function markCloned(workInProgress) {
  if (supportsPersistence && enablePersistedModeClonedFlag) {
    workInProgress.flags |= Cloned;
  }
}
/**
 * In persistent mode, return whether this update needs to clone the subtree.
 */


function doesRequireClone(current, completedWork) {
  var didBailout = current !== null && current.child === completedWork.child;

  if (didBailout) {
    return false;
  }

  if ((completedWork.flags & ChildDeletion) !== NoFlags) {
    return true;
  } // TODO: If we move the `doesRequireClone` call after `bubbleProperties`
  // then we only have to check the `completedWork.subtreeFlags`.


  var child = completedWork.child;

  while (child !== null) {
    var checkedFlags = enablePersistedModeClonedFlag ? Cloned | Visibility | Placement | ChildDeletion : MutationMask;

    if ((child.flags & checkedFlags) !== NoFlags || (child.subtreeFlags & checkedFlags) !== NoFlags) {
      return true;
    }

    child = child.sibling;
  }

  return false;
}

function appendAllChildren(parent, workInProgress, needsVisibilityToggle, isHidden) {
  if (supportsMutation) {
    // We only have the top Fiber that was created but we need recurse down its
    // children to find all the terminal nodes.
    var node = workInProgress.child;

    while (node !== null) {
      if (node.tag === HostComponent || node.tag === HostText) {
        appendInitialChild(parent, node.stateNode);
      } else if (node.tag === HostPortal || (supportsSingletons ? node.tag === HostSingleton : false)) {// If we have a portal child, then we don't want to traverse
        // down its children. Instead, we'll get insertions from each child in
        // the portal directly.
        // If we have a HostSingleton it will be placed independently
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }

      if (node === workInProgress) {
        return;
      } // $FlowFixMe[incompatible-use] found when upgrading Flow


      while (node.sibling === null) {
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        if (node.return === null || node.return === workInProgress) {
          return;
        }

        node = node.return;
      } // $FlowFixMe[incompatible-use] found when upgrading Flow


      node.sibling.return = node.return;
      node = node.sibling;
    }
  } else if (supportsPersistence) {
    // We only have the top Fiber that was created but we need recurse down its
    // children to find all the terminal nodes.
    var _node = workInProgress.child;

    while (_node !== null) {
      if (_node.tag === HostComponent) {
        var instance = _node.stateNode;

        if (needsVisibilityToggle && isHidden) {
          // This child is inside a timed out tree. Hide it.
          var props = _node.memoizedProps;
          var type = _node.type;
          instance = cloneHiddenInstance(instance, type, props);
        }

        appendInitialChild(parent, instance);
      } else if (_node.tag === HostText) {
        var _instance = _node.stateNode;

        if (needsVisibilityToggle && isHidden) {
          // This child is inside a timed out tree. Hide it.
          var text = _node.memoizedProps;
          _instance = cloneHiddenTextInstance(_instance, text);
        }

        appendInitialChild(parent, _instance);
      } else if (_node.tag === HostPortal) {// If we have a portal child, then we don't want to traverse
        // down its children. Instead, we'll get insertions from each child in
        // the portal directly.
      } else if (_node.tag === OffscreenComponent && _node.memoizedState !== null) {
        // The children in this boundary are hidden. Toggle their visibility
        // before appending.
        var child = _node.child;

        if (child !== null) {
          child.return = _node;
        }

        appendAllChildren(parent, _node,
        /* needsVisibilityToggle */
        true,
        /* isHidden */
        true);
      } else if (_node.child !== null) {
        _node.child.return = _node;
        _node = _node.child;
        continue;
      }

      if (_node === workInProgress) {
        return;
      } // $FlowFixMe[incompatible-use] found when upgrading Flow


      while (_node.sibling === null) {
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        if (_node.return === null || _node.return === workInProgress) {
          return;
        }

        _node = _node.return;
      } // $FlowFixMe[incompatible-use] found when upgrading Flow


      _node.sibling.return = _node.return;
      _node = _node.sibling;
    }
  }
} // An unfortunate fork of appendAllChildren because we have two different parent types.


function appendAllChildrenToContainer(containerChildSet, workInProgress, needsVisibilityToggle, isHidden) {
  // Host components that have their visibility toggled by an OffscreenComponent
  // do not support passChildrenWhenCloningPersistedNodes. To inform the callee
  // about their presence, we track and return if they were added to the
  // child set.
  var hasOffscreenComponentChild = false;

  if (supportsPersistence) {
    // We only have the top Fiber that was created but we need recurse down its
    // children to find all the terminal nodes.
    var node = workInProgress.child;

    while (node !== null) {
      if (node.tag === HostComponent) {
        var instance = node.stateNode;

        if (needsVisibilityToggle && isHidden) {
          // This child is inside a timed out tree. Hide it.
          var props = node.memoizedProps;
          var type = node.type;
          instance = cloneHiddenInstance(instance, type, props);
        }

        appendChildToContainerChildSet(containerChildSet, instance);
      } else if (node.tag === HostText) {
        var _instance2 = node.stateNode;

        if (needsVisibilityToggle && isHidden) {
          // This child is inside a timed out tree. Hide it.
          var text = node.memoizedProps;
          _instance2 = cloneHiddenTextInstance(_instance2, text);
        }

        appendChildToContainerChildSet(containerChildSet, _instance2);
      } else if (node.tag === HostPortal) {// If we have a portal child, then we don't want to traverse
        // down its children. Instead, we'll get insertions from each child in
        // the portal directly.
      } else if (node.tag === OffscreenComponent && node.memoizedState !== null) {
        // The children in this boundary are hidden. Toggle their visibility
        // before appending.
        var child = node.child;

        if (child !== null) {
          child.return = node;
        }

        appendAllChildrenToContainer(containerChildSet, node,
        /* needsVisibilityToggle */
        true,
        /* isHidden */
        true);
        hasOffscreenComponentChild = true;
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }

      node = node;

      if (node === workInProgress) {
        return hasOffscreenComponentChild;
      } // $FlowFixMe[incompatible-use] found when upgrading Flow


      while (node.sibling === null) {
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        if (node.return === null || node.return === workInProgress) {
          return hasOffscreenComponentChild;
        }

        node = node.return;
      } // $FlowFixMe[incompatible-use] found when upgrading Flow


      node.sibling.return = node.return;
      node = node.sibling;
    }
  }

  return hasOffscreenComponentChild;
}

function updateHostContainer(current, workInProgress) {
  if (supportsPersistence) {
    if (doesRequireClone(current, workInProgress)) {
      var portalOrRoot = workInProgress.stateNode;
      var container = portalOrRoot.containerInfo;
      var newChildSet = createContainerChildSet(); // If children might have changed, we have to add them all to the set.

      appendAllChildrenToContainer(newChildSet, workInProgress,
      /* needsVisibilityToggle */
      false,
      /* isHidden */
      false);
      portalOrRoot.pendingChildren = newChildSet; // Schedule an update on the container to swap out the container.

      markUpdate(workInProgress);
      finalizeContainerChildren(container, newChildSet);
    }
  }
}

function updateHostComponent(current, workInProgress, type, newProps, renderLanes) {
  if (supportsMutation) {
    // If we have an alternate, that means this is an update and we need to
    // schedule a side-effect to do the updates.
    var oldProps = current.memoizedProps;

    if (oldProps === newProps) {
      // In mutation mode, this is sufficient for a bailout because
      // we won't touch this node even if children changed.
      return;
    }

    markUpdate(workInProgress);
  } else if (supportsPersistence) {
    var currentInstance = current.stateNode;
    var _oldProps = current.memoizedProps; // If there are no effects associated with this node, then none of our children had any updates.
    // This guarantees that we can reuse all of them.

    var requiresClone = doesRequireClone(current, workInProgress);

    if (!requiresClone && _oldProps === newProps) {
      // No changes, just reuse the existing instance.
      // Note that this might release a previous clone.
      workInProgress.stateNode = currentInstance;
      return;
    }

    var currentHostContext = getHostContext();
    var newChildSet = null;
    var hasOffscreenComponentChild = false;

    if (requiresClone && passChildrenWhenCloningPersistedNodes) {
      markCloned(workInProgress);
      newChildSet = createContainerChildSet(); // If children might have changed, we have to add them all to the set.

      hasOffscreenComponentChild = appendAllChildrenToContainer(newChildSet, workInProgress,
      /* needsVisibilityToggle */
      false,
      /* isHidden */
      false);
    }

    var newInstance = cloneInstance(currentInstance, type, _oldProps, newProps, !requiresClone, !hasOffscreenComponentChild ? newChildSet : undefined);

    if (newInstance === currentInstance) {
      // No changes, just reuse the existing instance.
      // Note that this might release a previous clone.
      workInProgress.stateNode = currentInstance;
      return;
    } else {
      markCloned(workInProgress);
    } // Certain renderers require commit-time effects for initial mount.
    // (eg DOM renderer supports auto-focus for certain elements).
    // Make sure such renderers get scheduled for later work.


    if (finalizeInitialChildren(newInstance, type, newProps, currentHostContext)) {
      markUpdate(workInProgress);
    }

    workInProgress.stateNode = newInstance;

    if (!requiresClone) {
      if (!enablePersistedModeClonedFlag) {
        // If there are no other effects in this tree, we need to flag this node as having one.
        // Even though we're not going to use it for anything.
        // Otherwise parents won't know that there are new children to propagate upwards.
        markUpdate(workInProgress);
      }
    } else if (!passChildrenWhenCloningPersistedNodes || hasOffscreenComponentChild) {
      // If children have changed, we have to add them all to the set.
      appendAllChildren(newInstance, workInProgress,
      /* needsVisibilityToggle */
      false,
      /* isHidden */
      false);
    }
  }
} // This function must be called at the very end of the complete phase, because
// it might throw to suspend, and if the resource immediately loads, the work
// loop will resume rendering as if the work-in-progress completed. So it must
// fully complete.
// TODO: This should ideally move to begin phase, but currently the instance is
// not created until the complete phase. For our existing use cases, host nodes
// that suspend don't have children, so it doesn't matter. But that might not
// always be true in the future.


function preloadInstanceAndSuspendIfNeeded(workInProgress, type, oldProps, newProps, renderLanes) {
  var maySuspend = (enableSuspenseyImages || (workInProgress.mode & SuspenseyImagesMode) !== NoMode) && (oldProps === null ? maySuspendCommit(type, newProps) : maySuspendCommitOnUpdate(type, oldProps, newProps));

  if (!maySuspend) {
    // If this flag was set previously, we can remove it. The flag
    // represents whether this particular set of props might ever need to
    // suspend. The safest thing to do is for maySuspendCommit to always
    // return true, but if the renderer is reasonably confident that the
    // underlying resource won't be evicted, it can return false as a
    // performance optimization.
    workInProgress.flags &= ~MaySuspendCommit;
    return;
  } // Mark this fiber with a flag. This gets set on all host instances
  // that might possibly suspend, even if they don't need to suspend
  // currently. We use this when revealing a prerendered tree, because
  // even though the tree has "mounted", its resources might not have
  // loaded yet.


  workInProgress.flags |= MaySuspendCommit;

  if (includesOnlySuspenseyCommitEligibleLanes(renderLanes) || maySuspendCommitInSyncRender(type, newProps)) {
    // preload the instance if necessary. Even if this is an urgent render there
    // could be benefits to preloading early.
    // @TODO we should probably do the preload in begin work
    var isReady = preloadInstance(workInProgress.stateNode, type, newProps);

    if (!isReady) {
      if (shouldRemainOnPreviousScreen()) {
        workInProgress.flags |= ShouldSuspendCommit;
      } else {
        suspendCommit();
      }
    } else {
      // Even if we're ready we suspend the commit and check again in the pre-commit
      // phase if we need to suspend anyway. Such as if it's delayed on decoding or
      // if it was dropped from the cache while rendering due to pressure.
      workInProgress.flags |= ShouldSuspendCommit;
    }
  }
}

function preloadResourceAndSuspendIfNeeded(workInProgress, resource, type, props, renderLanes) {
  // This is a fork of preloadInstanceAndSuspendIfNeeded, but for resources.
  if (!mayResourceSuspendCommit(resource)) {
    workInProgress.flags &= ~MaySuspendCommit;
    return;
  }

  workInProgress.flags |= MaySuspendCommit;
  var isReady = preloadResource(resource);

  if (!isReady) {
    if (shouldRemainOnPreviousScreen()) {
      workInProgress.flags |= ShouldSuspendCommit;
    } else {
      suspendCommit();
    }
  }
}

function scheduleRetryEffect(workInProgress, retryQueue) {
  var wakeables = retryQueue;

  if (wakeables !== null) {
    // Schedule an effect to attach a retry listener to the promise.
    // TODO: Move to passive phase
    workInProgress.flags |= Update;
  } // Check if we need to schedule an immediate retry. This should happen
  // whenever we unwind a suspended tree without fully rendering its siblings;
  // we need to begin the retry so we can start prerendering them.
  //
  // We also use this mechanism for Suspensey Resources (e.g. stylesheets),
  // because those don't actually block the render phase, only the commit phase.
  // So we can start rendering even before the resources are ready.


  if (workInProgress.flags & ScheduleRetry) {
    var retryLane = // TODO: This check should probably be moved into claimNextRetryLane
    // I also suspect that we need some further consolidation of offscreen
    // and retry lanes.
    workInProgress.tag !== OffscreenComponent ? claimNextRetryLane() : OffscreenLane;
    workInProgress.lanes = mergeLanes(workInProgress.lanes, retryLane); // Track the lanes that have been scheduled for an immediate retry so that
    // we can mark them as suspended upon committing the root.

    markSpawnedRetryLane(retryLane);
  }
}

function updateHostText(current, workInProgress, oldText, newText) {
  if (supportsMutation) {
    // If the text differs, mark it as an update. All the work in done in commitWork.
    if (oldText !== newText) {
      markUpdate(workInProgress);
    }
  } else if (supportsPersistence) {
    if (oldText !== newText) {
      // If the text content differs, we'll create a new text instance for it.
      var rootContainerInstance = getRootHostContainer();
      var currentHostContext = getHostContext();
      markCloned(workInProgress);
      workInProgress.stateNode = createTextInstance(newText, rootContainerInstance, currentHostContext, workInProgress);

      if (!enablePersistedModeClonedFlag) {
        // We'll have to mark it as having an effect, even though we won't use the effect for anything.
        // This lets the parents know that at least one of their children has changed.
        markUpdate(workInProgress);
      }
    } else {
      workInProgress.stateNode = current.stateNode;
    }
  }
}

function cutOffTailIfNeeded(renderState, hasRenderedATailFallback) {
  if (getIsHydrating()) {
    // If we're hydrating, we should consume as many items as we can
    // so we don't leave any behind.
    return;
  }

  switch (renderState.tailMode) {
    case 'hidden':
      {
        // Any insertions at the end of the tail list after this point
        // should be invisible. If there are already mounted boundaries
        // anything before them are not considered for collapsing.
        // Therefore we need to go through the whole tail to find if
        // there are any.
        var tailNode = renderState.tail;
        var lastTailNode = null;

        while (tailNode !== null) {
          if (tailNode.alternate !== null) {
            lastTailNode = tailNode;
          }

          tailNode = tailNode.sibling;
        } // Next we're simply going to delete all insertions after the
        // last rendered item.


        if (lastTailNode === null) {
          // All remaining items in the tail are insertions.
          renderState.tail = null;
        } else {
          // Detach the insertion after the last node that was already
          // inserted.
          lastTailNode.sibling = null;
        }

        break;
      }

    case 'collapsed':
      {
        // Any insertions at the end of the tail list after this point
        // should be invisible. If there are already mounted boundaries
        // anything before them are not considered for collapsing.
        // Therefore we need to go through the whole tail to find if
        // there are any.
        var _tailNode = renderState.tail;
        var _lastTailNode = null;

        while (_tailNode !== null) {
          if (_tailNode.alternate !== null) {
            _lastTailNode = _tailNode;
          }

          _tailNode = _tailNode.sibling;
        } // Next we're simply going to delete all insertions after the
        // last rendered item.


        if (_lastTailNode === null) {
          // All remaining items in the tail are insertions.
          if (!hasRenderedATailFallback && renderState.tail !== null) {
            // We suspended during the head. We want to show at least one
            // row at the tail. So we'll keep on and cut off the rest.
            renderState.tail.sibling = null;
          } else {
            renderState.tail = null;
          }
        } else {
          // Detach the insertion after the last node that was already
          // inserted.
          _lastTailNode.sibling = null;
        }

        break;
      }
  }
}

function bubbleProperties(completedWork) {
  var didBailout = completedWork.alternate !== null && completedWork.alternate.child === completedWork.child;
  var newChildLanes = NoLanes;
  var subtreeFlags = NoFlags;

  if (!didBailout) {
    // Bubble up the earliest expiration time.
    if (enableProfilerTimer && (completedWork.mode & ProfileMode) !== NoMode) {
      // In profiling mode, resetChildExpirationTime is also used to reset
      // profiler durations.
      var actualDuration = completedWork.actualDuration;
      var treeBaseDuration = completedWork.selfBaseDuration;
      var child = completedWork.child;

      while (child !== null) {
        newChildLanes = mergeLanes(newChildLanes, mergeLanes(child.lanes, child.childLanes));
        subtreeFlags |= child.subtreeFlags;
        subtreeFlags |= child.flags; // When a fiber is cloned, its actualDuration is reset to 0. This value will
        // only be updated if work is done on the fiber (i.e. it doesn't bailout).
        // When work is done, it should bubble to the parent's actualDuration. If
        // the fiber has not been cloned though, (meaning no work was done), then
        // this value will reflect the amount of time spent working on a previous
        // render. In that case it should not bubble. We determine whether it was
        // cloned by comparing the child pointer.
        // $FlowFixMe[unsafe-addition] addition with possible null/undefined value

        actualDuration += child.actualDuration; // $FlowFixMe[unsafe-addition] addition with possible null/undefined value

        treeBaseDuration += child.treeBaseDuration;
        child = child.sibling;
      }

      completedWork.actualDuration = actualDuration;
      completedWork.treeBaseDuration = treeBaseDuration;
    } else {
      var _child = completedWork.child;

      while (_child !== null) {
        newChildLanes = mergeLanes(newChildLanes, mergeLanes(_child.lanes, _child.childLanes));
        subtreeFlags |= _child.subtreeFlags;
        subtreeFlags |= _child.flags; // Update the return pointer so the tree is consistent. This is a code
        // smell because it assumes the commit phase is never concurrent with
        // the render phase. Will address during refactor to alternate model.

        _child.return = completedWork;
        _child = _child.sibling;
      }
    }

    completedWork.subtreeFlags |= subtreeFlags;
  } else {
    // Bubble up the earliest expiration time.
    if (enableProfilerTimer && (completedWork.mode & ProfileMode) !== NoMode) {
      // In profiling mode, resetChildExpirationTime is also used to reset
      // profiler durations.
      var _treeBaseDuration = completedWork.selfBaseDuration;
      var _child2 = completedWork.child;

      while (_child2 !== null) {
        newChildLanes = mergeLanes(newChildLanes, mergeLanes(_child2.lanes, _child2.childLanes)); // "Static" flags share the lifetime of the fiber/hook they belong to,
        // so we should bubble those up even during a bailout. All the other
        // flags have a lifetime only of a single render + commit, so we should
        // ignore them.

        subtreeFlags |= _child2.subtreeFlags & StaticMask;
        subtreeFlags |= _child2.flags & StaticMask; // $FlowFixMe[unsafe-addition] addition with possible null/undefined value

        _treeBaseDuration += _child2.treeBaseDuration;
        _child2 = _child2.sibling;
      }

      completedWork.treeBaseDuration = _treeBaseDuration;
    } else {
      var _child3 = completedWork.child;

      while (_child3 !== null) {
        newChildLanes = mergeLanes(newChildLanes, mergeLanes(_child3.lanes, _child3.childLanes)); // "Static" flags share the lifetime of the fiber/hook they belong to,
        // so we should bubble those up even during a bailout. All the other
        // flags have a lifetime only of a single render + commit, so we should
        // ignore them.

        subtreeFlags |= _child3.subtreeFlags & StaticMask;
        subtreeFlags |= _child3.flags & StaticMask; // Update the return pointer so the tree is consistent. This is a code
        // smell because it assumes the commit phase is never concurrent with
        // the render phase. Will address during refactor to alternate model.

        _child3.return = completedWork;
        _child3 = _child3.sibling;
      }
    }

    completedWork.subtreeFlags |= subtreeFlags;
  }

  completedWork.childLanes = newChildLanes;
  return didBailout;
}

function completeDehydratedActivityBoundary(current, workInProgress, nextState) {
  var wasHydrated = popHydrationState(workInProgress);

  if (nextState !== null) {
    // We might be inside a hydration state the first time we're picking up this
    // Activity boundary, and also after we've reentered it for further hydration.
    if (current === null) {
      if (!wasHydrated) {
        throw new Error('A dehydrated suspense component was completed without a hydrated node. ' + 'This is probably a bug in React.');
      }

      prepareToHydrateHostActivityInstance(workInProgress);
      bubbleProperties(workInProgress);

      if (enableProfilerTimer) {
        if ((workInProgress.mode & ProfileMode) !== NoMode) {
          var isTimedOutSuspense = nextState !== null;

          if (isTimedOutSuspense) {
            // Don't count time spent in a timed out Suspense subtree as part of the base duration.
            var primaryChildFragment = workInProgress.child;

            if (primaryChildFragment !== null) {
              // $FlowFixMe[unsafe-arithmetic] Flow doesn't support type casting in combination with the -= operator
              workInProgress.treeBaseDuration -= primaryChildFragment.treeBaseDuration;
            }
          }
        }
      }

      return false;
    } else {
      emitPendingHydrationWarnings(); // We might have reentered this boundary to hydrate it. If so, we need to reset the hydration
      // state since we're now exiting out of it. popHydrationState doesn't do that for us.

      resetHydrationState();

      if ((workInProgress.flags & DidCapture) === NoFlags) {
        // This boundary did not suspend so it's now hydrated and unsuspended.
        nextState = workInProgress.memoizedState = null;
      } // If nothing suspended, we need to schedule an effect to mark this boundary
      // as having hydrated so events know that they're free to be invoked.
      // It's also a signal to replay events and the suspense callback.
      // If something suspended, schedule an effect to attach retry listeners.
      // So we might as well always mark this.


      workInProgress.flags |= Update;
      bubbleProperties(workInProgress);

      if (enableProfilerTimer) {
        if ((workInProgress.mode & ProfileMode) !== NoMode) {
          var _isTimedOutSuspense = nextState !== null;

          if (_isTimedOutSuspense) {
            // Don't count time spent in a timed out Suspense subtree as part of the base duration.
            var _primaryChildFragment = workInProgress.child;

            if (_primaryChildFragment !== null) {
              // $FlowFixMe[unsafe-arithmetic] Flow doesn't support type casting in combination with the -= operator
              workInProgress.treeBaseDuration -= _primaryChildFragment.treeBaseDuration;
            }
          }
        }
      }

      return false;
    }
  } else {
    // Successfully completed this tree. If this was a forced client render,
    // there may have been recoverable errors during first hydration
    // attempt. If so, add them to a queue so we can log them in the
    // commit phase. We also add them to prev state so we can get to them
    // from the Suspense Boundary.
    var hydrationErrors = upgradeHydrationErrorsToRecoverable();

    if (current !== null && current.memoizedState !== null) {
      var prevState = current.memoizedState;
      prevState.hydrationErrors = hydrationErrors;
    } // Fall through to normal Offscreen path


    return true;
  }
}

function completeDehydratedSuspenseBoundary(current, workInProgress, nextState) {
  var wasHydrated = popHydrationState(workInProgress);

  if (nextState !== null && nextState.dehydrated !== null) {
    // We might be inside a hydration state the first time we're picking up this
    // Suspense boundary, and also after we've reentered it for further hydration.
    if (current === null) {
      if (!wasHydrated) {
        throw new Error('A dehydrated suspense component was completed without a hydrated node. ' + 'This is probably a bug in React.');
      }

      prepareToHydrateHostSuspenseInstance(workInProgress);
      bubbleProperties(workInProgress);

      if (enableProfilerTimer) {
        if ((workInProgress.mode & ProfileMode) !== NoMode) {
          var isTimedOutSuspense = nextState !== null;

          if (isTimedOutSuspense) {
            // Don't count time spent in a timed out Suspense subtree as part of the base duration.
            var primaryChildFragment = workInProgress.child;

            if (primaryChildFragment !== null) {
              // $FlowFixMe[unsafe-arithmetic] Flow doesn't support type casting in combination with the -= operator
              workInProgress.treeBaseDuration -= primaryChildFragment.treeBaseDuration;
            }
          }
        }
      }

      return false;
    } else {
      emitPendingHydrationWarnings(); // We might have reentered this boundary to hydrate it. If so, we need to reset the hydration
      // state since we're now exiting out of it. popHydrationState doesn't do that for us.

      resetHydrationState();

      if ((workInProgress.flags & DidCapture) === NoFlags) {
        // This boundary did not suspend so it's now hydrated and unsuspended.
        nextState = workInProgress.memoizedState = null;
      } // If nothing suspended, we need to schedule an effect to mark this boundary
      // as having hydrated so events know that they're free to be invoked.
      // It's also a signal to replay events and the suspense callback.
      // If something suspended, schedule an effect to attach retry listeners.
      // So we might as well always mark this.


      workInProgress.flags |= Update;
      bubbleProperties(workInProgress);

      if (enableProfilerTimer) {
        if ((workInProgress.mode & ProfileMode) !== NoMode) {
          var _isTimedOutSuspense2 = nextState !== null;

          if (_isTimedOutSuspense2) {
            // Don't count time spent in a timed out Suspense subtree as part of the base duration.
            var _primaryChildFragment2 = workInProgress.child;

            if (_primaryChildFragment2 !== null) {
              // $FlowFixMe[unsafe-arithmetic] Flow doesn't support type casting in combination with the -= operator
              workInProgress.treeBaseDuration -= _primaryChildFragment2.treeBaseDuration;
            }
          }
        }
      }

      return false;
    }
  } else {
    // Successfully completed this tree. If this was a forced client render,
    // there may have been recoverable errors during first hydration
    // attempt. If so, add them to a queue so we can log them in the
    // commit phase. We also add them to prev state so we can get to them
    // from the Suspense Boundary.
    var hydrationErrors = upgradeHydrationErrorsToRecoverable();

    if (current !== null && current.memoizedState !== null) {
      var prevState = current.memoizedState;
      prevState.hydrationErrors = hydrationErrors;
    } // Fall through to normal Suspense path


    return true;
  }
}

function completeWork(current, workInProgress, renderLanes) {
  var newProps = workInProgress.pendingProps; // Note: This intentionally doesn't check if we're hydrating because comparing
  // to the current tree provider fiber is just as fast and less error-prone.
  // Ideally we would have a special version of the work loop only
  // for hydration.

  popTreeContext(workInProgress);

  switch (workInProgress.tag) {
    case IncompleteFunctionComponent:
      {
        if (disableLegacyMode) {
          break;
        } // Fallthrough

      }

    case LazyComponent:
    case SimpleMemoComponent:
    case FunctionComponent:
    case ForwardRef:
    case Fragment:
    case Mode:
    case Profiler:
    case ContextConsumer:
    case MemoComponent:
      bubbleProperties(workInProgress);
      return null;

    case ClassComponent:
      {
        var Component = workInProgress.type;

        if (isLegacyContextProvider(Component)) {
          popLegacyContext(workInProgress);
        }

        bubbleProperties(workInProgress);
        return null;
      }

    case HostRoot:
      {
        var fiberRoot = workInProgress.stateNode;

        if (enableTransitionTracing) {
          var transitions = getWorkInProgressTransitions(); // We set the Passive flag here because if there are new transitions,
          // we will need to schedule callbacks and process the transitions,
          // which we do in the passive phase

          if (transitions !== null) {
            workInProgress.flags |= Passive;
          }
        }

        var previousCache = null;

        if (current !== null) {
          previousCache = current.memoizedState.cache;
        }

        var cache = workInProgress.memoizedState.cache;

        if (cache !== previousCache) {
          // Run passive effects to retain/release the cache.
          workInProgress.flags |= Passive;
        }

        popCacheProvider(workInProgress, cache);

        if (enableTransitionTracing) {
          popRootMarkerInstance(workInProgress);
        }

        popRootTransition(workInProgress, fiberRoot, renderLanes);
        popHostContainer(workInProgress);
        popTopLevelLegacyContextObject(workInProgress);

        if (fiberRoot.pendingContext) {
          fiberRoot.context = fiberRoot.pendingContext;
          fiberRoot.pendingContext = null;
        }

        if (current === null || current.child === null) {
          // If we hydrated, pop so that we can delete any remaining children
          // that weren't hydrated.
          var wasHydrated = popHydrationState(workInProgress);

          if (wasHydrated) {
            emitPendingHydrationWarnings(); // If we hydrated, then we'll need to schedule an update for
            // the commit side-effects on the root.

            markUpdate(workInProgress);
          } else {
            if (current !== null) {
              var prevState = current.memoizedState;

              if ( // Check if this is a client root
              !prevState.isDehydrated || // Check if we reverted to client rendering (e.g. due to an error)
              (workInProgress.flags & ForceClientRender) !== NoFlags) {
                // Schedule an effect to clear this container at the start of the
                // next commit. This handles the case of React rendering into a
                // container with previous children. It's also safe to do for
                // updates too, because current.child would only be null if the
                // previous render was null (so the container would already
                // be empty).
                workInProgress.flags |= Snapshot; // If this was a forced client render, there may have been
                // recoverable errors during first hydration attempt. If so, add
                // them to a queue so we can log them in the commit phase.

                upgradeHydrationErrorsToRecoverable();
              }
            }
          }
        }

        updateHostContainer(current, workInProgress);
        bubbleProperties(workInProgress);

        if (enableTransitionTracing) {
          if ((workInProgress.subtreeFlags & Visibility) !== NoFlags) {
            // If any of our suspense children toggle visibility, this means that
            // the pending boundaries array needs to be updated, which we only
            // do in the passive phase.
            workInProgress.flags |= Passive;
          }
        }

        return null;
      }

    case HostHoistable:
      {
        if (supportsResources) {
          // The branching here is more complicated than you might expect because
          // a HostHoistable sometimes corresponds to a Resource and sometimes
          // corresponds to an Instance. It can also switch during an update.
          var type = workInProgress.type;
          var nextResource = workInProgress.memoizedState;

          if (current === null) {
            // We are mounting and must Update this Hoistable in this commit
            // @TODO refactor this block to create the instance here in complete
            // phase if we are not hydrating.
            markUpdate(workInProgress);

            if (nextResource !== null) {
              // This is a Hoistable Resource
              // This must come at the very end of the complete phase.
              bubbleProperties(workInProgress);
              preloadResourceAndSuspendIfNeeded(workInProgress, nextResource, type, newProps, renderLanes);
              return null;
            } else {
              // This is a Hoistable Instance
              // This must come at the very end of the complete phase.
              bubbleProperties(workInProgress);
              preloadInstanceAndSuspendIfNeeded(workInProgress, type, null, newProps, renderLanes);
              return null;
            }
          } else {
            // This is an update.
            if (nextResource) {
              // This is a Resource
              if (nextResource !== current.memoizedState) {
                // we have a new Resource. we need to update
                markUpdate(workInProgress); // This must come at the very end of the complete phase.

                bubbleProperties(workInProgress); // This must come at the very end of the complete phase, because it might
                // throw to suspend, and if the resource immediately loads, the work loop
                // will resume rendering as if the work-in-progress completed. So it must
                // fully complete.

                preloadResourceAndSuspendIfNeeded(workInProgress, nextResource, type, newProps, renderLanes);
                return null;
              } else {
                // This must come at the very end of the complete phase.
                bubbleProperties(workInProgress);
                workInProgress.flags &= ~MaySuspendCommit;
                return null;
              }
            } else {
              var oldProps = current.memoizedProps; // This is an Instance
              // We may have props to update on the Hoistable instance.

              if (supportsMutation) {
                if (oldProps !== newProps) {
                  markUpdate(workInProgress);
                }
              } else {
                // We use the updateHostComponent path becuase it produces
                // the update queue we need for Hoistables.
                updateHostComponent(current, workInProgress, type, newProps, renderLanes);
              } // This must come at the very end of the complete phase.


              bubbleProperties(workInProgress);
              preloadInstanceAndSuspendIfNeeded(workInProgress, type, oldProps, newProps, renderLanes);
              return null;
            }
          }
        } // Fall through

      }

    case HostSingleton:
      {
        if (supportsSingletons) {
          popHostContext(workInProgress);
          var rootContainerInstance = getRootHostContainer();
          var _type = workInProgress.type;

          if (current !== null && workInProgress.stateNode != null) {
            if (supportsMutation) {
              var _oldProps2 = current.memoizedProps;

              if (_oldProps2 !== newProps) {
                markUpdate(workInProgress);
              }
            } else {
              updateHostComponent(current, workInProgress, _type, newProps, renderLanes);
            }
          } else {
            if (!newProps) {
              if (workInProgress.stateNode === null) {
                throw new Error('We must have new props for new mounts. This error is likely ' + 'caused by a bug in React. Please file an issue.');
              } // This can happen when we abort work.


              bubbleProperties(workInProgress);

              if (enableViewTransition) {
                // Host Components act as their own View Transitions which doesn't run enter/exit animations.
                // We clear any ViewTransitionStatic flag bubbled from inner View Transitions.
                workInProgress.subtreeFlags &= ~ViewTransitionStatic;
              }

              return null;
            }

            var currentHostContext = getHostContext();

            var _wasHydrated = popHydrationState(workInProgress);

            var instance;

            if (_wasHydrated) {
              // We ignore the boolean indicating there is an updateQueue because
              // it is used only to set text children and HostSingletons do not
              // use them.
              prepareToHydrateHostInstance(workInProgress, currentHostContext);
              instance = workInProgress.stateNode;
            } else {
              instance = resolveSingletonInstance(_type, newProps, rootContainerInstance, currentHostContext, true);
              workInProgress.stateNode = instance;
              markUpdate(workInProgress);
            }
          }

          bubbleProperties(workInProgress);

          if (enableViewTransition) {
            // Host Components act as their own View Transitions which doesn't run enter/exit animations.
            // We clear any ViewTransitionStatic flag bubbled from inner View Transitions.
            workInProgress.subtreeFlags &= ~ViewTransitionStatic;
          }

          return null;
        } // Fall through

      }

    case HostComponent:
      {
        popHostContext(workInProgress);
        var _type2 = workInProgress.type;

        if (current !== null && workInProgress.stateNode != null) {
          updateHostComponent(current, workInProgress, _type2, newProps, renderLanes);
        } else {
          if (!newProps) {
            if (workInProgress.stateNode === null) {
              throw new Error('We must have new props for new mounts. This error is likely ' + 'caused by a bug in React. Please file an issue.');
            } // This can happen when we abort work.


            bubbleProperties(workInProgress);

            if (enableViewTransition) {
              // Host Components act as their own View Transitions which doesn't run enter/exit animations.
              // We clear any ViewTransitionStatic flag bubbled from inner View Transitions.
              workInProgress.subtreeFlags &= ~ViewTransitionStatic;
            }

            return null;
          }

          var _currentHostContext = getHostContext(); // TODO: Move createInstance to beginWork and keep it on a context
          // "stack" as the parent. Then append children as we go in beginWork
          // or completeWork depending on whether we want to add them top->down or
          // bottom->up. Top->down is faster in IE11.


          var _wasHydrated2 = popHydrationState(workInProgress);

          if (_wasHydrated2) {
            // TODO: Move this and createInstance step into the beginPhase
            // to consolidate.
            prepareToHydrateHostInstance(workInProgress, _currentHostContext);

            if (finalizeHydratedChildren(workInProgress.stateNode, _type2, newProps, _currentHostContext)) {
              workInProgress.flags |= Hydrate;
            }
          } else {
            var _rootContainerInstance = getRootHostContainer();

            var _instance3 = createInstance(_type2, newProps, _rootContainerInstance, _currentHostContext, workInProgress); // TODO: For persistent renderers, we should pass children as part
            // of the initial instance creation


            markCloned(workInProgress);
            appendAllChildren(_instance3, workInProgress, false, false);
            workInProgress.stateNode = _instance3; // Certain renderers require commit-time effects for initial mount.
            // (eg DOM renderer supports auto-focus for certain elements).
            // Make sure such renderers get scheduled for later work.

            if (finalizeInitialChildren(_instance3, _type2, newProps, _currentHostContext)) {
              markUpdate(workInProgress);
            }
          }
        }

        bubbleProperties(workInProgress);

        if (enableViewTransition) {
          // Host Components act as their own View Transitions which doesn't run enter/exit animations.
          // We clear any ViewTransitionStatic flag bubbled from inner View Transitions.
          workInProgress.subtreeFlags &= ~ViewTransitionStatic;
        } // This must come at the very end of the complete phase, because it might
        // throw to suspend, and if the resource immediately loads, the work loop
        // will resume rendering as if the work-in-progress completed. So it must
        // fully complete.


        preloadInstanceAndSuspendIfNeeded(workInProgress, workInProgress.type, current === null ? null : current.memoizedProps, workInProgress.pendingProps, renderLanes);
        return null;
      }

    case HostText:
      {
        var newText = newProps;

        if (current && workInProgress.stateNode != null) {
          var oldText = current.memoizedProps; // If we have an alternate, that means this is an update and we need
          // to schedule a side-effect to do the updates.

          updateHostText(current, workInProgress, oldText, newText);
        } else {
          if (typeof newText !== 'string') {
            if (workInProgress.stateNode === null) {
              throw new Error('We must have new props for new mounts. This error is likely ' + 'caused by a bug in React. Please file an issue.');
            } // This can happen when we abort work.

          }

          var _rootContainerInstance2 = getRootHostContainer();

          var _currentHostContext2 = getHostContext();

          var _wasHydrated3 = popHydrationState(workInProgress);

          if (_wasHydrated3) {
            prepareToHydrateHostTextInstance(workInProgress);
          } else {
            markCloned(workInProgress);
            workInProgress.stateNode = createTextInstance(newText, _rootContainerInstance2, _currentHostContext2, workInProgress);
          }
        }

        bubbleProperties(workInProgress);
        return null;
      }

    case ActivityComponent:
      {
        var nextState = workInProgress.memoizedState;

        if (current === null || current.memoizedState !== null) {
          var fallthroughToNormalOffscreenPath = completeDehydratedActivityBoundary(current, workInProgress, nextState);

          if (!fallthroughToNormalOffscreenPath) {
            if (workInProgress.flags & ForceClientRender) {
              popSuspenseHandler(workInProgress); // Special case. There were remaining unhydrated nodes. We treat
              // this as a mismatch. Revert to client rendering.

              return workInProgress;
            } else {
              popSuspenseHandler(workInProgress); // Did not finish hydrating, either because this is the initial
              // render or because something suspended.

              return null;
            }
          }

          if ((workInProgress.flags & DidCapture) !== NoFlags) {
            // We called retryActivityComponentWithoutHydrating and tried client rendering
            // but now we suspended again. We should never arrive here because we should
            // not have pushed a suspense handler during that second pass and it should
            // instead have suspended above.
            throw new Error('Client rendering an Activity suspended it again. This is a bug in React.');
          } // Continue with the normal Activity path.

        }

        bubbleProperties(workInProgress);
        return null;
      }

    case SuspenseComponent:
      {
        var _nextState = workInProgress.memoizedState; // Special path for dehydrated boundaries. We may eventually move this
        // to its own fiber type so that we can add other kinds of hydration
        // boundaries that aren't associated with a Suspense tree. In anticipation
        // of such a refactor, all the hydration logic is contained in
        // this branch.

        if (current === null || current.memoizedState !== null && current.memoizedState.dehydrated !== null) {
          var fallthroughToNormalSuspensePath = completeDehydratedSuspenseBoundary(current, workInProgress, _nextState);

          if (!fallthroughToNormalSuspensePath) {
            if (workInProgress.flags & ForceClientRender) {
              popSuspenseHandler(workInProgress); // Special case. There were remaining unhydrated nodes. We treat
              // this as a mismatch. Revert to client rendering.

              return workInProgress;
            } else {
              popSuspenseHandler(workInProgress); // Did not finish hydrating, either because this is the initial
              // render or because something suspended.

              return null;
            }
          } // Continue with the normal Suspense path.

        }

        popSuspenseHandler(workInProgress);

        if ((workInProgress.flags & DidCapture) !== NoFlags) {
          // Something suspended. Re-render with the fallback children.
          workInProgress.lanes = renderLanes;

          if (enableProfilerTimer && (workInProgress.mode & ProfileMode) !== NoMode) {
            transferActualDuration(workInProgress);
          } // Don't bubble properties in this case.


          return workInProgress;
        }

        var nextDidTimeout = _nextState !== null;
        var prevDidTimeout = current !== null && current.memoizedState !== null;

        if (nextDidTimeout) {
          var offscreenFiber = workInProgress.child;
          var _previousCache = null;

          if (offscreenFiber.alternate !== null && offscreenFiber.alternate.memoizedState !== null && offscreenFiber.alternate.memoizedState.cachePool !== null) {
            _previousCache = offscreenFiber.alternate.memoizedState.cachePool.pool;
          }

          var _cache = null;

          if (offscreenFiber.memoizedState !== null && offscreenFiber.memoizedState.cachePool !== null) {
            _cache = offscreenFiber.memoizedState.cachePool.pool;
          }

          if (_cache !== _previousCache) {
            // Run passive effects to retain/release the cache.
            offscreenFiber.flags |= Passive;
          }
        } // If the suspended state of the boundary changes, we need to schedule
        // a passive effect, which is when we process the transitions


        if (nextDidTimeout !== prevDidTimeout) {
          if (enableTransitionTracing) {
            var _offscreenFiber = workInProgress.child;
            _offscreenFiber.flags |= Passive;
          } // If the suspended state of the boundary changes, we need to schedule
          // an effect to toggle the subtree's visibility. When we switch from
          // fallback -> primary, the inner Offscreen fiber schedules this effect
          // as part of its normal complete phase. But when we switch from
          // primary -> fallback, the inner Offscreen fiber does not have a complete
          // phase. So we need to schedule its effect here.
          //
          // We also use this flag to connect/disconnect the effects, but the same
          // logic applies: when re-connecting, the Offscreen fiber's complete
          // phase will handle scheduling the effect. It's only when the fallback
          // is active that we have to do anything special.


          if (nextDidTimeout) {
            var _offscreenFiber2 = workInProgress.child;
            _offscreenFiber2.flags |= Visibility;
          }
        }

        var retryQueue = workInProgress.updateQueue;
        scheduleRetryEffect(workInProgress, retryQueue);

        if (enableSuspenseCallback && workInProgress.updateQueue !== null && workInProgress.memoizedProps.suspenseCallback != null) {
          // Always notify the callback
          // TODO: Move to passive phase
          workInProgress.flags |= Update;
        }

        bubbleProperties(workInProgress);

        if (enableProfilerTimer) {
          if ((workInProgress.mode & ProfileMode) !== NoMode) {
            if (nextDidTimeout) {
              // Don't count time spent in a timed out Suspense subtree as part of the base duration.
              var primaryChildFragment = workInProgress.child;

              if (primaryChildFragment !== null) {
                // $FlowFixMe[unsafe-arithmetic] Flow doesn't support type casting in combination with the -= operator
                workInProgress.treeBaseDuration -= primaryChildFragment.treeBaseDuration;
              }
            }
          }
        }

        return null;
      }

    case HostPortal:
      popHostContainer(workInProgress);
      updateHostContainer(current, workInProgress);

      if (current === null) {
        preparePortalMount(workInProgress.stateNode.containerInfo);
      }

      bubbleProperties(workInProgress);
      return null;

    case ContextProvider:
      // Pop provider fiber
      var context;

      if (enableRenderableContext) {
        context = workInProgress.type;
      } else {
        context = workInProgress.type._context;
      }

      popProvider(context, workInProgress);
      bubbleProperties(workInProgress);
      return null;

    case IncompleteClassComponent:
      {
        if (disableLegacyMode) {
          break;
        } // Same as class component case. I put it down here so that the tags are
        // sequential to ensure this switch is compiled to a jump table.


        var _Component = workInProgress.type;

        if (isLegacyContextProvider(_Component)) {
          popLegacyContext(workInProgress);
        }

        bubbleProperties(workInProgress);
        return null;
      }

    case SuspenseListComponent:
      {
        popSuspenseListContext(workInProgress);
        var renderState = workInProgress.memoizedState;

        if (renderState === null) {
          // We're running in the default, "independent" mode.
          // We don't do anything in this mode.
          bubbleProperties(workInProgress);
          return null;
        }

        var didSuspendAlready = (workInProgress.flags & DidCapture) !== NoFlags;
        var renderedTail = renderState.rendering;

        if (renderedTail === null) {
          // We just rendered the head.
          if (!didSuspendAlready) {
            // This is the first pass. We need to figure out if anything is still
            // suspended in the rendered set.
            // If new content unsuspended, but there's still some content that
            // didn't. Then we need to do a second pass that forces everything
            // to keep showing their fallbacks.
            // We might be suspended if something in this render pass suspended, or
            // something in the previous committed pass suspended. Otherwise,
            // there's no chance so we can skip the expensive call to
            // findFirstSuspended.
            var cannotBeSuspended = renderHasNotSuspendedYet() && (current === null || (current.flags & DidCapture) === NoFlags);

            if (!cannotBeSuspended) {
              var row = workInProgress.child;

              while (row !== null) {
                var suspended = findFirstSuspended(row);

                if (suspended !== null) {
                  didSuspendAlready = true;
                  workInProgress.flags |= DidCapture;
                  cutOffTailIfNeeded(renderState, false); // If this is a newly suspended tree, it might not get committed as
                  // part of the second pass. In that case nothing will subscribe to
                  // its thenables. Instead, we'll transfer its thenables to the
                  // SuspenseList so that it can retry if they resolve.
                  // There might be multiple of these in the list but since we're
                  // going to wait for all of them anyway, it doesn't really matter
                  // which ones gets to ping. In theory we could get clever and keep
                  // track of how many dependencies remain but it gets tricky because
                  // in the meantime, we can add/remove/change items and dependencies.
                  // We might bail out of the loop before finding any but that
                  // doesn't matter since that means that the other boundaries that
                  // we did find already has their listeners attached.

                  var _retryQueue = suspended.updateQueue;
                  workInProgress.updateQueue = _retryQueue;
                  scheduleRetryEffect(workInProgress, _retryQueue); // Rerender the whole list, but this time, we'll force fallbacks
                  // to stay in place.
                  // Reset the effect flags before doing the second pass since that's now invalid.
                  // Reset the child fibers to their original state.

                  workInProgress.subtreeFlags = NoFlags;
                  resetChildFibers(workInProgress, renderLanes); // Set up the Suspense List Context to force suspense and
                  // immediately rerender the children.

                  pushSuspenseListContext(workInProgress, setShallowSuspenseListContext(suspenseStackCursor.current, ForceSuspenseFallback)); // Don't bubble properties in this case.

                  return workInProgress.child;
                }

                row = row.sibling;
              }
            }

            if (renderState.tail !== null && now() > getRenderTargetTime()) {
              // We have already passed our CPU deadline but we still have rows
              // left in the tail. We'll just give up further attempts to render
              // the main content and only render fallbacks.
              workInProgress.flags |= DidCapture;
              didSuspendAlready = true;
              cutOffTailIfNeeded(renderState, false); // Since nothing actually suspended, there will nothing to ping this
              // to get it started back up to attempt the next item. While in terms
              // of priority this work has the same priority as this current render,
              // it's not part of the same transition once the transition has
              // committed. If it's sync, we still want to yield so that it can be
              // painted. Conceptually, this is really the same as pinging.
              // We can use any RetryLane even if it's the one currently rendering
              // since we're leaving it behind on this node.

              workInProgress.lanes = SomeRetryLane;
            }
          } else {
            cutOffTailIfNeeded(renderState, false);
          } // Next we're going to render the tail.

        } else {
          // Append the rendered row to the child list.
          if (!didSuspendAlready) {
            var _suspended = findFirstSuspended(renderedTail);

            if (_suspended !== null) {
              workInProgress.flags |= DidCapture;
              didSuspendAlready = true; // Ensure we transfer the update queue to the parent so that it doesn't
              // get lost if this row ends up dropped during a second pass.

              var _retryQueue2 = _suspended.updateQueue;
              workInProgress.updateQueue = _retryQueue2;
              scheduleRetryEffect(workInProgress, _retryQueue2);
              cutOffTailIfNeeded(renderState, true); // This might have been modified.

              if (renderState.tail === null && renderState.tailMode === 'hidden' && !renderedTail.alternate && !getIsHydrating() // We don't cut it if we're hydrating.
              ) {
                // We're done.
                bubbleProperties(workInProgress);
                return null;
              }
            } else if ( // The time it took to render last row is greater than the remaining
            // time we have to render. So rendering one more row would likely
            // exceed it.
            now() * 2 - renderState.renderingStartTime > getRenderTargetTime() && renderLanes !== OffscreenLane) {
              // We have now passed our CPU deadline and we'll just give up further
              // attempts to render the main content and only render fallbacks.
              // The assumption is that this is usually faster.
              workInProgress.flags |= DidCapture;
              didSuspendAlready = true;
              cutOffTailIfNeeded(renderState, false); // Since nothing actually suspended, there will nothing to ping this
              // to get it started back up to attempt the next item. While in terms
              // of priority this work has the same priority as this current render,
              // it's not part of the same transition once the transition has
              // committed. If it's sync, we still want to yield so that it can be
              // painted. Conceptually, this is really the same as pinging.
              // We can use any RetryLane even if it's the one currently rendering
              // since we're leaving it behind on this node.

              workInProgress.lanes = SomeRetryLane;
            }
          }

          if (renderState.isBackwards) {
            // The effect list of the backwards tail will have been added
            // to the end. This breaks the guarantee that life-cycles fire in
            // sibling order but that isn't a strong guarantee promised by React.
            // Especially since these might also just pop in during future commits.
            // Append to the beginning of the list.
            renderedTail.sibling = workInProgress.child;
            workInProgress.child = renderedTail;
          } else {
            var previousSibling = renderState.last;

            if (previousSibling !== null) {
              previousSibling.sibling = renderedTail;
            } else {
              workInProgress.child = renderedTail;
            }

            renderState.last = renderedTail;
          }
        }

        if (renderState.tail !== null) {
          // We still have tail rows to render.
          // Pop a row.
          var next = renderState.tail;
          renderState.rendering = next;
          renderState.tail = next.sibling;
          renderState.renderingStartTime = now();
          next.sibling = null; // Restore the context.
          // TODO: We can probably just avoid popping it instead and only
          // setting it the first time we go from not suspended to suspended.

          var suspenseContext = suspenseStackCursor.current;

          if (didSuspendAlready) {
            suspenseContext = setShallowSuspenseListContext(suspenseContext, ForceSuspenseFallback);
          } else {
            suspenseContext = setDefaultShallowSuspenseListContext(suspenseContext);
          }

          pushSuspenseListContext(workInProgress, suspenseContext); // Do a pass over the next row.
          // Don't bubble properties in this case.

          return next;
        }

        bubbleProperties(workInProgress);
        return null;
      }

    case ScopeComponent:
      {
        if (enableScopeAPI) {
          if (current === null) {
            var scopeInstance = createScopeInstance();
            workInProgress.stateNode = scopeInstance;
            prepareScopeUpdate(scopeInstance, workInProgress);

            if (workInProgress.ref !== null) {
              // Scope components always do work in the commit phase if there's a
              // ref attached.
              markUpdate(workInProgress);
            }
          } else {
            if (workInProgress.ref !== null) {
              // Scope components always do work in the commit phase if there's a
              // ref attached.
              markUpdate(workInProgress);
            }
          }

          bubbleProperties(workInProgress);
          return null;
        }

        break;
      }

    case OffscreenComponent:
    case LegacyHiddenComponent:
      {
        popSuspenseHandler(workInProgress);
        popHiddenContext(workInProgress);
        var _nextState2 = workInProgress.memoizedState;
        var nextIsHidden = _nextState2 !== null; // Schedule a Visibility effect if the visibility has changed

        if (enableLegacyHidden && workInProgress.tag === LegacyHiddenComponent) {// LegacyHidden doesn't do any hiding — it only pre-renders.
        } else {
          if (current !== null) {
            var _prevState = current.memoizedState;
            var prevIsHidden = _prevState !== null;

            if (prevIsHidden !== nextIsHidden) {
              workInProgress.flags |= Visibility;
            }
          } else {
            // On initial mount, we only need a Visibility effect if the tree
            // is hidden.
            if (nextIsHidden) {
              workInProgress.flags |= Visibility;
            }
          }
        }

        if (!nextIsHidden || !disableLegacyMode && (workInProgress.mode & ConcurrentMode) === NoMode) {
          bubbleProperties(workInProgress);
        } else {
          // Don't bubble properties for hidden children unless we're rendering
          // at offscreen priority.
          if (includesSomeLane(renderLanes, OffscreenLane) && // Also don't bubble if the tree suspended
          (workInProgress.flags & DidCapture) === NoLanes) {
            bubbleProperties(workInProgress); // Check if there was an insertion or update in the hidden subtree.
            // If so, we need to hide those nodes in the commit phase, so
            // schedule a visibility effect.

            if ((!enableLegacyHidden || workInProgress.tag !== LegacyHiddenComponent) && workInProgress.subtreeFlags & (Placement | Update)) {
              workInProgress.flags |= Visibility;
            }
          }
        }

        var offscreenQueue = workInProgress.updateQueue;

        if (offscreenQueue !== null) {
          var _retryQueue3 = offscreenQueue.retryQueue;
          scheduleRetryEffect(workInProgress, _retryQueue3);
        }

        var _previousCache2 = null;

        if (current !== null && current.memoizedState !== null && current.memoizedState.cachePool !== null) {
          _previousCache2 = current.memoizedState.cachePool.pool;
        }

        var _cache2 = null;

        if (workInProgress.memoizedState !== null && workInProgress.memoizedState.cachePool !== null) {
          _cache2 = workInProgress.memoizedState.cachePool.pool;
        }

        if (_cache2 !== _previousCache2) {
          // Run passive effects to retain/release the cache.
          workInProgress.flags |= Passive;
        }

        popTransition(workInProgress, current);
        return null;
      }

    case CacheComponent:
      {
        var _previousCache3 = null;

        if (current !== null) {
          _previousCache3 = current.memoizedState.cache;
        }

        var _cache3 = workInProgress.memoizedState.cache;

        if (_cache3 !== _previousCache3) {
          // Run passive effects to retain/release the cache.
          workInProgress.flags |= Passive;
        }

        popCacheProvider(workInProgress, _cache3);
        bubbleProperties(workInProgress);
        return null;
      }

    case TracingMarkerComponent:
      {
        if (enableTransitionTracing) {
          var _instance4 = workInProgress.stateNode;

          if (_instance4 !== null) {
            popMarkerInstance(workInProgress);
          }

          bubbleProperties(workInProgress);
        }

        return null;
      }

    case ViewTransitionComponent:
      {
        if (enableViewTransition) {
          // We're a component that might need an exit transition. This flag will
          // bubble up to the parent tree to indicate that there's a child that
          // might need an exit View Transition upon unmount.
          workInProgress.flags |= ViewTransitionStatic;
          bubbleProperties(workInProgress);
        }

        return null;
      }

    case Throw:
      {
        if (!disableLegacyMode) {
          // Only Legacy Mode completes an errored node.
          return null;
        }
      }
  }

  throw new Error("Unknown unit of work tag (" + workInProgress.tag + "). This error is likely caused by a bug in " + 'React. Please file an issue.');
}

export { completeWork };