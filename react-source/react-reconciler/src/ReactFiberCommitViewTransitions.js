/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { HostComponent, OffscreenComponent, ViewTransitionComponent } from './ReactWorkTags';
import { NoFlags, Update, ViewTransitionStatic, AffectedParentLayout, ViewTransitionNamedStatic } from './ReactFiberFlags';
import { supportsMutation, applyViewTransitionName, restoreViewTransitionName, measureInstance, measureClonedInstance, hasInstanceChanged, hasInstanceAffectedParent, wasInstanceInViewport } from './ReactFiberConfig';
import { scheduleViewTransitionEvent } from './ReactFiberWorkLoop';
import { getViewTransitionName, getViewTransitionClassName } from './ReactFiberViewTransitionComponent';
export var shouldStartViewTransition = false;
export function resetShouldStartViewTransition() {
  shouldStartViewTransition = false;
} // This tracks named ViewTransition components found in the accumulateSuspenseyCommit
// phase that might need to find deleted pairs in the beforeMutation phase.

export var appearingViewTransitions = null;
export function resetAppearingViewTransitions() {
  appearingViewTransitions = null;
}
export function trackAppearingViewTransition(name, state) {
  if (appearingViewTransitions === null) {
    appearingViewTransitions = new Map();
  }

  appearingViewTransitions.set(name, state);
}
export function trackEnterViewTransitions(placement) {
  if (placement.tag === ViewTransitionComponent || (placement.subtreeFlags & ViewTransitionStatic) !== NoFlags) {
    // If an inserted or appearing Fiber is a ViewTransition component or has one as
    // an immediate child, then that will trigger as an "Enter" in future passes.
    // We don't do anything else for that case in the "before mutation" phase but we
    // still have to mark it as needing to call startViewTransition if nothing else
    // updates.
    shouldStartViewTransition = true;
  }
} // We can't cancel view transition children until we know that their parent also
// don't need to transition.

export var viewTransitionCancelableChildren = null; // tupled array where each entry is [instance: Instance, oldName: string, props: Props]

export function pushViewTransitionCancelableScope() {
  var prevChildren = viewTransitionCancelableChildren;
  viewTransitionCancelableChildren = null;
  return prevChildren;
}
export function popViewTransitionCancelableScope(prevChildren) {
  viewTransitionCancelableChildren = prevChildren;
}
var viewTransitionHostInstanceIdx = 0;
export function applyViewTransitionToHostInstances(child, name, className, collectMeasurements, stopAtNestedViewTransitions) {
  viewTransitionHostInstanceIdx = 0;
  return applyViewTransitionToHostInstancesRecursive(child, name, className, collectMeasurements, stopAtNestedViewTransitions);
}

function applyViewTransitionToHostInstancesRecursive(child, name, className, collectMeasurements, stopAtNestedViewTransitions) {
  if (!supportsMutation) {
    return false;
  }

  var inViewport = false;

  while (child !== null) {
    if (child.tag === HostComponent) {
      var instance = child.stateNode;

      if (collectMeasurements !== null) {
        var measurement = measureInstance(instance);
        collectMeasurements.push(measurement);

        if (wasInstanceInViewport(measurement)) {
          inViewport = true;
        }
      } else if (!inViewport) {
        if (wasInstanceInViewport(measureInstance(instance))) {
          inViewport = true;
        }
      }

      shouldStartViewTransition = true;
      applyViewTransitionName(instance, viewTransitionHostInstanceIdx === 0 ? name : // If we have multiple Host Instances below, we add a suffix to the name to give
      // each one a unique name.
      name + '_' + viewTransitionHostInstanceIdx, className);
      viewTransitionHostInstanceIdx++;
    } else if (child.tag === OffscreenComponent && child.memoizedState !== null) {// Skip any hidden subtrees. They were or are effectively not there.
    } else if (child.tag === ViewTransitionComponent && stopAtNestedViewTransitions) {// Skip any nested view transitions for updates since in that case the
      // inner most one is the one that handles the update.
    } else {
      if (applyViewTransitionToHostInstancesRecursive(child.child, name, className, collectMeasurements, stopAtNestedViewTransitions)) {
        inViewport = true;
      }
    }

    child = child.sibling;
  }

  return inViewport;
}

