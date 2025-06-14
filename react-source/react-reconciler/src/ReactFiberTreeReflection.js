/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { HostComponent, HostHoistable, HostSingleton, HostRoot, HostPortal, HostText, ActivityComponent, SuspenseComponent, OffscreenComponent } from './ReactWorkTags';
import { NoFlags, Placement, Hydrating } from './ReactFiberFlags';
export function getNearestMountedFiber(fiber) {
  var node = fiber;
  var nearestMounted = fiber;

  if (!fiber.alternate) {
    // If there is no alternate, this might be a new tree that isn't inserted
    // yet. If it is, then it will have a pending insertion effect on it.
    var nextNode = node;

    do {
      node = nextNode;

      if ((node.flags & (Placement | Hydrating)) !== NoFlags) {
        // This is an insertion or in-progress hydration. The nearest possible
        // mounted fiber is the parent but we need to continue to figure out
        // if that one is still mounted.
        nearestMounted = node.return;
      } // $FlowFixMe[incompatible-type] we bail out when we get a null


      nextNode = node.return;
    } while (nextNode);
  } else {
    while (node.return) {
      node = node.return;
    }
  }

  if (node.tag === HostRoot) {
    // TODO: Check if this was a nested HostRoot when used with
    // renderContainerIntoSubtree.
    return nearestMounted;
  } // If we didn't hit the root, that means that we're in an disconnected tree
  // that has been unmounted.


  return null;
}
export function getSuspenseInstanceFromFiber(fiber) {
  if (fiber.tag === SuspenseComponent) {
    var suspenseState = fiber.memoizedState;

    if (suspenseState === null) {
      var current = fiber.alternate;

      if (current !== null) {
        suspenseState = current.memoizedState;
      }
    }

    if (suspenseState !== null) {
      return suspenseState.dehydrated;
    }
  }

  return null;
}
export function getActivityInstanceFromFiber(fiber) {
  if (fiber.tag === ActivityComponent) {
    var activityState = fiber.memoizedState;

    if (activityState === null) {
      var current = fiber.alternate;

      if (current !== null) {
        activityState = current.memoizedState;
      }
    }

    if (activityState !== null) {
      return activityState.dehydrated;
    }
  } // TODO: Implement this on ActivityComponent.


  return null;
}
export function getContainerFromFiber(fiber) {
  return fiber.tag === HostRoot ? fiber.stateNode.containerInfo : null;
}

function assertIsMounted(fiber) {
  if (getNearestMountedFiber(fiber) !== fiber) {
    throw new Error('Unable to find node on an unmounted component.');
  }
}

