/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { HostRoot, HostComponent, HostHoistable, HostSingleton, HostText, HostPortal, DehydratedFragment, Fragment } from './ReactWorkTags';
import { ContentReset, Placement } from './ReactFiberFlags';
import { supportsMutation, supportsResources, supportsSingletons, commitMount, commitUpdate, resetTextContent, commitTextUpdate, appendChild, appendChildToContainer, insertBefore, insertInContainerBefore, replaceContainerChildren, hideDehydratedBoundary, hideInstance, hideTextInstance, unhideDehydratedBoundary, unhideInstance, unhideTextInstance, commitHydratedInstance, commitHydratedContainer, commitHydratedActivityInstance, commitHydratedSuspenseInstance, removeChildFromContainer, removeChild, acquireSingletonInstance, releaseSingletonInstance, isSingletonScope, commitNewChildToFragmentInstance, deleteChildFromFragmentInstance } from './ReactFiberConfig';
import { captureCommitPhaseError } from './ReactFiberWorkLoop';
import { trackHostMutation } from './ReactFiberMutationTracking';
import { runWithFiberInDEV } from './ReactCurrentFiber';
import { enableFragmentRefs } from 'shared/ReactFeatureFlags';
export function commitHostMount(finishedWork) {
  var type = finishedWork.type;
  var props = finishedWork.memoizedProps;
  var instance = finishedWork.stateNode;

  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, commitMount, instance, type, props, finishedWork);
    } else {
      commitMount(instance, type, props, finishedWork);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHostHydratedInstance(finishedWork) {
  var type = finishedWork.type;
  var props = finishedWork.memoizedProps;
  var instance = finishedWork.stateNode;

  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, commitHydratedInstance, instance, type, props, finishedWork);
    } else {
      commitHydratedInstance(instance, type, props, finishedWork);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHostUpdate(finishedWork, newProps, oldProps) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, commitUpdate, finishedWork.stateNode, finishedWork.type, oldProps, newProps, finishedWork);
    } else {
      commitUpdate(finishedWork.stateNode, finishedWork.type, oldProps, newProps, finishedWork);
    } // Mutations are tracked manually from within commitUpdate.

  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHostTextUpdate(finishedWork, newText, oldText) {
  var textInstance = finishedWork.stateNode;

  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, commitTextUpdate, textInstance, oldText, newText);
    } else {
      commitTextUpdate(textInstance, oldText, newText);
    }

    trackHostMutation();
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHostResetTextContent(finishedWork) {
  var instance = finishedWork.stateNode;

  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, resetTextContent, instance);
    } else {
      resetTextContent(instance);
    }

    trackHostMutation();
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitShowHideSuspenseBoundary(node, isHidden) {
  try {
    var instance = node.stateNode;

    if (isHidden) {
      if (__DEV__) {
        runWithFiberInDEV(node, hideDehydratedBoundary, instance);
      } else {
        hideDehydratedBoundary(instance);
      }
    } else {
      if (__DEV__) {
        runWithFiberInDEV(node, unhideDehydratedBoundary, node.stateNode);
      } else {
        unhideDehydratedBoundary(node.stateNode);
      }
    }
  } catch (error) {
    captureCommitPhaseError(node, node.return, error);
  }
}
export function commitShowHideHostInstance(node, isHidden) {
  try {
    var instance = node.stateNode;

    if (isHidden) {
      if (__DEV__) {
        runWithFiberInDEV(node, hideInstance, instance);
      } else {
        hideInstance(instance);
      }
    } else {
      if (__DEV__) {
        runWithFiberInDEV(node, unhideInstance, node.stateNode, node.memoizedProps);
      } else {
        unhideInstance(node.stateNode, node.memoizedProps);
      }
    }
  } catch (error) {
    captureCommitPhaseError(node, node.return, error);
  }
}
export function commitShowHideHostTextInstance(node, isHidden) {
  try {
    var instance = node.stateNode;

    if (isHidden) {
      if (__DEV__) {
        runWithFiberInDEV(node, hideTextInstance, instance);
      } else {
        hideTextInstance(instance);
      }
    } else {
      if (__DEV__) {
        runWithFiberInDEV(node, unhideTextInstance, instance, node.memoizedProps);
      } else {
        unhideTextInstance(instance, node.memoizedProps);
      }
    }

    trackHostMutation();
  } catch (error) {
    captureCommitPhaseError(node, node.return, error);
  }
}
export function commitNewChildToFragmentInstances(fiber, parentFragmentInstances) {
  if (fiber.tag !== HostComponent || // Only run fragment insertion effects for initial insertions
  fiber.alternate !== null || parentFragmentInstances === null) {
    return;
  }

  for (var i = 0; i < parentFragmentInstances.length; i++) {
    var fragmentInstance = parentFragmentInstances[i];
    commitNewChildToFragmentInstance(fiber.stateNode, fragmentInstance);
  }
}
export function commitFragmentInstanceInsertionEffects(fiber) {
  var parent = fiber.return;

  while (parent !== null) {
    if (isFragmentInstanceParent(parent)) {
      var fragmentInstance = parent.stateNode;
      commitNewChildToFragmentInstance(fiber.stateNode, fragmentInstance);
    }

    if (isHostParent(parent)) {
      return;
    }

    parent = parent.return;
  }
}
export function commitFragmentInstanceDeletionEffects(fiber) {
  var parent = fiber.return;

  while (parent !== null) {
    if (isFragmentInstanceParent(parent)) {
      var fragmentInstance = parent.stateNode;
      deleteChildFromFragmentInstance(fiber.stateNode, fragmentInstance);
    }

    if (isHostParent(parent)) {
      return;
    }

    parent = parent.return;
  }
}

