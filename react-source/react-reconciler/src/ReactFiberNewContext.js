/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { isPrimaryRenderer, HostTransitionContext } from './ReactFiberConfig';
import { createCursor, push, pop } from './ReactFiberStack';
import { ContextProvider, DehydratedFragment } from './ReactWorkTags';
import { NoLanes, isSubsetOfLanes, mergeLanes } from './ReactFiberLane';
import { NoFlags, DidPropagateContext, NeedsPropagation } from './ReactFiberFlags';
import is from 'shared/objectIs';
import { enableRenderableContext } from 'shared/ReactFeatureFlags';
import { getHostTransitionProvider } from './ReactFiberHostContext';
var valueCursor = createCursor(null);
var rendererCursorDEV;

if (__DEV__) {
  rendererCursorDEV = createCursor(null);
}

var renderer2CursorDEV;

if (__DEV__) {
  renderer2CursorDEV = createCursor(null);
}

var rendererSigil;

if (__DEV__) {
  // Use this to detect multiple renderers using the same context
  rendererSigil = {};
}

var currentlyRenderingFiber = null;
var lastContextDependency = null;
var isDisallowedContextReadInDEV = false;
export function resetContextDependencies() {
  // This is called right before React yields execution, to ensure `readContext`
  // cannot be called outside the render phase.
  currentlyRenderingFiber = null;
  lastContextDependency = null;

  if (__DEV__) {
    isDisallowedContextReadInDEV = false;
  }
}
export function enterDisallowedContextReadInDEV() {
  if (__DEV__) {
    isDisallowedContextReadInDEV = true;
  }
}
export function exitDisallowedContextReadInDEV() {
  if (__DEV__) {
    isDisallowedContextReadInDEV = false;
  }
}
export function pushProvider(providerFiber, context, nextValue) {
  if (isPrimaryRenderer) {
    push(valueCursor, context._currentValue, providerFiber);
    context._currentValue = nextValue;

    if (__DEV__) {
      push(rendererCursorDEV, context._currentRenderer, providerFiber);

      if (context._currentRenderer !== undefined && context._currentRenderer !== null && context._currentRenderer !== rendererSigil) {
        console.error('Detected multiple renderers concurrently rendering the ' + 'same context provider. This is currently unsupported.');
      }

      context._currentRenderer = rendererSigil;
    }
  } else {
    push(valueCursor, context._currentValue2, providerFiber);
    context._currentValue2 = nextValue;

    if (__DEV__) {
      push(renderer2CursorDEV, context._currentRenderer2, providerFiber);

      if (context._currentRenderer2 !== undefined && context._currentRenderer2 !== null && context._currentRenderer2 !== rendererSigil) {
        console.error('Detected multiple renderers concurrently rendering the ' + 'same context provider. This is currently unsupported.');
      }

      context._currentRenderer2 = rendererSigil;
    }
  }
}
export function popProvider(context, providerFiber) {
  var currentValue = valueCursor.current;

  if (isPrimaryRenderer) {
    context._currentValue = currentValue;

    if (__DEV__) {
      var currentRenderer = rendererCursorDEV.current;
      pop(rendererCursorDEV, providerFiber);
      context._currentRenderer = currentRenderer;
    }
  } else {
    context._currentValue2 = currentValue;

    if (__DEV__) {
      var currentRenderer2 = renderer2CursorDEV.current;
      pop(renderer2CursorDEV, providerFiber);
      context._currentRenderer2 = currentRenderer2;
    }
  }

  pop(valueCursor, providerFiber);
}
export function scheduleContextWorkOnParentPath(parent, renderLanes, propagationRoot) {
  // Update the child lanes of all the ancestors, including the alternates.
  var node = parent;

  while (node !== null) {
    var alternate = node.alternate;

    if (!isSubsetOfLanes(node.childLanes, renderLanes)) {
      node.childLanes = mergeLanes(node.childLanes, renderLanes);

      if (alternate !== null) {
        alternate.childLanes = mergeLanes(alternate.childLanes, renderLanes);
      }
    } else if (alternate !== null && !isSubsetOfLanes(alternate.childLanes, renderLanes)) {
      alternate.childLanes = mergeLanes(alternate.childLanes, renderLanes);
    } else {// Neither alternate was updated.
      // Normally, this would mean that the rest of the
      // ancestor path already has sufficient priority.
      // However, this is not necessarily true inside offscreen
      // or fallback trees because childLanes may be inconsistent
      // with the surroundings. This is why we continue the loop.
    }

    if (node === propagationRoot) {
      break;
    }

    node = node.return;
  }

  if (__DEV__) {
    if (node !== propagationRoot) {
      console.error('Expected to find the propagation root when scheduling context work. ' + 'This error is likely caused by a bug in React. Please file an issue.');
    }
  }
}
export function propagateContextChange(workInProgress, context, renderLanes) {
  // TODO: This path is only used by Cache components. Update
  // lazilyPropagateParentContextChanges to look for Cache components so they
  // can take advantage of lazy propagation.
  var forcePropagateEntireTree = true;
  propagateContextChanges(workInProgress, [context], renderLanes, forcePropagateEntireTree);
}