export function findCurrentFiberUsingSlowPath(fiber) {
  var alternate = fiber.alternate;

  if (!alternate) {
    // If there is no alternate, then we only need to check if it is mounted.
    var nearestMounted = getNearestMountedFiber(fiber);

    if (nearestMounted === null) {
      throw new Error('Unable to find node on an unmounted component.');
    }

    if (nearestMounted !== fiber) {
      return null;
    }

    return fiber;
  } // If we have two possible branches, we'll walk backwards up to the root
  // to see what path the root points to. On the way we may hit one of the
  // special cases and we'll deal with them.


  var a = fiber;
  var b = alternate;

  while (true) {
    var parentA = a.return;

    if (parentA === null) {
      // We're at the root.
      break;
    }

    var parentB = parentA.alternate;

    if (parentB === null) {
      // There is no alternate. This is an unusual case. Currently, it only
      // happens when a Suspense component is hidden. An extra fragment fiber
      // is inserted in between the Suspense fiber and its children. Skip
      // over this extra fragment fiber and proceed to the next parent.
      var nextParent = parentA.return;

      if (nextParent !== null) {
        a = b = nextParent;
        continue;
      } // If there's no parent, we're at the root.


      break;
    } // If both copies of the parent fiber point to the same child, we can
    // assume that the child is current. This happens when we bailout on low
    // priority: the bailed out fiber's child reuses the current child.


    if (parentA.child === parentB.child) {
      var child = parentA.child;

      while (child) {
        if (child === a) {
          // We've determined that A is the current branch.
          assertIsMounted(parentA);
          return fiber;
        }

        if (child === b) {
          // We've determined that B is the current branch.
          assertIsMounted(parentA);
          return alternate;
        }

        child = child.sibling;
      } // We should never have an alternate for any mounting node. So the only
      // way this could possibly happen is if this was unmounted, if at all.


      throw new Error('Unable to find node on an unmounted component.');
    }

    if (a.return !== b.return) {
      // The return pointer of A and the return pointer of B point to different
      // fibers. We assume that return pointers never criss-cross, so A must
      // belong to the child set of A.return, and B must belong to the child
      // set of B.return.
      a = parentA;
      b = parentB;
    } else {
      // The return pointers point to the same fiber. We'll have to use the
      // default, slow path: scan the child sets of each parent alternate to see
      // which child belongs to which set.
      //
      // Search parent A's child set
      var didFindChild = false;
      var _child = parentA.child;

      while (_child) {
        if (_child === a) {
          didFindChild = true;
          a = parentA;
          b = parentB;
          break;
        }

        if (_child === b) {
          didFindChild = true;
          b = parentA;
          a = parentB;
          break;
        }

        _child = _child.sibling;
      }

      if (!didFindChild) {
        // Search parent B's child set
        _child = parentB.child;

        while (_child) {
          if (_child === a) {
            didFindChild = true;
            a = parentB;
            b = parentA;
            break;
          }

          if (_child === b) {
            didFindChild = true;
            b = parentB;
            a = parentA;
            break;
          }

          _child = _child.sibling;
        }

        if (!didFindChild) {
          throw new Error('Child was not found in either parent set. This indicates a bug ' + 'in React related to the return pointer. Please file an issue.');
        }
      }
    }

    if (a.alternate !== b) {
      throw new Error("Return fibers should always be each others' alternates. " + 'This error is likely caused by a bug in React. Please file an issue.');
    }
  } // If the root is not a host container, we're in a disconnected tree. I.e.
  // unmounted.


  if (a.tag !== HostRoot) {
    throw new Error('Unable to find node on an unmounted component.');
  }

  if (a.stateNode.current === a) {
    // We've determined that A is the current branch.
    return fiber;
  } // Otherwise B has to be current branch.


  return alternate;
}
export function findCurrentHostFiber(parent) {
  var currentParent = findCurrentFiberUsingSlowPath(parent);
  return currentParent !== null ? findCurrentHostFiberImpl(currentParent) : null;
}

function findCurrentHostFiberImpl(node) {
  // Next we'll drill down this component to find the first HostComponent/Text.
  var tag = node.tag;

  if (tag === HostComponent || tag === HostHoistable || tag === HostSingleton || tag === HostText) {
    return node;
  }

  var child = node.child;

  while (child !== null) {
    var match = findCurrentHostFiberImpl(child);

    if (match !== null) {
      return match;
    }

    child = child.sibling;
  }

  return null;
}

export function findCurrentHostFiberWithNoPortals(parent) {
  var currentParent = findCurrentFiberUsingSlowPath(parent);
  return currentParent !== null ? findCurrentHostFiberWithNoPortalsImpl(currentParent) : null;
}

function findCurrentHostFiberWithNoPortalsImpl(node) {
  // Next we'll drill down this component to find the first HostComponent/Text.
  var tag = node.tag;

  if (tag === HostComponent || tag === HostHoistable || tag === HostSingleton || tag === HostText) {
    return node;
  }

  var child = node.child;

  while (child !== null) {
    if (child.tag !== HostPortal) {
      var match = findCurrentHostFiberWithNoPortalsImpl(child);

      if (match !== null) {
        return match;
      }
    }

    child = child.sibling;
  }

  return null;
}

export function isFiberSuspenseAndTimedOut(fiber) {
  var memoizedState = fiber.memoizedState;
  return fiber.tag === SuspenseComponent && memoizedState !== null && memoizedState.dehydrated === null;
}
export function doesFiberContain(parentFiber, childFiber) {
  var node = childFiber;
  var parentFiberAlternate = parentFiber.alternate;

  while (node !== null) {
    if (node === parentFiber || node === parentFiberAlternate) {
      return true;
    }

    node = node.return;
  }

  return false;
}
export function traverseFragmentInstance(fragmentFiber, fn, a, b, c) {
  traverseVisibleHostChildren(fragmentFiber.child, false, fn, a, b, c);
}
export function traverseFragmentInstanceDeeply(fragmentFiber, fn, a, b, c) {
  traverseVisibleHostChildren(fragmentFiber.child, true, fn, a, b, c);
}

function traverseVisibleHostChildren(child, searchWithinHosts, fn, a, b, c) {
  while (child !== null) {
    if (child.tag === HostComponent && fn(child, a, b, c)) {
      return true;
    } else if (child.tag === OffscreenComponent && child.memoizedState !== null) {// Skip hidden subtrees
    } else {
      if ((searchWithinHosts || child.tag !== HostComponent) && traverseVisibleHostChildren(child.child, searchWithinHosts, fn, a, b, c)) {
        return true;
      }
    }

    child = child.sibling;
  }

  return false;
}