function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot || (supportsResources ? fiber.tag === HostHoistable : false) || (supportsSingletons ? fiber.tag === HostSingleton && isSingletonScope(fiber.type) : false) || fiber.tag === HostPortal;
}

function isFragmentInstanceParent(fiber) {
  return fiber && fiber.tag === Fragment && fiber.stateNode !== null;
}

function getHostSibling(fiber) {
  // We're going to search forward into the tree until we find a sibling host
  // node. Unfortunately, if multiple insertions are done in a row we have to
  // search past them. This leads to exponential search for the next sibling.
  // TODO: Find a more efficient way to do this.
  var node = fiber;

  siblings: while (true) {
    // If we didn't find anything, let's try the next sibling.
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        // If we pop out of the root or hit the parent the fiber we are the
        // last sibling.
        return null;
      } // $FlowFixMe[incompatible-type] found when upgrading Flow


      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;

    while (node.tag !== HostComponent && node.tag !== HostText && node.tag !== DehydratedFragment) {
      // If this is a host singleton we go deeper if it's not a special
      // singleton scope. If it is a singleton scope we skip over it because
      // you only insert against this scope when you are already inside of it
      if (supportsSingletons && node.tag === HostSingleton && isSingletonScope(node.type)) {
        continue siblings;
      } // If it is not host node and, we might have a host node inside it.
      // Try to search down until we find one.


      if (node.flags & Placement) {
        // If we don't have a child, try the siblings instead.
        continue siblings;
      } // If we don't have a child, try the siblings instead.
      // We also skip portals because they are not part of this host tree.


      if (node.child === null || node.tag === HostPortal) {
        continue siblings;
      } else {
        node.child.return = node;
        node = node.child;
      }
    } // Check if this host node is stable or about to be placed.


    if (!(node.flags & Placement)) {
      // Found it!
      return node.stateNode;
    }
  }
}

