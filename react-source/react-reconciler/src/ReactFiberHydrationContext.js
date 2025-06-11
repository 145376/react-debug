/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { HostComponent, HostSingleton, HostRoot, SuspenseComponent, ActivityComponent } from './ReactWorkTags';
import { favorSafetyOverHydrationPerf } from 'shared/ReactFeatureFlags';
import { createCapturedValueAtFiber } from './ReactCapturedValue';
import { createFiberFromDehydratedFragment } from './ReactFiber';
import { shouldSetTextContent, supportsHydration, supportsSingletons, getNextHydratableSibling, getNextHydratableSiblingAfterSingleton, getFirstHydratableChild, getFirstHydratableChildWithinContainer, getFirstHydratableChildWithinActivityInstance, getFirstHydratableChildWithinSuspenseInstance, getFirstHydratableChildWithinSingleton, hydrateInstance, diffHydratedPropsForDevWarnings, describeHydratableInstanceForDevWarnings, hydrateTextInstance, diffHydratedTextForDevWarnings, hydrateActivityInstance, hydrateSuspenseInstance, getNextHydratableInstanceAfterActivityInstance, getNextHydratableInstanceAfterSuspenseInstance, shouldDeleteUnhydratedTailInstances, resolveSingletonInstance, canHydrateInstance, canHydrateTextInstance, canHydrateActivityInstance, canHydrateSuspenseInstance, canHydrateFormStateMarker, isFormStateMarkerMatching, validateHydratableInstance, validateHydratableTextInstance } from './ReactFiberConfig';
import { OffscreenLane } from './ReactFiberLane';
import { getSuspendedTreeContext, restoreSuspendedTreeContext } from './ReactFiberTreeContext';
import { queueRecoverableErrors } from './ReactFiberWorkLoop';
import { getRootHostContainer, getHostContext } from './ReactFiberHostContext';
import { describeDiff } from './ReactFiberHydrationDiffs';
import { runWithFiberInDEV } from './ReactCurrentFiber'; // The deepest Fiber on the stack involved in a hydration context.
// This may have been an insertion or a hydration.

var hydrationParentFiber = null;
var nextHydratableInstance = null;
var isHydrating = false; // This flag allows for warning supression when we expect there to be mismatches
// due to earlier mismatches or a suspended fiber.

var didSuspendOrErrorDEV = false; // Hydration differences found that haven't yet been logged.

var hydrationDiffRootDEV = null; // Hydration errors that were thrown inside this boundary

var hydrationErrors = null;
var rootOrSingletonContext = false; // Builds a common ancestor tree from the root down for collecting diffs.

function buildHydrationDiffNode(fiber, distanceFromLeaf) {
  if (fiber.return === null) {
    // We're at the root.
    if (hydrationDiffRootDEV === null) {
      hydrationDiffRootDEV = {
        fiber: fiber,
        children: [],
        serverProps: undefined,
        serverTail: [],
        distanceFromLeaf: distanceFromLeaf
      };
    } else if (hydrationDiffRootDEV.fiber !== fiber) {
      throw new Error('Saw multiple hydration diff roots in a pass. This is a bug in React.');
    } else if (hydrationDiffRootDEV.distanceFromLeaf > distanceFromLeaf) {
      hydrationDiffRootDEV.distanceFromLeaf = distanceFromLeaf;
    }

    return hydrationDiffRootDEV;
  }

  var siblings = buildHydrationDiffNode(fiber.return, distanceFromLeaf + 1).children; // The same node may already exist in the parent. Since we currently always render depth first
  // and rerender if we suspend or terminate early, if a shared ancestor was added we should still
  // be inside of that shared ancestor which means it was the last one to be added. If this changes
  // we may have to scan the whole set.

  if (siblings.length > 0 && siblings[siblings.length - 1].fiber === fiber) {
    var existing = siblings[siblings.length - 1];

    if (existing.distanceFromLeaf > distanceFromLeaf) {
      existing.distanceFromLeaf = distanceFromLeaf;
    }

    return existing;
  }

  var newNode = {
    fiber: fiber,
    children: [],
    serverProps: undefined,
    serverTail: [],
    distanceFromLeaf: distanceFromLeaf
  };
  siblings.push(newNode);
  return newNode;
}