function restoreViewTransitionOnHostInstances(child, stopAtNestedViewTransitions) {
  if (!supportsMutation) {
    return;
  }

  while (child !== null) {
    if (child.tag === HostComponent) {
      var instance = child.stateNode;
      restoreViewTransitionName(instance, child.memoizedProps);
    } else if (child.tag === OffscreenComponent && child.memoizedState !== null) {// Skip any hidden subtrees. They were or are effectively not there.
    } else if (child.tag === ViewTransitionComponent && stopAtNestedViewTransitions) {// Skip any nested view transitions for updates since in that case the
      // inner most one is the one that handles the update.
    } else {
      restoreViewTransitionOnHostInstances(child.child, stopAtNestedViewTransitions);
    }

    child = child.sibling;
  }
}

function commitAppearingPairViewTransitions(placement) {
  if ((placement.subtreeFlags & ViewTransitionNamedStatic) === NoFlags) {
    // This has no named view transitions in its subtree.
    return;
  }

  var child = placement.child;

  while (child !== null) {
    if (child.tag === OffscreenComponent && child.memoizedState === null) {// This tree was already hidden so we skip it.
    } else {
      commitAppearingPairViewTransitions(child);

      if (child.tag === ViewTransitionComponent && (child.flags & ViewTransitionNamedStatic) !== NoFlags) {
        var instance = child.stateNode;

        if (instance.paired) {
          var props = child.memoizedProps;

          if (props.name == null || props.name === 'auto') {
            throw new Error('Found a pair with an auto name. This is a bug in React.');
          }

          var name = props.name;
          var className = getViewTransitionClassName(props.default, props.share);

          if (className !== 'none') {
            // We found a new appearing view transition with the same name as this deletion.
            // We'll transition between them.
            var inViewport = applyViewTransitionToHostInstances(child.child, name, className, null, false);

            if (!inViewport) {
              // This boundary is exiting within the viewport but is going to leave the viewport.
              // Instead, we treat this as an exit of the previous entry by reverting the new name.
              // Ideally we could undo the old transition but it's now too late. It's also on its
              // on snapshot. We have know was for it to paint onto the original group.
              // TODO: This will lead to things unexpectedly having exit animations that normally
              // wouldn't happen. Consider if we should just let this fly off the screen instead.
              restoreViewTransitionOnHostInstances(child.child, false);
            }
          }
        }
      }
    }

    child = child.sibling;
  }
}

export function commitEnterViewTransitions(placement, gesture) {
  if (placement.tag === ViewTransitionComponent) {
    var state = placement.stateNode;
    var props = placement.memoizedProps;
    var name = getViewTransitionName(props, state);
    var className = getViewTransitionClassName(props.default, state.paired ? props.share : props.enter);

    if (className !== 'none') {
      var inViewport = applyViewTransitionToHostInstances(placement.child, name, className, null, false);

      if (!inViewport) {
        // TODO: If this was part of a pair we will still run the onShare callback.
        // Revert the transition names. This boundary is not in the viewport
        // so we won't bother animating it.
        restoreViewTransitionOnHostInstances(placement.child, false); // TODO: Should we still visit the children in case a named one was in the viewport?
      } else {
        commitAppearingPairViewTransitions(placement);

        if (!state.paired) {
          if (gesture) {// TODO: Schedule gesture events.
          } else {
            scheduleViewTransitionEvent(placement, props.onEnter);
          }
        }
      }
    } else {
      commitAppearingPairViewTransitions(placement);
    }
  } else if ((placement.subtreeFlags & ViewTransitionStatic) !== NoFlags) {
    var child = placement.child;

    while (child !== null) {
      commitEnterViewTransitions(child, gesture);
      child = child.sibling;
    }
  } else {
    commitAppearingPairViewTransitions(placement);
  }
}