function insertOrAppendPlacementNodeIntoContainer(node, before, parent, parentFragmentInstances) {
  var tag = node.tag;
  var isHost = tag === HostComponent || tag === HostText;

  if (isHost) {
    var stateNode = node.stateNode;

    if (before) {
      insertInContainerBefore(parent, stateNode, before);
    } else {
      appendChildToContainer(parent, stateNode);
    }

    if (enableFragmentRefs) {
      commitNewChildToFragmentInstances(node, parentFragmentInstances);
    }

    trackHostMutation();
    return;
  } else if (tag === HostPortal) {
    // If the insertion itself is a portal, then we don't want to traverse
    // down its children. Instead, we'll get insertions from each child in
    // the portal directly.
    return;
  }

  if ((supportsSingletons ? tag === HostSingleton : false) && isSingletonScope(node.type)) {
    // This singleton is the parent of deeper nodes and needs to become
    // the parent for child insertions and appends
    parent = node.stateNode;
    before = null;
  }

  var child = node.child;

  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(child, before, parent, parentFragmentInstances);
    var sibling = child.sibling;

    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(sibling, before, parent, parentFragmentInstances);
      sibling = sibling.sibling;
    }
  }
}

function insertOrAppendPlacementNode(node, before, parent, parentFragmentInstances) {
  var tag = node.tag;
  var isHost = tag === HostComponent || tag === HostText;

  if (isHost) {
    var stateNode = node.stateNode;

    if (before) {
      insertBefore(parent, stateNode, before);
    } else {
      appendChild(parent, stateNode);
    }

    if (enableFragmentRefs) {
      commitNewChildToFragmentInstances(node, parentFragmentInstances);
    }

    trackHostMutation();
    return;
  } else if (tag === HostPortal) {
    // If the insertion itself is a portal, then we don't want to traverse
    // down its children. Instead, we'll get insertions from each child in
    // the portal directly.
    return;
  }

  if ((supportsSingletons ? tag === HostSingleton : false) && isSingletonScope(node.type)) {
    // This singleton is the parent of deeper nodes and needs to become
    // the parent for child insertions and appends
    parent = node.stateNode;
  }

  var child = node.child;

  if (child !== null) {
    insertOrAppendPlacementNode(child, before, parent, parentFragmentInstances);
    var sibling = child.sibling;

    while (sibling !== null) {
      insertOrAppendPlacementNode(sibling, before, parent, parentFragmentInstances);
      sibling = sibling.sibling;
    }
  }
}

function commitPlacement(finishedWork) {
  // Recursively insert all host nodes into the parent.
  var hostParentFiber;
  var parentFragmentInstances = null;
  var parentFiber = finishedWork.return;

  while (parentFiber !== null) {
    if (enableFragmentRefs && isFragmentInstanceParent(parentFiber)) {
      var fragmentInstance = parentFiber.stateNode;

      if (parentFragmentInstances === null) {
        parentFragmentInstances = [fragmentInstance];
      } else {
        parentFragmentInstances.push(fragmentInstance);
      }
    }

    if (isHostParent(parentFiber)) {
      hostParentFiber = parentFiber;
      break;
    }

    parentFiber = parentFiber.return;
  }

  if (!supportsMutation) {
    if (enableFragmentRefs) {
      commitImmutablePlacementNodeToFragmentInstances(finishedWork, parentFragmentInstances);
    }

    return;
  }

  if (hostParentFiber == null) {
    throw new Error('Expected to find a host parent. This error is likely caused by a bug ' + 'in React. Please file an issue.');
  }

  switch (hostParentFiber.tag) {
    case HostSingleton:
      {
        if (supportsSingletons) {
          var parent = hostParentFiber.stateNode;
          var before = getHostSibling(finishedWork); // We only have the top Fiber that was inserted but we need to recurse down its
          // children to find all the terminal nodes.

          insertOrAppendPlacementNode(finishedWork, before, parent, parentFragmentInstances);
          break;
        } // Fall through

      }

    case HostComponent:
      {
        var _parent = hostParentFiber.stateNode;

        if (hostParentFiber.flags & ContentReset) {
          // Reset the text content of the parent before doing any insertions
          resetTextContent(_parent); // Clear ContentReset from the effect tag

          hostParentFiber.flags &= ~ContentReset;
        }

        var _before = getHostSibling(finishedWork); // We only have the top Fiber that was inserted but we need to recurse down its
        // children to find all the terminal nodes.


        insertOrAppendPlacementNode(finishedWork, _before, _parent, parentFragmentInstances);
        break;
      }

    case HostRoot:
    case HostPortal:
      {
        var _parent2 = hostParentFiber.stateNode.containerInfo;

        var _before2 = getHostSibling(finishedWork);

        insertOrAppendPlacementNodeIntoContainer(finishedWork, _before2, _parent2, parentFragmentInstances);
        break;
      }

    default:
      throw new Error('Invalid host parent fiber. This error is likely caused by a bug ' + 'in React. Please file an issue.');
  }
}