function warnIfHydrating() {
  if (__DEV__) {
    if (isHydrating) {
      console.error('We should not be hydrating here. This is a bug in React. Please file a bug.');
    }
  }
}

export function markDidThrowWhileHydratingDEV() {
  if (__DEV__) {
    didSuspendOrErrorDEV = true;
  }
}

function enterHydrationState(fiber) {
  if (!supportsHydration) {
    return false;
  }

  var parentInstance = fiber.stateNode.containerInfo;
  nextHydratableInstance = getFirstHydratableChildWithinContainer(parentInstance);
  hydrationParentFiber = fiber;
  isHydrating = true;
  hydrationErrors = null;
  didSuspendOrErrorDEV = false;
  hydrationDiffRootDEV = null;
  rootOrSingletonContext = true;
  return true;
}

function reenterHydrationStateFromDehydratedActivityInstance(fiber, activityInstance, treeContext) {
  if (!supportsHydration) {
    return false;
  }

  nextHydratableInstance = getFirstHydratableChildWithinActivityInstance(activityInstance);
  hydrationParentFiber = fiber;
  isHydrating = true;
  hydrationErrors = null;
  didSuspendOrErrorDEV = false;
  hydrationDiffRootDEV = null;
  rootOrSingletonContext = false;

  if (treeContext !== null) {
    restoreSuspendedTreeContext(fiber, treeContext);
  }

  return true;
}

function reenterHydrationStateFromDehydratedSuspenseInstance(fiber, suspenseInstance, treeContext) {
  if (!supportsHydration) {
    return false;
  }

  nextHydratableInstance = getFirstHydratableChildWithinSuspenseInstance(suspenseInstance);
  hydrationParentFiber = fiber;
  isHydrating = true;
  hydrationErrors = null;
  didSuspendOrErrorDEV = false;
  hydrationDiffRootDEV = null;
  rootOrSingletonContext = false;

  if (treeContext !== null) {
    restoreSuspendedTreeContext(fiber, treeContext);
  }

  return true;
}

function warnNonHydratedInstance(fiber, rejectedCandidate) {
  if (__DEV__) {
    if (didSuspendOrErrorDEV) {
      // Inside a boundary that already suspended. We're currently rendering the
      // siblings of a suspended node. The mismatch may be due to the missing
      // data, so it's probably a false positive.
      return;
    } // Add this fiber to the diff tree.


    var diffNode = buildHydrationDiffNode(fiber, 0); // We use null as a signal that there was no node to match.

    diffNode.serverProps = null;

    if (rejectedCandidate !== null) {
      var description = describeHydratableInstanceForDevWarnings(rejectedCandidate);
      diffNode.serverTail.push(description);
    }
  }
}

function tryHydrateInstance(fiber, nextInstance, hostContext) {
  // fiber is a HostComponent Fiber
  var instance = canHydrateInstance(nextInstance, fiber.type, fiber.pendingProps, rootOrSingletonContext);

  if (instance !== null) {
    fiber.stateNode = instance;

    if (__DEV__) {
      if (!didSuspendOrErrorDEV) {
        var differences = diffHydratedPropsForDevWarnings(instance, fiber.type, fiber.pendingProps, hostContext);

        if (differences !== null) {
          var diffNode = buildHydrationDiffNode(fiber, 0);
          diffNode.serverProps = differences;
        }
      }
    }

    hydrationParentFiber = fiber;
    nextHydratableInstance = getFirstHydratableChild(instance);
    rootOrSingletonContext = false;
    return true;
  }

  return false;
}

function tryHydrateText(fiber, nextInstance) {
  // fiber is a HostText Fiber
  var text = fiber.pendingProps;
  var textInstance = canHydrateTextInstance(nextInstance, text, rootOrSingletonContext);

  if (textInstance !== null) {
    fiber.stateNode = textInstance;
    hydrationParentFiber = fiber; // Text Instances don't have children so there's nothing to hydrate.

    nextHydratableInstance = null;
    return true;
  }

  return false;
}