function propagateContextChanges(workInProgress, contexts, renderLanes, forcePropagateEntireTree) {
  var fiber = workInProgress.child;

  if (fiber !== null) {
    // Set the return pointer of the child to the work-in-progress fiber.
    fiber.return = workInProgress;
  }

  while (fiber !== null) {
    var nextFiber = void 0; // Visit this fiber.

    var list = fiber.dependencies;

    if (list !== null) {
      nextFiber = fiber.child;
      var dep = list.firstContext;

      findChangedDep: while (dep !== null) {
        // Assigning these to constants to help Flow
        var dependency = dep;
        var consumer = fiber;

        findContext: for (var i = 0; i < contexts.length; i++) {
          var context = contexts[i]; // Check if the context matches.

          if (dependency.context === context) {
            // Match! Schedule an update on this fiber.
            // In the lazy implementation, don't mark a dirty flag on the
            // dependency itself. Not all changes are propagated, so we can't
            // rely on the propagation function alone to determine whether
            // something has changed; the consumer will check. In the future, we
            // could add back a dirty flag as an optimization to avoid double
            // checking, but until we have selectors it's not really worth
            // the trouble.
            consumer.lanes = mergeLanes(consumer.lanes, renderLanes);
            var alternate = consumer.alternate;

            if (alternate !== null) {
              alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
            }

            scheduleContextWorkOnParentPath(consumer.return, renderLanes, workInProgress);

            if (!forcePropagateEntireTree) {
              // During lazy propagation, when we find a match, we can defer
              // propagating changes to the children, because we're going to
              // visit them during render. We should continue propagating the
              // siblings, though
              nextFiber = null;
            } // Since we already found a match, we can stop traversing the
            // dependency list.


            break findChangedDep;
          }
        }

        dep = dependency.next;
      }
    } else if (fiber.tag === DehydratedFragment) {
      // If a dehydrated suspense boundary is in this subtree, we don't know
      // if it will have any context consumers in it. The best we can do is
      // mark it as having updates.
      var parentSuspense = fiber.return;

      if (parentSuspense === null) {
        throw new Error('We just came from a parent so we must have had a parent. This is a bug in React.');
      }

      parentSuspense.lanes = mergeLanes(parentSuspense.lanes, renderLanes);
      var _alternate = parentSuspense.alternate;

      if (_alternate !== null) {
        _alternate.lanes = mergeLanes(_alternate.lanes, renderLanes);
      } // This is intentionally passing this fiber as the parent
      // because we want to schedule this fiber as having work
      // on its children. We'll use the childLanes on
      // this fiber to indicate that a context has changed.


      scheduleContextWorkOnParentPath(parentSuspense, renderLanes, workInProgress);
      nextFiber = null;
    } else {
      // Traverse down.
      nextFiber = fiber.child;
    }

    if (nextFiber !== null) {
      // Set the return pointer of the child to the work-in-progress fiber.
      nextFiber.return = fiber;
    } else {
      // No child. Traverse to next sibling.
      nextFiber = fiber;

      while (nextFiber !== null) {
        if (nextFiber === workInProgress) {
          // We're back to the root of this subtree. Exit.
          nextFiber = null;
          break;
        }

        var sibling = nextFiber.sibling;

        if (sibling !== null) {
          // Set the return pointer of the sibling to the work-in-progress fiber.
          sibling.return = nextFiber.return;
          nextFiber = sibling;
          break;
        } // No more siblings. Traverse up.


        nextFiber = nextFiber.return;
      }
    }

    fiber = nextFiber;
  }
}

export function lazilyPropagateParentContextChanges(current, workInProgress, renderLanes) {
  var forcePropagateEntireTree = false;
  propagateParentContextChanges(current, workInProgress, renderLanes, forcePropagateEntireTree);
} // Used for propagating a deferred tree (Suspense, Offscreen). We must propagate
// to the entire subtree, because we won't revisit it until after the current
// render has completed, at which point we'll have lost track of which providers
// have changed.

export function propagateParentContextChangesToDeferredTree(current, workInProgress, renderLanes) {
  var forcePropagateEntireTree = true;
  propagateParentContextChanges(current, workInProgress, renderLanes, forcePropagateEntireTree);
}