function commitImmutablePlacementNodeToFragmentInstances(finishedWork, parentFragmentInstances) {
  if (!enableFragmentRefs) {
    return;
  }

  var isHost = finishedWork.tag === HostComponent;

  if (isHost) {
    commitNewChildToFragmentInstances(finishedWork, parentFragmentInstances);
    return;
  } else if (finishedWork.tag === HostPortal) {
    // If the insertion itself is a portal, then we don't want to traverse
    // down its children. Instead, we'll get insertions from each child in
    // the portal directly.
    return;
  }

  var child = finishedWork.child;

  if (child !== null) {
    commitImmutablePlacementNodeToFragmentInstances(child, parentFragmentInstances);
    var sibling = child.sibling;

    while (sibling !== null) {
      commitImmutablePlacementNodeToFragmentInstances(sibling, parentFragmentInstances);
      sibling = sibling.sibling;
    }
  }
}

export function commitHostPlacement(finishedWork) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, commitPlacement, finishedWork);
    } else {
      commitPlacement(finishedWork);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHostRemoveChildFromContainer(deletedFiber, nearestMountedAncestor, parentContainer, hostInstance) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(deletedFiber, removeChildFromContainer, parentContainer, hostInstance);
    } else {
      removeChildFromContainer(parentContainer, hostInstance);
    }

    trackHostMutation();
  } catch (error) {
    captureCommitPhaseError(deletedFiber, nearestMountedAncestor, error);
  }
}
export function commitHostRemoveChild(deletedFiber, nearestMountedAncestor, parentInstance, hostInstance) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(deletedFiber, removeChild, parentInstance, hostInstance);
    } else {
      removeChild(parentInstance, hostInstance);
    }

    trackHostMutation();
  } catch (error) {
    captureCommitPhaseError(deletedFiber, nearestMountedAncestor, error);
  }
}
export function commitHostRootContainerChildren(root, finishedWork) {
  var containerInfo = root.containerInfo;
  var pendingChildren = root.pendingChildren;

  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, replaceContainerChildren, containerInfo, pendingChildren);
    } else {
      replaceContainerChildren(containerInfo, pendingChildren);
    }

    trackHostMutation();
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHostPortalContainerChildren(portal, finishedWork, pendingChildren) {
  var containerInfo = portal.containerInfo;

  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, replaceContainerChildren, containerInfo, pendingChildren);
    } else {
      replaceContainerChildren(containerInfo, pendingChildren);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHostHydratedContainer(root, finishedWork) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, commitHydratedContainer, root.containerInfo);
    } else {
      commitHydratedContainer(root.containerInfo);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHostHydratedActivity(activityInstance, finishedWork) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, commitHydratedActivityInstance, activityInstance);
    } else {
      commitHydratedActivityInstance(activityInstance);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHostHydratedSuspense(suspenseInstance, finishedWork) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, commitHydratedSuspenseInstance, suspenseInstance);
    } else {
      commitHydratedSuspenseInstance(suspenseInstance);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHostSingletonAcquisition(finishedWork) {
  var singleton = finishedWork.stateNode;
  var props = finishedWork.memoizedProps;

  try {
    // This was a new mount, acquire the DOM instance and set initial properties
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, acquireSingletonInstance, finishedWork.type, props, singleton, finishedWork);
    } else {
      acquireSingletonInstance(finishedWork.type, props, singleton, finishedWork);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHostSingletonRelease(releasingWork) {
  if (__DEV__) {
    runWithFiberInDEV(releasingWork, releaseSingletonInstance, releasingWork.stateNode);
  } else {
    releaseSingletonInstance(releasingWork.stateNode);
  }
}