function tryHydrateActivity(fiber, nextInstance) {
  // fiber is a ActivityComponent Fiber
  var activityInstance = canHydrateActivityInstance(nextInstance, rootOrSingletonContext);

  if (activityInstance !== null) {
    var activityState = {
      dehydrated: activityInstance,
      treeContext: getSuspendedTreeContext(),
      retryLane: OffscreenLane,
      hydrationErrors: null
    };
    fiber.memoizedState = activityState; // Store the dehydrated fragment as a child fiber.
    // This simplifies the code for getHostSibling and deleting nodes,
    // since it doesn't have to consider all Suspense boundaries and
    // check if they're dehydrated ones or not.

    var dehydratedFragment = createFiberFromDehydratedFragment(activityInstance);
    dehydratedFragment.return = fiber;
    fiber.child = dehydratedFragment;
    hydrationParentFiber = fiber; // While an Activity Instance does have children, we won't step into
    // it during the first pass. Instead, we'll reenter it later.

    nextHydratableInstance = null;
  }

  return activityInstance;
}

function tryHydrateSuspense(fiber, nextInstance) {
  // fiber is a SuspenseComponent Fiber
  var suspenseInstance = canHydrateSuspenseInstance(nextInstance, rootOrSingletonContext);

  if (suspenseInstance !== null) {
    var suspenseState = {
      dehydrated: suspenseInstance,
      treeContext: getSuspendedTreeContext(),
      retryLane: OffscreenLane,
      hydrationErrors: null
    };
    fiber.memoizedState = suspenseState; // Store the dehydrated fragment as a child fiber.
    // This simplifies the code for getHostSibling and deleting nodes,
    // since it doesn't have to consider all Suspense boundaries and
    // check if they're dehydrated ones or not.

    var dehydratedFragment = createFiberFromDehydratedFragment(suspenseInstance);
    dehydratedFragment.return = fiber;
    fiber.child = dehydratedFragment;
    hydrationParentFiber = fiber; // While a Suspense Instance does have children, we won't step into
    // it during the first pass. Instead, we'll reenter it later.

    nextHydratableInstance = null;
  }

  return suspenseInstance;
}

export var HydrationMismatchException = new Error('Hydration Mismatch Exception: This is not a real error, and should not leak into ' + "userspace. If you're seeing this, it's likely a bug in React.");

function throwOnHydrationMismatch(fiber) {
  var fromText = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var diff = '';

  if (__DEV__) {
    // Consume the diff root for this mismatch.
    // Any other errors will get their own diffs.
    var diffRoot = hydrationDiffRootDEV;

    if (diffRoot !== null) {
      hydrationDiffRootDEV = null;
      diff = describeDiff(diffRoot);
    }
  }

  var error = new Error("Hydration failed because the server rendered " + (fromText ? 'text' : 'HTML') + " didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:\n" + '\n' + "- A server/client branch `if (typeof window !== 'undefined')`.\n" + "- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.\n" + "- Date formatting in a user's locale which doesn't match the server.\n" + '- External changing data without sending a snapshot of it along with the HTML.\n' + '- Invalid HTML tag nesting.\n' + '\n' + 'It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.\n' + '\n' + 'https://react.dev/link/hydration-mismatch' + diff);
  queueHydrationError(createCapturedValueAtFiber(error, fiber));
  throw HydrationMismatchException;
}

function claimHydratableSingleton(fiber) {
  if (supportsSingletons) {
    if (!isHydrating) {
      return;
    }

    var currentRootContainer = getRootHostContainer();
    var currentHostContext = getHostContext();
    var instance = fiber.stateNode = resolveSingletonInstance(fiber.type, fiber.pendingProps, currentRootContainer, currentHostContext, false);

    if (__DEV__) {
      if (!didSuspendOrErrorDEV) {
        var differences = diffHydratedPropsForDevWarnings(instance, fiber.type, fiber.pendingProps, currentHostContext);

        if (differences !== null) {
          var diffNode = buildHydrationDiffNode(fiber, 0);
          diffNode.serverProps = differences;
        }
      }
    }

    hydrationParentFiber = fiber;
    rootOrSingletonContext = true;
    nextHydratableInstance = getFirstHydratableChildWithinSingleton(fiber.type, instance, nextHydratableInstance);
  }
}