function commitDeletedPairViewTransitions(deletion) {
  if (appearingViewTransitions === null || appearingViewTransitions.size === 0) {
    // We've found all.
    return;
  }

  var pairs = appearingViewTransitions;

  if ((deletion.subtreeFlags & ViewTransitionNamedStatic) === NoFlags) {
    // This has no named view transitions in its subtree.
    return;
  }

  var child = deletion.child;

  while (child !== null) {
    if (child.tag === OffscreenComponent && child.memoizedState === null) {// This tree was already hidden so we skip it.
    } else {
      if (child.tag === ViewTransitionComponent && (child.flags & ViewTransitionNamedStatic) !== NoFlags) {
        var props = child.memoizedProps;
        var name = props.name;

        if (name != null && name !== 'auto') {
          var pair = pairs.get(name);

          if (pair !== undefined) {
            var className = getViewTransitionClassName(props.default, props.share);

            if (className !== 'none') {
              // We found a new appearing view transition with the same name as this deletion.
              var inViewport = applyViewTransitionToHostInstances(child.child, name, className, null, false);

              if (!inViewport) {
                // This boundary is not in the viewport so we won't treat it as a matched pair.
                // Revert the transition names. This avoids it flying onto the screen which can
                // be disruptive and doesn't really preserve any continuity anyway.
                restoreViewTransitionOnHostInstances(child.child, false);
              } else {
                // We'll transition between them.
                var oldInstance = child.stateNode;
                var newInstance = pair;
                newInstance.paired = oldInstance;
                oldInstance.paired = newInstance; // Note: If the other side ends up outside the viewport, we'll still run this.
                // Therefore it's possible for onShare to be called with only an old snapshot.

                scheduleViewTransitionEvent(child, props.onShare);
              }
            } // Delete the entry so that we know when we've found all of them
            // and can stop searching (size reaches zero).


            pairs.delete(name);

            if (pairs.size === 0) {
              break;
            }
          }
        }
      }

      commitDeletedPairViewTransitions(child);
    }

    child = child.sibling;
  }
}