function propagateParentContextChanges(current, workInProgress, renderLanes, forcePropagateEntireTree) {
  // Collect all the parent providers that changed. Since this is usually small
  // number, we use an Array instead of Set.
  var contexts = null;
  var parent = workInProgress;
  var isInsidePropagationBailout = false;

  while (parent !== null) {
    if (!isInsidePropagationBailout) {
      if ((parent.flags & NeedsPropagation) !== NoFlags) {
        isInsidePropagationBailout = true;
      } else if ((parent.flags & DidPropagateContext) !== NoFlags) {
        break;
      }
    }

    if (parent.tag === ContextProvider) {
      var currentParent = parent.alternate;

      if (currentParent === null) {
        throw new Error('Should have a current fiber. This is a bug in React.');
      }

      var oldProps = currentParent.memoizedProps;

      if (oldProps !== null) {
        var context = void 0;

        if (enableRenderableContext) {
          context = parent.type;
        } else {
          context = parent.type._context;
        }

        var newProps = parent.pendingProps;
        var newValue = newProps.value;
        var oldValue = oldProps.value;

        if (!is(newValue, oldValue)) {
          if (contexts !== null) {
            contexts.push(context);
          } else {
            contexts = [context];
          }
        }
      }
    } else if (parent === getHostTransitionProvider()) {
      // During a host transition, a host component can act like a context
      // provider. E.g. in React DOM, this would be a <form />.
      var _currentParent = parent.alternate;

      if (_currentParent === null) {
        throw new Error('Should have a current fiber. This is a bug in React.');
      }

      var oldStateHook = _currentParent.memoizedState;
      var oldState = oldStateHook.memoizedState;
      var newStateHook = parent.memoizedState;
      var newState = newStateHook.memoizedState; // This uses regular equality instead of Object.is because we assume that
      // host transition state doesn't include NaN as a valid type.

      if (oldState !== newState) {
        if (contexts !== null) {
          contexts.push(HostTransitionContext);
        } else {
          contexts = [HostTransitionContext];
        }
      }
    }

    parent = parent.return;
  }

  if (contexts !== null) {
    // If there were any changed providers, search through the children and
    // propagate their changes.
    propagateContextChanges(workInProgress, contexts, renderLanes, forcePropagateEntireTree);
  } // This is an optimization so that we only propagate once per subtree. If a
  // deeply nested child bails out, and it calls this propagation function, it
  // uses this flag to know that the remaining ancestor providers have already
  // been propagated.
  //
  // NOTE: This optimization is only necessary because we sometimes enter the
  // begin phase of nodes that don't have any work scheduled on them —
  // specifically, the siblings of a node that _does_ have scheduled work. The
  // siblings will bail out and call this function again, even though we already
  // propagated content changes to it and its subtree. So we use this flag to
  // mark that the parent providers already propagated.
  //
  // Unfortunately, though, we need to ignore this flag when we're inside a
  // tree whose context propagation was deferred — that's what the
  // `NeedsPropagation` flag is for.
  //
  // If we could instead bail out before entering the siblings' begin phase,
  // then we could remove both `DidPropagateContext` and `NeedsPropagation`.
  // Consider this as part of the next refactor to the fiber tree structure.


  workInProgress.flags |= DidPropagateContext;
}

export function checkIfContextChanged(currentDependencies) {
  // Iterate over the current dependencies to see if something changed. This
  // only gets called if props and state has already bailed out, so it's a
  // relatively uncommon path, except at the root of a changed subtree.
  // Alternatively, we could move these comparisons into `readContext`, but
  // that's a much hotter path, so I think this is an appropriate trade off.
  var dependency = currentDependencies.firstContext;

  while (dependency !== null) {
    var context = dependency.context;
    var newValue = isPrimaryRenderer ? context._currentValue : context._currentValue2;
    var oldValue = dependency.memoizedValue;

    if (!is(newValue, oldValue)) {
      return true;
    }

    dependency = dependency.next;
  }

  return false;
}
export function prepareToReadContext(workInProgress, renderLanes) {
  currentlyRenderingFiber = workInProgress;
  lastContextDependency = null;
  var dependencies = workInProgress.dependencies;

  if (dependencies !== null) {
    // Reset the work-in-progress list
    dependencies.firstContext = null;
  }
}
export function readContext(context) {
  if (__DEV__) {
    // This warning would fire if you read context inside a Hook like useMemo.
    // Unlike the class check below, it's not enforced in production for perf.
    if (isDisallowedContextReadInDEV) {
      console.error('Context can only be read while React is rendering. ' + 'In classes, you can read it in the render method or getDerivedStateFromProps. ' + 'In function components, you can read it directly in the function body, but not ' + 'inside Hooks like useReducer() or useMemo().');
    }
  }

  return readContextForConsumer(currentlyRenderingFiber, context);
}
export function readContextDuringReconciliation(consumer, context, renderLanes) {
  if (currentlyRenderingFiber === null) {
    prepareToReadContext(consumer, renderLanes);
  }

  return readContextForConsumer(consumer, context);
}

function readContextForConsumer(consumer, context) {
  var value = isPrimaryRenderer ? context._currentValue : context._currentValue2;
  var contextItem = {
    context: context,
    memoizedValue: value,
    next: null
  };

  if (lastContextDependency === null) {
    if (consumer === null) {
      throw new Error('Context can only be read while React is rendering. ' + 'In classes, you can read it in the render method or getDerivedStateFromProps. ' + 'In function components, you can read it directly in the function body, but not ' + 'inside Hooks like useReducer() or useMemo().');
    } // This is the first dependency for this component. Create a new list.


    lastContextDependency = contextItem;
    consumer.dependencies = __DEV__ ? {
      lanes: NoLanes,
      firstContext: contextItem,
      _debugThenableState: null
    } : {
      lanes: NoLanes,
      firstContext: contextItem
    };
    consumer.flags |= NeedsPropagation;
  } else {
    // Append a new context item.
    lastContextDependency = lastContextDependency.next = contextItem;
  }

  return value;
}