function tryToClaimNextHydratableInstance(fiber) {
  if (!isHydrating) {
    return;
  } // Validate that this is ok to render here before any mismatches.


  var currentHostContext = getHostContext();
  var shouldKeepWarning = validateHydratableInstance(fiber.type, fiber.pendingProps, currentHostContext);
  var nextInstance = nextHydratableInstance;

  if (!nextInstance || !tryHydrateInstance(fiber, nextInstance, currentHostContext)) {
    if (shouldKeepWarning) {
      warnNonHydratedInstance(fiber, nextInstance);
    }

    throwOnHydrationMismatch(fiber);
  }
}

function tryToClaimNextHydratableTextInstance(fiber) {
  if (!isHydrating) {
    return;
  }

  var text = fiber.pendingProps;
  var shouldKeepWarning = true; // Validate that this is ok to render here before any mismatches.

  var currentHostContext = getHostContext();
  shouldKeepWarning = validateHydratableTextInstance(text, currentHostContext);
  var nextInstance = nextHydratableInstance;

  if (!nextInstance || !tryHydrateText(fiber, nextInstance)) {
    if (shouldKeepWarning) {
      warnNonHydratedInstance(fiber, nextInstance);
    }

    throwOnHydrationMismatch(fiber);
  }
}

function claimNextHydratableActivityInstance(fiber) {
  var nextInstance = nextHydratableInstance;
  var activityInstance = nextInstance ? tryHydrateActivity(fiber, nextInstance) : null;

  if (activityInstance === null) {
    warnNonHydratedInstance(fiber, nextInstance);
    throw throwOnHydrationMismatch(fiber);
  }

  return activityInstance;
}

function claimNextHydratableSuspenseInstance(fiber) {
  var nextInstance = nextHydratableInstance;
  var suspenseInstance = nextInstance ? tryHydrateSuspense(fiber, nextInstance) : null;

  if (suspenseInstance === null) {
    warnNonHydratedInstance(fiber, nextInstance);
    throw throwOnHydrationMismatch(fiber);
  }

  return suspenseInstance;
}

export function tryToClaimNextHydratableFormMarkerInstance(fiber) {
  if (!isHydrating) {
    return false;
  }

  if (nextHydratableInstance) {
    var markerInstance = canHydrateFormStateMarker(nextHydratableInstance, rootOrSingletonContext);

    if (markerInstance) {
      // Found the marker instance.
      nextHydratableInstance = getNextHydratableSibling(markerInstance); // Return true if this marker instance should use the state passed
      // to hydrateRoot.
      // TODO: As an optimization, Fizz should only emit these markers if form
      // state is passed at the root.

      return isFormStateMarkerMatching(markerInstance);
    }
  } // Should have found a marker instance. Throw an error to trigger client
  // rendering. We don't bother to check if we're in a concurrent root because
  // useActionState is a new API, so backwards compat is not an issue.


  throwOnHydrationMismatch(fiber);
  return false;
}