export function commitExitViewTransitions(deletion) {
  if (deletion.tag === ViewTransitionComponent) {
    var props = deletion.memoizedProps;
    var name = getViewTransitionName(props, deletion.stateNode);
    var pair = appearingViewTransitions !== null ? appearingViewTransitions.get(name) : undefined;
    var className = getViewTransitionClassName(props.default, pair !== undefined ? props.share : props.exit);

    if (className !== 'none') {
      var inViewport = applyViewTransitionToHostInstances(deletion.child, name, className, null, false);

      if (!inViewport) {
        // Revert the transition names. This boundary is not in the viewport
        // so we won't bother animating it.
        restoreViewTransitionOnHostInstances(deletion.child, false); // TODO: Should we still visit the children in case a named one was in the viewport?
      } else if (pair !== undefined) {
        // We found a new appearing view transition with the same name as this deletion.
        // We'll transition between them instead of running the normal exit.
        var oldInstance = deletion.stateNode;
        var newInstance = pair;
        newInstance.paired = oldInstance;
        oldInstance.paired = newInstance; // Delete the entry so that we know when we've found all of them
        // and can stop searching (size reaches zero).
        // $FlowFixMe[incompatible-use]: Refined by the pair.

        appearingViewTransitions.delete(name); // Note: If the other side ends up outside the viewport, we'll still run this.
        // Therefore it's possible for onShare to be called with only an old snapshot.

        scheduleViewTransitionEvent(deletion, props.onShare);
      } else {
        scheduleViewTransitionEvent(deletion, props.onExit);
      }
    }

    if (appearingViewTransitions !== null) {
      // Look for more pairs deeper in the tree.
      commitDeletedPairViewTransitions(deletion);
    }
  } else if ((deletion.subtreeFlags & ViewTransitionStatic) !== NoFlags) {
    var child = deletion.child;

    while (child !== null) {
      commitExitViewTransitions(child);
      child = child.sibling;
    }
  } else {
    if (appearingViewTransitions !== null) {
      commitDeletedPairViewTransitions(deletion);
    }
  }
}
export function commitBeforeUpdateViewTransition(current, finishedWork) {
  // The way we deal with multiple HostInstances as children of a View Transition in an
  // update can get tricky. The important bit is that if you swap out n HostInstances
  // from n HostInstances then they match up in order. Similarly, if you don't swap
  // any HostInstances each instance just transitions as is.
  //
  // We call this function twice. First we apply the view transition names on the
  // "current" tree in the snapshot phase. Then in the mutation phase we apply view
  // transition names to the "finishedWork" tree.
  //
  // This means that if there were insertions or deletions before an updated Instance
  // that same Instance might get different names in the "old" and the "new" state.
  // For example if you swap two HostInstances inside a ViewTransition they don't
  // animate to swap position but rather cross-fade into the other instance. This might
  // be unexpected but it is in line with the semantics that the ViewTransition is its
  // own layer that cross-fades its content when it updates. If you want to reorder then
  // each child needs its own ViewTransition.
  var oldProps = current.memoizedProps;
  var oldName = getViewTransitionName(oldProps, current.stateNode);
  var newProps = finishedWork.memoizedProps; // This className applies only if there are fewer child DOM nodes than
  // before or if this update should've been cancelled but we ended up with
  // a parent animating so we need to animate the child too.
  // For example, if update="foo" layout="none" and it turns out this was
  // a layout only change, then the "foo" class will be applied even though
  // it was not actually an update. Which is a bug.

  var className = getViewTransitionClassName(newProps.default, newProps.update);

  if (className === 'none') {
    // If update is "none" then we don't have to apply a name. Since we won't animate this boundary.
    return;
  }

  applyViewTransitionToHostInstances(current.child, oldName, className, current.memoizedState = [], true);
}
export function commitNestedViewTransitions(changedParent) {
  var child = changedParent.child;

  while (child !== null) {
    if (child.tag === ViewTransitionComponent) {
      // In this case the outer ViewTransition component wins but if there
      // was an update through this component then the inner one wins.
      var props = child.memoizedProps;
      var name = getViewTransitionName(props, child.stateNode);
      var className = getViewTransitionClassName(props.default, props.update); // "Nested" view transitions are in subtrees that didn't update so
      // this is a "current". We normally clear this upon rerendering
      // but we use this flag to track changes from layout in the commit.
      // So we need it to be cleared before we do that.
      // TODO: Use some other temporary state to track this.

      child.flags &= ~Update;

      if (className !== 'none') {
        applyViewTransitionToHostInstances(child.child, name, className, child.memoizedState = [], false);
      }
    } else if ((child.subtreeFlags & ViewTransitionStatic) !== NoFlags) {
      commitNestedViewTransitions(child);
    }

    child = child.sibling;
  }
}

function restorePairedViewTransitions(parent) {
  if ((parent.subtreeFlags & ViewTransitionNamedStatic) === NoFlags) {
    // This has no named view transitions in its subtree.
    return;
  }

  var child = parent.child;

  while (child !== null) {
    if (child.tag === OffscreenComponent && child.memoizedState === null) {// This tree was already hidden so we skip it.
    } else {
      if (child.tag === ViewTransitionComponent && (child.flags & ViewTransitionNamedStatic) !== NoFlags) {
        var instance = child.stateNode;

        if (instance.paired !== null) {
          instance.paired = null;
          restoreViewTransitionOnHostInstances(child.child, false);
        }
      }

      restorePairedViewTransitions(child);
    }

    child = child.sibling;
  }
}