export function getFragmentParentHostFiber(fiber) {
  var parent = fiber.return;

  while (parent !== null) {
    if (parent.tag === HostRoot || parent.tag === HostComponent) {
      return parent;
    }

    parent = parent.return;
  }

  return null;
}
export function getInstanceFromHostFiber(fiber) {
  switch (fiber.tag) {
    case HostComponent:
      return fiber.stateNode;

    case HostRoot:
      return fiber.stateNode.containerInfo;

    default:
      throw new Error('Expected to find a host node. This is a bug in React.');
  }
}
var searchTarget = null;
var searchBoundary = null;

function pushSearchTarget(target) {
  searchTarget = target;
}

function popSearchTarget() {
  return searchTarget;
}

function pushSearchBoundary(value) {
  searchBoundary = value;
}

function popSearchBoundary() {
  return searchBoundary;
}

export function getNextSiblingHostFiber(fiber) {
  traverseVisibleHostChildren(fiber.sibling, false, findNextSibling);
  var sibling = popSearchTarget();
  pushSearchTarget(null);
  return sibling;
}

function findNextSibling(child) {
  pushSearchTarget(child);
  return true;
}

export function isFiberContainedBy(maybeChild, maybeParent) {
  var parent = maybeParent.return;

  if (parent === maybeChild || parent === maybeChild.alternate) {
    return true;
  }

  while (parent !== null && parent !== maybeChild) {
    if ((parent.tag === HostComponent || parent.tag === HostRoot) && (parent.return === maybeChild || parent.return === maybeChild.alternate)) {
      return true;
    }

    parent = parent.return;
  }

  return false;
}
export function isFiberPreceding(fiber, otherFiber) {
  var commonAncestor = getLowestCommonAncestor(fiber, otherFiber, getParentForFragmentAncestors);

  if (commonAncestor === null) {
    return false;
  }

  traverseVisibleHostChildren(commonAncestor, true, isFiberPrecedingCheck, otherFiber, fiber);
  var target = popSearchTarget();
  pushSearchTarget(null);
  return target !== null;
}

function isFiberPrecedingCheck(child, target, boundary) {
  if (child === boundary) {
    return true;
  }

  if (child === target) {
    pushSearchTarget(child);
    return true;
  }

  return false;
}

export function isFiberFollowing(fiber, otherFiber) {
  var commonAncestor = getLowestCommonAncestor(fiber, otherFiber, getParentForFragmentAncestors);

  if (commonAncestor === null) {
    return false;
  }

  traverseVisibleHostChildren(commonAncestor, true, isFiberFollowingCheck, otherFiber, fiber);
  var target = popSearchTarget();
  pushSearchTarget(null);
  pushSearchBoundary(null);
  return target !== null;
}

function isFiberFollowingCheck(child, target, boundary) {
  if (child === boundary) {
    pushSearchBoundary(child);
    return false;
  }

  if (child === target) {
    // The target is only following if we already found the boundary.
    if (popSearchBoundary() !== null) {
      pushSearchTarget(child);
    }

    return true;
  }

  return false;
}

function getParentForFragmentAncestors(inst) {
  if (inst === null) {
    return null;
  }

  do {
    inst = inst === null ? null : inst.return;
  } while (inst && inst.tag !== HostComponent && inst.tag !== HostSingleton && inst.tag !== HostRoot);

  if (inst) {
    return inst;
  }

  return null;
}
/**
 * Return the lowest common ancestor of A and B, or null if they are in
 * different trees.
 */


export function getLowestCommonAncestor(instA, instB, getParent) {
  var nodeA = instA;
  var nodeB = instB;
  var depthA = 0;

  for (var tempA = nodeA; tempA; tempA = getParent(tempA)) {
    depthA++;
  }

  var depthB = 0;

  for (var tempB = nodeB; tempB; tempB = getParent(tempB)) {
    depthB++;
  } // If A is deeper, crawl up.


  while (depthA - depthB > 0) {
    nodeA = getParent(nodeA);
    depthA--;
  } // If B is deeper, crawl up.


  while (depthB - depthA > 0) {
    nodeB = getParent(nodeB);
    depthB--;
  } // Walk in lockstep until we find a match.


  var depth = depthA;

  while (depth--) {
    if (nodeA === nodeB || nodeB !== null && nodeA === nodeB.alternate) {
      return nodeA;
    }

    nodeA = getParent(nodeA);
    nodeB = getParent(nodeB);
  }

  return null;
}