function prepareToHydrateHostInstance(fiber, hostContext) {
  if (!supportsHydration) {
    throw new Error('Expected prepareToHydrateHostInstance() to never be called. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  }

  var instance = fiber.stateNode;
  var didHydrate = hydrateInstance(instance, fiber.type, fiber.memoizedProps, hostContext, fiber);

  if (!didHydrate && favorSafetyOverHydrationPerf) {
    throwOnHydrationMismatch(fiber, true);
  }
}

function prepareToHydrateHostTextInstance(fiber) {
  if (!supportsHydration) {
    throw new Error('Expected prepareToHydrateHostTextInstance() to never be called. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  }

  var textInstance = fiber.stateNode;
  var textContent = fiber.memoizedProps;
  var shouldWarnIfMismatchDev = !didSuspendOrErrorDEV;
  var parentProps = null; // We assume that prepareToHydrateHostTextInstance is called in a context where the
  // hydration parent is the parent host component of this host text.

  var returnFiber = hydrationParentFiber;

  if (returnFiber !== null) {
    switch (returnFiber.tag) {
      case HostRoot:
        {
          if (__DEV__) {
            if (shouldWarnIfMismatchDev) {
              var difference = diffHydratedTextForDevWarnings(textInstance, textContent, parentProps);

              if (difference !== null) {
                var diffNode = buildHydrationDiffNode(fiber, 0);
                diffNode.serverProps = difference;
              }
            }
          }

          break;
        }

      case HostSingleton:
      case HostComponent:
        {
          parentProps = returnFiber.memoizedProps;

          if (__DEV__) {
            if (shouldWarnIfMismatchDev) {
              var _difference = diffHydratedTextForDevWarnings(textInstance, textContent, parentProps);

              if (_difference !== null) {
                var _diffNode = buildHydrationDiffNode(fiber, 0);

                _diffNode.serverProps = _difference;
              }
            }
          }

          break;
        }
    } // TODO: What if it's a SuspenseInstance?

  }

  var didHydrate = hydrateTextInstance(textInstance, textContent, fiber, parentProps);

  if (!didHydrate && favorSafetyOverHydrationPerf) {
    throwOnHydrationMismatch(fiber, true);
  }
}

function prepareToHydrateHostActivityInstance(fiber) {
  if (!supportsHydration) {
    throw new Error('Expected prepareToHydrateHostActivityInstance() to never be called. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  }

  var activityState = fiber.memoizedState;
  var activityInstance = activityState !== null ? activityState.dehydrated : null;

  if (!activityInstance) {
    throw new Error('Expected to have a hydrated activity instance. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  }

  hydrateActivityInstance(activityInstance, fiber);
}

function prepareToHydrateHostSuspenseInstance(fiber) {
  if (!supportsHydration) {
    throw new Error('Expected prepareToHydrateHostSuspenseInstance() to never be called. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  }

  var suspenseState = fiber.memoizedState;
  var suspenseInstance = suspenseState !== null ? suspenseState.dehydrated : null;

  if (!suspenseInstance) {
    throw new Error('Expected to have a hydrated suspense instance. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  }

  hydrateSuspenseInstance(suspenseInstance, fiber);
}

function skipPastDehydratedActivityInstance(fiber) {
  var activityState = fiber.memoizedState;
  var activityInstance = activityState !== null ? activityState.dehydrated : null;

  if (!activityInstance) {
    throw new Error('Expected to have a hydrated suspense instance. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  }

  return getNextHydratableInstanceAfterActivityInstance(activityInstance);
}

function skipPastDehydratedSuspenseInstance(fiber) {
  if (!supportsHydration) {
    throw new Error('Expected skipPastDehydratedSuspenseInstance() to never be called. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  }

  var suspenseState = fiber.memoizedState;
  var suspenseInstance = suspenseState !== null ? suspenseState.dehydrated : null;

  if (!suspenseInstance) {
    throw new Error('Expected to have a hydrated suspense instance. ' + 'This error is likely caused by a bug in React. Please file an issue.');
  }

  return getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance);
}

function popToNextHostParent(fiber) {
  hydrationParentFiber = fiber.return;

  while (hydrationParentFiber) {
    switch (hydrationParentFiber.tag) {
      case HostComponent:
      case ActivityComponent:
      case SuspenseComponent:
        rootOrSingletonContext = false;
        return;

      case HostSingleton:
      case HostRoot:
        rootOrSingletonContext = true;
        return;

      default:
        hydrationParentFiber = hydrationParentFiber.return;
    }
  }
}

function popHydrationState(fiber) {
  if (!supportsHydration) {
    return false;
  }

  if (fiber !== hydrationParentFiber) {
    // We're deeper than the current hydration context, inside an inserted
    // tree.
    return false;
  }

  if (!isHydrating) {
    // If we're not currently hydrating but we're in a hydration context, then
    // we were an insertion and now need to pop up reenter hydration of our
    // siblings.
    popToNextHostParent(fiber);
    isHydrating = true;
    return false;
  }

  var tag = fiber.tag;

  if (supportsSingletons) {
    // With float we never clear the Root, or Singleton instances. We also do not clear Instances
    // that have singleton text content
    if (tag !== HostRoot && tag !== HostSingleton && !(tag === HostComponent && (!shouldDeleteUnhydratedTailInstances(fiber.type) || shouldSetTextContent(fiber.type, fiber.memoizedProps)))) {
      var nextInstance = nextHydratableInstance;

      if (nextInstance) {
        warnIfUnhydratedTailNodes(fiber);
        throwOnHydrationMismatch(fiber);
      }
    }
  } else {
    // If we have any remaining hydratable nodes, we need to delete them now.
    // We only do this deeper than head and body since they tend to have random
    // other nodes in them. We also ignore components with pure text content in
    // side of them. We also don't delete anything inside the root container.
    if (tag !== HostRoot && (tag !== HostComponent || shouldDeleteUnhydratedTailInstances(fiber.type) && !shouldSetTextContent(fiber.type, fiber.memoizedProps))) {
      var _nextInstance = nextHydratableInstance;

      if (_nextInstance) {
        warnIfUnhydratedTailNodes(fiber);
        throwOnHydrationMismatch(fiber);
      }
    }
  }

  popToNextHostParent(fiber);

  if (tag === SuspenseComponent) {
    nextHydratableInstance = skipPastDehydratedSuspenseInstance(fiber);
  } else if (tag === ActivityComponent) {
    nextHydratableInstance = skipPastDehydratedActivityInstance(fiber);
  } else if (supportsSingletons && tag === HostSingleton) {
    nextHydratableInstance = getNextHydratableSiblingAfterSingleton(fiber.type, nextHydratableInstance);
  } else {
    nextHydratableInstance = hydrationParentFiber ? getNextHydratableSibling(fiber.stateNode) : null;
  }

  return true;
}

function warnIfUnhydratedTailNodes(fiber) {
  if (__DEV__) {
    var nextInstance = nextHydratableInstance;

    while (nextInstance) {
      var diffNode = buildHydrationDiffNode(fiber, 0);
      var description = describeHydratableInstanceForDevWarnings(nextInstance);
      diffNode.serverTail.push(description);

      if (description.type === 'Suspense') {
        var suspenseInstance = nextInstance;
        nextInstance = getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance);
      } else {
        nextInstance = getNextHydratableSibling(nextInstance);
      }
    }
  }
}

function resetHydrationState() {
  if (!supportsHydration) {
    return;
  }

  hydrationParentFiber = null;
  nextHydratableInstance = null;
  isHydrating = false;
  didSuspendOrErrorDEV = false;
}

export function upgradeHydrationErrorsToRecoverable() {
  var queuedErrors = hydrationErrors;

  if (queuedErrors !== null) {
    // Successfully completed a forced client render. The errors that occurred
    // during the hydration attempt are now recovered. We will log them in
    // commit phase, once the entire tree has finished.
    queueRecoverableErrors(queuedErrors);
    hydrationErrors = null;
  }

  return queuedErrors;
}

function getIsHydrating() {
  return isHydrating;
}

export function queueHydrationError(error) {
  if (hydrationErrors === null) {
    hydrationErrors = [error];
  } else {
    hydrationErrors.push(error);
  }
}
export function emitPendingHydrationWarnings() {
  if (__DEV__) {
    // If we haven't yet thrown any hydration errors by the time we reach the end we've successfully
    // hydrated, however, we might still have DEV-only mismatches that we log now.
    var diffRoot = hydrationDiffRootDEV;

    if (diffRoot !== null) {
      hydrationDiffRootDEV = null;
      var diff = describeDiff(diffRoot); // Just pick the DFS-first leaf as the owner.
      // Should be good enough since most warnings only have a single error.

      var diffOwner = diffRoot;

      while (diffOwner.children.length > 0) {
        diffOwner = diffOwner.children[0];
      }

      runWithFiberInDEV(diffOwner.fiber, function () {
        console.error("A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. " + 'This can happen if a SSR-ed Client Component used:\n' + '\n' + "- A server/client branch `if (typeof window !== 'undefined')`.\n" + "- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.\n" + "- Date formatting in a user's locale which doesn't match the server.\n" + '- External changing data without sending a snapshot of it along with the HTML.\n' + '- Invalid HTML tag nesting.\n' + '\n' + 'It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.\n' + '\n' + '%s%s', 'https://react.dev/link/hydration-mismatch', diff);
      });
    }
  }
}
export { warnIfHydrating, enterHydrationState, getIsHydrating, reenterHydrationStateFromDehydratedActivityInstance, reenterHydrationStateFromDehydratedSuspenseInstance, resetHydrationState, claimHydratableSingleton, tryToClaimNextHydratableInstance, tryToClaimNextHydratableTextInstance, claimNextHydratableActivityInstance, claimNextHydratableSuspenseInstance, prepareToHydrateHostInstance, prepareToHydrateHostTextInstance, prepareToHydrateHostActivityInstance, prepareToHydrateHostSuspenseInstance, popHydrationState };