export function restoreEnterOrExitViewTransitions(fiber) {
  if (fiber.tag === ViewTransitionComponent) {
    var instance = fiber.stateNode;
    instance.paired = null;
    restoreViewTransitionOnHostInstances(fiber.child, false);
    restorePairedViewTransitions(fiber);
  } else if ((fiber.subtreeFlags & ViewTransitionStatic) !== NoFlags) {
    var child = fiber.child;

    while (child !== null) {
      restoreEnterOrExitViewTransitions(child);
      child = child.sibling;
    }
  } else {
    restorePairedViewTransitions(fiber);
  }
}
export function restoreUpdateViewTransition(current, finishedWork) {
  restoreViewTransitionOnHostInstances(current.child, true);
  restoreViewTransitionOnHostInstances(finishedWork.child, true);
}
export function restoreUpdateViewTransitionForGesture(current, finishedWork) {
  // For gestures we don't need to reset "finishedWork" because those would
  // have all been clones that got deleted.
  restoreViewTransitionOnHostInstances(current.child, true);
}
export function restoreNestedViewTransitions(changedParent) {
  var child = changedParent.child;

  while (child !== null) {
    if (child.tag === ViewTransitionComponent) {
      restoreViewTransitionOnHostInstances(child.child, false);
    } else if ((child.subtreeFlags & ViewTransitionStatic) !== NoFlags) {
      restoreNestedViewTransitions(child);
    }

    child = child.sibling;
  }
}
export function measureViewTransitionHostInstances(parentViewTransition, child, newName, oldName, className, previousMeasurements, stopAtNestedViewTransitions) {
  viewTransitionHostInstanceIdx = 0;
  return measureViewTransitionHostInstancesRecursive(parentViewTransition, child, newName, oldName, className, previousMeasurements, stopAtNestedViewTransitions);
}

function measureViewTransitionHostInstancesRecursive(parentViewTransition, child, newName, oldName, className, previousMeasurements, stopAtNestedViewTransitions) {
  if (!supportsMutation) {
    return true;
  }

  var inViewport = false;

  while (child !== null) {
    if (child.tag === HostComponent) {
      var instance = child.stateNode;

      if (previousMeasurements !== null && viewTransitionHostInstanceIdx < previousMeasurements.length) {
        // The previous measurement of the Instance in this location within the ViewTransition.
        // Note that this might not be the same exact Instance if the Instances within the
        // ViewTransition changed.
        var previousMeasurement = previousMeasurements[viewTransitionHostInstanceIdx];
        var nextMeasurement = measureInstance(instance);

        if (wasInstanceInViewport(previousMeasurement) || wasInstanceInViewport(nextMeasurement)) {
          // If either the old or new state was within the viewport we have to animate this.
          // But if it turns out that none of them were we'll be able to skip it.
          inViewport = true;
        }

        if ((parentViewTransition.flags & Update) === NoFlags && hasInstanceChanged(previousMeasurement, nextMeasurement)) {
          parentViewTransition.flags |= Update;
        }

        if (hasInstanceAffectedParent(previousMeasurement, nextMeasurement)) {
          // If this instance size within its parent has changed it might have caused the
          // parent to relayout which needs a cross fade.
          parentViewTransition.flags |= AffectedParentLayout;
        }
      } else {
        // If there was an insertion of extra nodes, we have to assume they affected the parent.
        // It should have already been marked as an Update due to the mutation.
        parentViewTransition.flags |= AffectedParentLayout;
      }

      if ((parentViewTransition.flags & Update) !== NoFlags) {
        // We might update this node so we need to apply its new name for the new state.
        // Additionally in the ApplyGesture case we also need to do this because the clone
        // will have the name but this one won't.
        applyViewTransitionName(instance, viewTransitionHostInstanceIdx === 0 ? newName : // If we have multiple Host Instances below, we add a suffix to the name to give
        // each one a unique name.
        newName + '_' + viewTransitionHostInstanceIdx, className);
      }

      if (!inViewport || (parentViewTransition.flags & Update) === NoFlags) {
        // It turns out that we had no other deeper mutations, the child transitions didn't
        // affect the parent layout and this instance hasn't changed size. So we can skip
        // animating it. However, in the current model this only works if the parent also
        // doesn't animate. So we have to queue these and wait until we complete the parent
        // to cancel them.
        if (viewTransitionCancelableChildren === null) {
          viewTransitionCancelableChildren = [];
        }

        viewTransitionCancelableChildren.push(instance, oldName, child.memoizedProps);
      }

      viewTransitionHostInstanceIdx++;
    } else if (child.tag === OffscreenComponent && child.memoizedState !== null) {// Skip any hidden subtrees. They were or are effectively not there.
    } else if (child.tag === ViewTransitionComponent && stopAtNestedViewTransitions) {
      // Skip any nested view transitions for updates since in that case the
      // inner most one is the one that handles the update.
      // If this inner boundary resized we need to bubble that information up.
      parentViewTransition.flags |= child.flags & AffectedParentLayout;
    } else {
      if (measureViewTransitionHostInstancesRecursive(parentViewTransition, child.child, newName, oldName, className, previousMeasurements, stopAtNestedViewTransitions)) {
        inViewport = true;
      }
    }

    child = child.sibling;
  }

  return inViewport;
}

export function measureUpdateViewTransition(current, finishedWork, gesture) {
  // If this was a gesture then which Fiber was used for the "old" vs "new" state is reversed.
  // We still need to treat "finishedWork" as the Fiber that contains the flags for this commmit.
  var oldFiber = gesture ? finishedWork : current;
  var newFiber = gesture ? current : finishedWork;
  var props = newFiber.memoizedProps;
  var state = newFiber.stateNode;
  var newName = getViewTransitionName(props, state);
  var oldName = getViewTransitionName(oldFiber.memoizedProps, state); // Whether it ends up having been updated or relayout we apply the update class name.

  var className = getViewTransitionClassName(props.default, props.update);

  if (className === 'none') {
    // If update is "none" then we don't have to apply a name. Since we won't animate this boundary.
    return false;
  } // If nothing changed due to a mutation, or children changing size
  // and the measurements end up unchanged, we should restore it to not animate.


  var previousMeasurements;

  if (gesture) {
    var clones = state.clones;

    if (clones === null) {
      previousMeasurements = null;
    } else {
      previousMeasurements = clones.map(measureClonedInstance);
    }
  } else {
    previousMeasurements = oldFiber.memoizedState;
    oldFiber.memoizedState = null; // Clear it. We won't need it anymore.
  }

  var inViewport = measureViewTransitionHostInstances(finishedWork, // This is always finishedWork since it's used to assign flags.
  newFiber.child, // This either current or finishedWork depending on if was a gesture.
  newName, oldName, className, previousMeasurements, true);
  var previousCount = previousMeasurements === null ? 0 : previousMeasurements.length;

  if (viewTransitionHostInstanceIdx !== previousCount) {
    // If we found a different number of child DOM nodes we need to assume that
    // the parent layout may have changed as a result. This is not necessarily
    // true if those nodes were absolutely positioned.
    finishedWork.flags |= AffectedParentLayout;
  }

  return inViewport;
}
export function measureNestedViewTransitions(changedParent, gesture) {
  var child = changedParent.child;

  while (child !== null) {
    if (child.tag === ViewTransitionComponent) {
      var props = child.memoizedProps;
      var state = child.stateNode;
      var name = getViewTransitionName(props, state);
      var className = getViewTransitionClassName(props.default, props.update);
      var previousMeasurements = void 0;

      if (gesture) {
        var clones = state.clones;

        if (clones === null) {
          previousMeasurements = null;
        } else {
          previousMeasurements = clones.map(measureClonedInstance);
        }
      } else {
        previousMeasurements = child.memoizedState;
        child.memoizedState = null; // Clear it. We won't need it anymore.
      }

      var inViewport = measureViewTransitionHostInstances(child, child.child, name, name, // Since this is unchanged, new and old name is the same.
      className, previousMeasurements, false);

      if ((child.flags & Update) === NoFlags || !inViewport) {// Nothing changed.
      } else {
        if (gesture) {// TODO: Schedule gesture events.
        } else {
          scheduleViewTransitionEvent(child, props.onUpdate);
        }
      }
    } else if ((child.subtreeFlags & ViewTransitionStatic) !== NoFlags) {
      measureNestedViewTransitions(child, gesture);
    }

    child = child.sibling;
  }
}