/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import { Placement, ChildDeletion, Forked, PlacementDEV } from './ReactFiberFlags';
import { NoMode, ConcurrentMode } from './ReactTypeOfMode';
import { getIteratorFn, ASYNC_ITERATOR, REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, REACT_PORTAL_TYPE, REACT_LAZY_TYPE, REACT_CONTEXT_TYPE, REACT_LEGACY_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { HostRoot, HostText, HostPortal, Fragment, FunctionComponent } from './ReactWorkTags';
import isArray from 'shared/isArray';
import { enableAsyncIterableChildren, disableLegacyMode, enableFragmentRefs } from 'shared/ReactFeatureFlags';
import { createWorkInProgress, resetWorkInProgress, createFiberFromElement, createFiberFromFragment, createFiberFromText, createFiberFromPortal, createFiberFromThrow } from './ReactFiber';
import { isCompatibleFamilyForHotReloading } from './ReactFiberHotReloading';
import { getIsHydrating } from './ReactFiberHydrationContext';
import { pushTreeFork } from './ReactFiberTreeContext';
import { SuspenseException, SuspenseActionException, createThenableState, trackUsedThenable } from './ReactFiberThenable';
import { readContextDuringReconciliation } from './ReactFiberNewContext';
import { callLazyInitInDEV } from './ReactFiberCallUserSpace';
import { runWithFiberInDEV } from './ReactCurrentFiber'; // This tracks the thenables that are unwrapped during reconcilation.

var thenableState = null;
var thenableIndexCounter = 0; // Server Components Meta Data

var currentDebugInfo = null;

function pushDebugInfo(debugInfo) {
  if (!__DEV__) {
    return null;
  }

  var previousDebugInfo = currentDebugInfo;

  if (debugInfo == null) {// Leave inplace
  } else if (previousDebugInfo === null) {
    currentDebugInfo = debugInfo;
  } else {
    // If we have two debugInfo, we need to create a new one. This makes the array no longer
    // live so we'll miss any future updates if we received more so ideally we should always
    // do this after both have fully resolved/unsuspended.
    currentDebugInfo = previousDebugInfo.concat(debugInfo);
  }

  return previousDebugInfo;
}

var didWarnAboutMaps;
var didWarnAboutGenerators;
var ownerHasKeyUseWarning;
var ownerHasFunctionTypeWarning;
var ownerHasSymbolTypeWarning;

var warnForMissingKey = function (returnFiber, workInProgress, child) {};

if (__DEV__) {
  didWarnAboutMaps = false;
  didWarnAboutGenerators = false;
  /**
   * Warn if there's no key explicitly set on dynamic arrays of children or
   * object keys are not valid. This allows us to keep track of children between
   * updates.
   */

  ownerHasKeyUseWarning = {};
  ownerHasFunctionTypeWarning = {};
  ownerHasSymbolTypeWarning = {};

  warnForMissingKey = function (returnFiber, workInProgress, child) {
    if (child === null || typeof child !== 'object') {
      return;
    }

    if (!child._store || (child._store.validated || child.key != null) && child._store.validated !== 2) {
      return;
    }

    if (typeof child._store !== 'object') {
      throw new Error('React Component in warnForMissingKey should have a _store. ' + 'This error is likely caused by a bug in React. Please file an issue.');
    } // $FlowFixMe[cannot-write] unable to narrow type from mixed to writable object


    child._store.validated = 1;
    var componentName = getComponentNameFromFiber(returnFiber);
    var componentKey = componentName || 'null';

    if (ownerHasKeyUseWarning[componentKey]) {
      return;
    }

    ownerHasKeyUseWarning[componentKey] = true;
    var childOwner = child._owner;
    var parentOwner = returnFiber._debugOwner;
    var currentComponentErrorInfo = '';

    if (parentOwner && typeof parentOwner.tag === 'number') {
      var name = getComponentNameFromFiber(parentOwner);

      if (name) {
        currentComponentErrorInfo = '\n\nCheck the render method of `' + name + '`.';
      }
    }

    if (!currentComponentErrorInfo) {
      if (componentName) {
        currentComponentErrorInfo = "\n\nCheck the top-level render call using <" + componentName + ">.";
      }
    } // Usually the current owner is the offender, but if it accepts children as a
    // property, it may be the creator of the child that's responsible for
    // assigning it a key.


    var childOwnerAppendix = '';

    if (childOwner != null && parentOwner !== childOwner) {
      var ownerName = null;

      if (typeof childOwner.tag === 'number') {
        ownerName = getComponentNameFromFiber(childOwner);
      } else if (typeof childOwner.name === 'string') {
        ownerName = childOwner.name;
      }

      if (ownerName) {
        // Give the component that originally created this child.
        childOwnerAppendix = " It was passed a child from " + ownerName + ".";
      }
    }

    runWithFiberInDEV(workInProgress, function () {
      console.error('Each child in a list should have a unique "key" prop.' + '%s%s See https://react.dev/link/warning-keys for more information.', currentComponentErrorInfo, childOwnerAppendix);
    });
  };
} // Given a fragment, validate that it can only be provided with fragment props
// We do this here instead of BeginWork because the Fragment fiber doesn't have
// the whole props object, only the children and is shared with arrays.


function validateFragmentProps(element, fiber, returnFiber) {
  if (__DEV__) {
    var keys = Object.keys(element.props);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];

      if (key !== 'children' && key !== 'key' && (enableFragmentRefs ? key !== 'ref' : true)) {
        if (fiber === null) {
          // For unkeyed root fragments without refs (enableFragmentRefs),
          // there's no Fiber. We create a fake one just for error stack handling.
          fiber = createFiberFromElement(element, returnFiber.mode, 0);

          if (__DEV__) {
            fiber._debugInfo = currentDebugInfo;
          }

          fiber.return = returnFiber;
        }

        runWithFiberInDEV(fiber, function (erroredKey) {
          if (enableFragmentRefs) {
            console.error('Invalid prop `%s` supplied to `React.Fragment`. ' + 'React.Fragment can only have `key`, `ref`, and `children` props.', erroredKey);
          } else {
            console.error('Invalid prop `%s` supplied to `React.Fragment`. ' + 'React.Fragment can only have `key` and `children` props.', erroredKey);
          }
        }, key);
        break;
      }
    }
  }
}

function unwrapThenable(thenable) {
  var index = thenableIndexCounter;
  thenableIndexCounter += 1;

  if (thenableState === null) {
    thenableState = createThenableState();
  }

  return trackUsedThenable(thenableState, thenable, index);
}

function coerceRef(workInProgress, element) {
  // TODO: This is a temporary, intermediate step. Now that enableRefAsProp is on,
  // we should resolve the `ref` prop during the begin phase of the component
  // it's attached to (HostComponent, ClassComponent, etc).
  var refProp = element.props.ref; // TODO: With enableRefAsProp now rolled out, we shouldn't use the `ref` field. We
  // should always read the ref from the prop.

  workInProgress.ref = refProp !== undefined ? refProp : null;
}

function throwOnInvalidObjectType(returnFiber, newChild) {
  if (newChild.$$typeof === REACT_LEGACY_ELEMENT_TYPE) {
    throw new Error('A React Element from an older version of React was rendered. ' + 'This is not supported. It can happen if:\n' + '- Multiple copies of the "react" package is used.\n' + '- A library pre-bundled an old copy of "react" or "react/jsx-runtime".\n' + '- A compiler tries to "inline" JSX instead of using the runtime.');
  } // $FlowFixMe[method-unbinding]


  var childString = Object.prototype.toString.call(newChild);
  throw new Error("Objects are not valid as a React child (found: " + (childString === '[object Object]' ? 'object with keys {' + Object.keys(newChild).join(', ') + '}' : childString) + "). " + 'If you meant to render a collection of children, use an array ' + 'instead.');
}

function warnOnFunctionType(returnFiber, invalidChild) {
  if (__DEV__) {
    var parentName = getComponentNameFromFiber(returnFiber) || 'Component';

    if (ownerHasFunctionTypeWarning[parentName]) {
      return;
    }

    ownerHasFunctionTypeWarning[parentName] = true;
    var name = invalidChild.displayName || invalidChild.name || 'Component';

    if (returnFiber.tag === HostRoot) {
      console.error('Functions are not valid as a React child. This may happen if ' + 'you return %s instead of <%s /> from render. ' + 'Or maybe you meant to call this function rather than return it.\n' + '  root.render(%s)', name, name, name);
    } else {
      console.error('Functions are not valid as a React child. This may happen if ' + 'you return %s instead of <%s /> from render. ' + 'Or maybe you meant to call this function rather than return it.\n' + '  <%s>{%s}</%s>', name, name, parentName, name, parentName);
    }
  }
}

function warnOnSymbolType(returnFiber, invalidChild) {
  if (__DEV__) {
    var parentName = getComponentNameFromFiber(returnFiber) || 'Component';

    if (ownerHasSymbolTypeWarning[parentName]) {
      return;
    }

    ownerHasSymbolTypeWarning[parentName] = true; // eslint-disable-next-line react-internal/safe-string-coercion

    var name = String(invalidChild);

    if (returnFiber.tag === HostRoot) {
      console.error('Symbols are not valid as a React child.\n' + '  root.render(%s)', name);
    } else {
      console.error('Symbols are not valid as a React child.\n' + '  <%s>%s</%s>', parentName, name, parentName);
    }
  }
}

function resolveLazy(lazyType) {
  if (__DEV__) {
    return callLazyInitInDEV(lazyType);
  }

  var payload = lazyType._payload;
  var init = lazyType._init;
  return init(payload);
}

// This wrapper function exists because I expect to clone the code in each path
// to be able to optimize each path individually by branching early. This needs
// a compiler or we can do it manually. Helpers that don't need this branching
// live outside of this function.
function createChildReconciler(shouldTrackSideEffects) {
  function deleteChild(returnFiber, childToDelete) {
    if (!shouldTrackSideEffects) {
      // Noop.
      return;
    }

    var deletions = returnFiber.deletions;

    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      deletions.push(childToDelete);
    }
  }

  function deleteRemainingChildren(returnFiber, currentFirstChild) {
    if (!shouldTrackSideEffects) {
      // Noop.
      return null;
    } // TODO: For the shouldClone case, this could be micro-optimized a bit by
    // assuming that after the first child we've already added everything.


    var childToDelete = currentFirstChild;

    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }

    return null;
  }

  function mapRemainingChildren(currentFirstChild) {
    // Add the remaining children to a temporary map so that we can find them by
    // keys quickly. Implicit (null) keys get added to this set with their index
    // instead.
    var existingChildren = new Map();
    var existingChild = currentFirstChild;

    while (existingChild !== null) {
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild);
      } else {
        existingChildren.set(existingChild.index, existingChild);
      }

      existingChild = existingChild.sibling;
    }

    return existingChildren;
  }

  function useFiber(fiber, pendingProps) {
    // We currently set sibling to null and index to 0 here because it is easy
    // to forget to do before returning it. E.g. for the single child case.
    var clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  function placeChild(newFiber, lastPlacedIndex, newIndex) {
    newFiber.index = newIndex;

    if (!shouldTrackSideEffects) {
      // During hydration, the useId algorithm needs to know which fibers are
      // part of a list of children (arrays, iterators).
      newFiber.flags |= Forked;
      return lastPlacedIndex;
    }

    var current = newFiber.alternate;

    if (current !== null) {
      var oldIndex = current.index;

      if (oldIndex < lastPlacedIndex) {
        // This is a move.
        newFiber.flags |= Placement | PlacementDEV;
        return lastPlacedIndex;
      } else {
        // This item can stay in place.
        return oldIndex;
      }
    } else {
      // This is an insertion.
      newFiber.flags |= Placement | PlacementDEV;
      return lastPlacedIndex;
    }
  }

  function placeSingleChild(newFiber) {
    // This is simpler for the single child case. We only need to do a
    // placement for inserting new children.
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      newFiber.flags |= Placement | PlacementDEV;
    }

    return newFiber;
  }

  function updateTextNode(returnFiber, current, textContent, lanes) {
    if (current === null || current.tag !== HostText) {
      // Insert
      var created = createFiberFromText(textContent, returnFiber.mode, lanes);
      created.return = returnFiber;

      if (__DEV__) {
        // We treat the parent as the owner for stack purposes.
        created._debugOwner = returnFiber;
        created._debugTask = returnFiber._debugTask;
        created._debugInfo = currentDebugInfo;
      }

      return created;
    } else {
      // Update
      var existing = useFiber(current, textContent);
      existing.return = returnFiber;

      if (__DEV__) {
        existing._debugInfo = currentDebugInfo;
      }

      return existing;
    }
  }

  function updateElement(returnFiber, current, element, lanes) {
    var elementType = element.type;

    if (elementType === REACT_FRAGMENT_TYPE) {
      var updated = updateFragment(returnFiber, current, element.props.children, lanes, element.key);

      if (enableFragmentRefs) {
        coerceRef(updated, element);
      }

      validateFragmentProps(element, updated, returnFiber);
      return updated;
    }

    if (current !== null) {
      if (current.elementType === elementType || ( // Keep this check inline so it only runs on the false path:
      __DEV__ ? isCompatibleFamilyForHotReloading(current, element) : false) || // Lazy types should reconcile their resolved type.
      // We need to do this after the Hot Reloading check above,
      // because hot reloading has different semantics than prod because
      // it doesn't resuspend. So we can't let the call below suspend.
      typeof elementType === 'object' && elementType !== null && elementType.$$typeof === REACT_LAZY_TYPE && resolveLazy(elementType) === current.type) {
        // Move based on index
        var existing = useFiber(current, element.props);
        coerceRef(existing, element);
        existing.return = returnFiber;

        if (__DEV__) {
          existing._debugOwner = element._owner;
          existing._debugInfo = currentDebugInfo;
        }

        return existing;
      }
    } // Insert


    var created = createFiberFromElement(element, returnFiber.mode, lanes);
    coerceRef(created, element);
    created.return = returnFiber;

    if (__DEV__) {
      created._debugInfo = currentDebugInfo;
    }

    return created;
  }

  function updatePortal(returnFiber, current, portal, lanes) {
    if (current === null || current.tag !== HostPortal || current.stateNode.containerInfo !== portal.containerInfo || current.stateNode.implementation !== portal.implementation) {
      // Insert
      var created = createFiberFromPortal(portal, returnFiber.mode, lanes);
      created.return = returnFiber;

      if (__DEV__) {
        created._debugInfo = currentDebugInfo;
      }

      return created;
    } else {
      // Update
      var existing = useFiber(current, portal.children || []);
      existing.return = returnFiber;

      if (__DEV__) {
        existing._debugInfo = currentDebugInfo;
      }

      return existing;
    }
  }

  function updateFragment(returnFiber, current, fragment, lanes, key) {
    if (current === null || current.tag !== Fragment) {
      // Insert
      var created = createFiberFromFragment(fragment, returnFiber.mode, lanes, key);
      created.return = returnFiber;

      if (__DEV__) {
        // We treat the parent as the owner for stack purposes.
        created._debugOwner = returnFiber;
        created._debugTask = returnFiber._debugTask;
        created._debugInfo = currentDebugInfo;
      }

      return created;
    } else {
      // Update
      var existing = useFiber(current, fragment);
      existing.return = returnFiber;

      if (__DEV__) {
        existing._debugInfo = currentDebugInfo;
      }

      return existing;
    }
  }

  function createChild(returnFiber, newChild, lanes) {
    if (typeof newChild === 'string' && newChild !== '' || typeof newChild === 'number' || typeof newChild === 'bigint') {
      // Text nodes don't have keys. If the previous node is implicitly keyed
      // we can continue to replace it without aborting even if it is not a text
      // node.
      var created = createFiberFromText( // $FlowFixMe[unsafe-addition] Flow doesn't want us to use `+` operator with string and bigint
      '' + newChild, returnFiber.mode, lanes);
      created.return = returnFiber;

      if (__DEV__) {
        // We treat the parent as the owner for stack purposes.
        created._debugOwner = returnFiber;
        created._debugTask = returnFiber._debugTask;
        created._debugInfo = currentDebugInfo;
      }

      return created;
    }

    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          {
            var _created = createFiberFromElement(newChild, returnFiber.mode, lanes);

            coerceRef(_created, newChild);
            _created.return = returnFiber;

            if (__DEV__) {
              var prevDebugInfo = pushDebugInfo(newChild._debugInfo);
              _created._debugInfo = currentDebugInfo;
              currentDebugInfo = prevDebugInfo;
            }

            return _created;
          }

        case REACT_PORTAL_TYPE:
          {
            var _created2 = createFiberFromPortal(newChild, returnFiber.mode, lanes);

            _created2.return = returnFiber;

            if (__DEV__) {
              _created2._debugInfo = currentDebugInfo;
            }

            return _created2;
          }

        case REACT_LAZY_TYPE:
          {
            var _prevDebugInfo = pushDebugInfo(newChild._debugInfo);

            var resolvedChild;

            if (__DEV__) {
              resolvedChild = callLazyInitInDEV(newChild);
            } else {
              var payload = newChild._payload;
              var init = newChild._init;
              resolvedChild = init(payload);
            }

            var _created3 = createChild(returnFiber, resolvedChild, lanes);

            currentDebugInfo = _prevDebugInfo;
            return _created3;
          }
      }

      if (isArray(newChild) || getIteratorFn(newChild) || enableAsyncIterableChildren && typeof newChild[ASYNC_ITERATOR] === 'function') {
        var _created4 = createFiberFromFragment(newChild, returnFiber.mode, lanes, null);

        _created4.return = returnFiber;

        if (__DEV__) {
          // We treat the parent as the owner for stack purposes.
          _created4._debugOwner = returnFiber;
          _created4._debugTask = returnFiber._debugTask;

          var _prevDebugInfo2 = pushDebugInfo(newChild._debugInfo);

          _created4._debugInfo = currentDebugInfo;
          currentDebugInfo = _prevDebugInfo2;
        }

        return _created4;
      } // Usable node types
      //
      // Unwrap the inner value and recursively call this function again.


      if (typeof newChild.then === 'function') {
        var thenable = newChild;

        var _prevDebugInfo3 = pushDebugInfo(newChild._debugInfo);

        var _created5 = createChild(returnFiber, unwrapThenable(thenable), lanes);

        currentDebugInfo = _prevDebugInfo3;
        return _created5;
      }

      if (newChild.$$typeof === REACT_CONTEXT_TYPE) {
        var context = newChild;
        return createChild(returnFiber, readContextDuringReconciliation(returnFiber, context, lanes), lanes);
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    if (__DEV__) {
      if (typeof newChild === 'function') {
        warnOnFunctionType(returnFiber, newChild);
      }

      if (typeof newChild === 'symbol') {
        warnOnSymbolType(returnFiber, newChild);
      }
    }

    return null;
  }

  function updateSlot(returnFiber, oldFiber, newChild, lanes) {
    // Update the fiber if the keys match, otherwise return null.
    var key = oldFiber !== null ? oldFiber.key : null;

    if (typeof newChild === 'string' && newChild !== '' || typeof newChild === 'number' || typeof newChild === 'bigint') {
      // Text nodes don't have keys. If the previous node is implicitly keyed
      // we can continue to replace it without aborting even if it is not a text
      // node.
      if (key !== null) {
        return null;
      }

      return updateTextNode(returnFiber, oldFiber, // $FlowFixMe[unsafe-addition] Flow doesn't want us to use `+` operator with string and bigint
      '' + newChild, lanes);
    }

    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          {
            if (newChild.key === key) {
              var prevDebugInfo = pushDebugInfo(newChild._debugInfo);
              var updated = updateElement(returnFiber, oldFiber, newChild, lanes);
              currentDebugInfo = prevDebugInfo;
              return updated;
            } else {
              return null;
            }
          }

        case REACT_PORTAL_TYPE:
          {
            if (newChild.key === key) {
              return updatePortal(returnFiber, oldFiber, newChild, lanes);
            } else {
              return null;
            }
          }

        case REACT_LAZY_TYPE:
          {
            var _prevDebugInfo4 = pushDebugInfo(newChild._debugInfo);

            var resolvedChild;

            if (__DEV__) {
              resolvedChild = callLazyInitInDEV(newChild);
            } else {
              var payload = newChild._payload;
              var init = newChild._init;
              resolvedChild = init(payload);
            }

            var _updated = updateSlot(returnFiber, oldFiber, resolvedChild, lanes);

            currentDebugInfo = _prevDebugInfo4;
            return _updated;
          }
      }

      if (isArray(newChild) || getIteratorFn(newChild) || enableAsyncIterableChildren && typeof newChild[ASYNC_ITERATOR] === 'function') {
        if (key !== null) {
          return null;
        }

        var _prevDebugInfo5 = pushDebugInfo(newChild._debugInfo);

        var _updated2 = updateFragment(returnFiber, oldFiber, newChild, lanes, null);

        currentDebugInfo = _prevDebugInfo5;
        return _updated2;
      } // Usable node types
      //
      // Unwrap the inner value and recursively call this function again.


      if (typeof newChild.then === 'function') {
        var thenable = newChild;

        var _prevDebugInfo6 = pushDebugInfo(thenable._debugInfo);

        var _updated3 = updateSlot(returnFiber, oldFiber, unwrapThenable(thenable), lanes);

        currentDebugInfo = _prevDebugInfo6;
        return _updated3;
      }

      if (newChild.$$typeof === REACT_CONTEXT_TYPE) {
        var context = newChild;
        return updateSlot(returnFiber, oldFiber, readContextDuringReconciliation(returnFiber, context, lanes), lanes);
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    if (__DEV__) {
      if (typeof newChild === 'function') {
        warnOnFunctionType(returnFiber, newChild);
      }

      if (typeof newChild === 'symbol') {
        warnOnSymbolType(returnFiber, newChild);
      }
    }

    return null;
  }

  function updateFromMap(existingChildren, returnFiber, newIdx, newChild, lanes) {
    if (typeof newChild === 'string' && newChild !== '' || typeof newChild === 'number' || typeof newChild === 'bigint') {
      // Text nodes don't have keys, so we neither have to check the old nor
      // new node for the key. If both are text nodes, they match.
      var matchedFiber = existingChildren.get(newIdx) || null;
      return updateTextNode(returnFiber, matchedFiber, // $FlowFixMe[unsafe-addition] Flow doesn't want us to use `+` operator with string and bigint
      '' + newChild, lanes);
    }

    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          {
            var _matchedFiber = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null;

            var prevDebugInfo = pushDebugInfo(newChild._debugInfo);
            var updated = updateElement(returnFiber, _matchedFiber, newChild, lanes);
            currentDebugInfo = prevDebugInfo;
            return updated;
          }

        case REACT_PORTAL_TYPE:
          {
            var _matchedFiber2 = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null;

            return updatePortal(returnFiber, _matchedFiber2, newChild, lanes);
          }

        case REACT_LAZY_TYPE:
          {
            var _prevDebugInfo7 = pushDebugInfo(newChild._debugInfo);

            var resolvedChild;

            if (__DEV__) {
              resolvedChild = callLazyInitInDEV(newChild);
            } else {
              var payload = newChild._payload;
              var init = newChild._init;
              resolvedChild = init(payload);
            }

            var _updated4 = updateFromMap(existingChildren, returnFiber, newIdx, resolvedChild, lanes);

            currentDebugInfo = _prevDebugInfo7;
            return _updated4;
          }
      }

      if (isArray(newChild) || getIteratorFn(newChild) || enableAsyncIterableChildren && typeof newChild[ASYNC_ITERATOR] === 'function') {
        var _matchedFiber3 = existingChildren.get(newIdx) || null;

        var _prevDebugInfo8 = pushDebugInfo(newChild._debugInfo);

        var _updated5 = updateFragment(returnFiber, _matchedFiber3, newChild, lanes, null);

        currentDebugInfo = _prevDebugInfo8;
        return _updated5;
      } // Usable node types
      //
      // Unwrap the inner value and recursively call this function again.


      if (typeof newChild.then === 'function') {
        var thenable = newChild;

        var _prevDebugInfo9 = pushDebugInfo(thenable._debugInfo);

        var _updated6 = updateFromMap(existingChildren, returnFiber, newIdx, unwrapThenable(thenable), lanes);

        currentDebugInfo = _prevDebugInfo9;
        return _updated6;
      }

      if (newChild.$$typeof === REACT_CONTEXT_TYPE) {
        var context = newChild;
        return updateFromMap(existingChildren, returnFiber, newIdx, readContextDuringReconciliation(returnFiber, context, lanes), lanes);
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    if (__DEV__) {
      if (typeof newChild === 'function') {
        warnOnFunctionType(returnFiber, newChild);
      }

      if (typeof newChild === 'symbol') {
        warnOnSymbolType(returnFiber, newChild);
      }
    }

    return null;
  }
  /**
   * Warns if there is a duplicate or missing key
   */


  function warnOnInvalidKey(returnFiber, workInProgress, child, knownKeys) {
    if (__DEV__) {
      if (typeof child !== 'object' || child === null) {
        return knownKeys;
      }

      switch (child.$$typeof) {
        case REACT_ELEMENT_TYPE:
        case REACT_PORTAL_TYPE:
          warnForMissingKey(returnFiber, workInProgress, child);
          var key = child.key;

          if (typeof key !== 'string') {
            break;
          }

          if (knownKeys === null) {
            knownKeys = new Set();
            knownKeys.add(key);
            break;
          }

          if (!knownKeys.has(key)) {
            knownKeys.add(key);
            break;
          }

          runWithFiberInDEV(workInProgress, function () {
            console.error('Encountered two children with the same key, `%s`. ' + 'Keys should be unique so that components maintain their identity ' + 'across updates. Non-unique keys may cause children to be ' + 'duplicated and/or omitted — the behavior is unsupported and ' + 'could change in a future version.', key);
          });
          break;

        case REACT_LAZY_TYPE:
          {
            var resolvedChild;

            if (__DEV__) {
              resolvedChild = callLazyInitInDEV(child);
            } else {
              var payload = child._payload;
              var init = child._init;
              resolvedChild = init(payload);
            }

            warnOnInvalidKey(returnFiber, workInProgress, resolvedChild, knownKeys);
            break;
          }

        default:
          break;
      }
    }

    return knownKeys;
  }

  function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren, lanes) {
    // This algorithm can't optimize by searching from both ends since we
    // don't have backpointers on fibers. I'm trying to see how far we can get
    // with that model. If it ends up not being worth the tradeoffs, we can
    // add it later.
    // Even with a two ended optimization, we'd want to optimize for the case
    // where there are few changes and brute force the comparison instead of
    // going for the Map. It'd like to explore hitting that path first in
    // forward-only mode and only go for the Map once we notice that we need
    // lots of look ahead. This doesn't handle reversal as well as two ended
    // search but that's unusual. Besides, for the two ended optimization to
    // work on Iterables, we'd need to copy the whole set.
    // In this first iteration, we'll just live with hitting the bad case
    // (adding everything to a Map) in for every insert/move.
    // If you change this code, also update reconcileChildrenIterator() which
    // uses the same algorithm.
    var knownKeys = null;
    var resultingFirstChild = null;
    var previousNewFiber = null;
    var oldFiber = currentFirstChild;
    var lastPlacedIndex = 0;
    var newIdx = 0;
    var nextOldFiber = null;

    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      if (oldFiber.index > newIdx) {
        nextOldFiber = oldFiber;
        oldFiber = null;
      } else {
        nextOldFiber = oldFiber.sibling;
      }

      var newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx], lanes);

      if (newFiber === null) {
        // TODO: This breaks on empty slots like null children. That's
        // unfortunate because it triggers the slow path all the time. We need
        // a better way to communicate whether this was a miss or null,
        // boolean, undefined, etc.
        if (oldFiber === null) {
          oldFiber = nextOldFiber;
        }

        break;
      }

      if (__DEV__) {
        knownKeys = warnOnInvalidKey(returnFiber, newFiber, newChildren[newIdx], knownKeys);
      }

      if (shouldTrackSideEffects) {
        if (oldFiber && newFiber.alternate === null) {
          // We matched the slot, but we didn't reuse the existing fiber, so we
          // need to delete the existing child.
          deleteChild(returnFiber, oldFiber);
        }
      }

      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

      if (previousNewFiber === null) {
        // TODO: Move out of the loop. This only happens for the first run.
        resultingFirstChild = newFiber;
      } else {
        // TODO: Defer siblings if we're not at the right index for this slot.
        // I.e. if we had null values before, then we want to defer this
        // for each null value. However, we also don't want to call updateSlot
        // with the previous one.
        previousNewFiber.sibling = newFiber;
      }

      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }

    if (newIdx === newChildren.length) {
      // We've reached the end of the new children. We can delete the rest.
      deleteRemainingChildren(returnFiber, oldFiber);

      if (getIsHydrating()) {
        var numberOfForks = newIdx;
        pushTreeFork(returnFiber, numberOfForks);
      }

      return resultingFirstChild;
    }

    if (oldFiber === null) {
      // If we don't have any more existing children we can choose a fast path
      // since the rest will all be insertions.
      for (; newIdx < newChildren.length; newIdx++) {
        var _newFiber = createChild(returnFiber, newChildren[newIdx], lanes);

        if (_newFiber === null) {
          continue;
        }

        if (__DEV__) {
          knownKeys = warnOnInvalidKey(returnFiber, _newFiber, newChildren[newIdx], knownKeys);
        }

        lastPlacedIndex = placeChild(_newFiber, lastPlacedIndex, newIdx);

        if (previousNewFiber === null) {
          // TODO: Move out of the loop. This only happens for the first run.
          resultingFirstChild = _newFiber;
        } else {
          previousNewFiber.sibling = _newFiber;
        }

        previousNewFiber = _newFiber;
      }

      if (getIsHydrating()) {
        var _numberOfForks = newIdx;
        pushTreeFork(returnFiber, _numberOfForks);
      }

      return resultingFirstChild;
    } // Add all children to a key map for quick lookups.


    var existingChildren = mapRemainingChildren(oldFiber); // Keep scanning and use the map to restore deleted items as moves.

    for (; newIdx < newChildren.length; newIdx++) {
      var _newFiber2 = updateFromMap(existingChildren, returnFiber, newIdx, newChildren[newIdx], lanes);

      if (_newFiber2 !== null) {
        if (__DEV__) {
          knownKeys = warnOnInvalidKey(returnFiber, _newFiber2, newChildren[newIdx], knownKeys);
        }

        if (shouldTrackSideEffects) {
          if (_newFiber2.alternate !== null) {
            // The new fiber is a work in progress, but if there exists a
            // current, that means that we reused the fiber. We need to delete
            // it from the child list so that we don't add it to the deletion
            // list.
            existingChildren.delete(_newFiber2.key === null ? newIdx : _newFiber2.key);
          }
        }

        lastPlacedIndex = placeChild(_newFiber2, lastPlacedIndex, newIdx);

        if (previousNewFiber === null) {
          resultingFirstChild = _newFiber2;
        } else {
          previousNewFiber.sibling = _newFiber2;
        }

        previousNewFiber = _newFiber2;
      }
    }

    if (shouldTrackSideEffects) {
      // Any existing children that weren't consumed above were deleted. We need
      // to add them to the deletion list.
      existingChildren.forEach(function (child) {
        return deleteChild(returnFiber, child);
      });
    }

    if (getIsHydrating()) {
      var _numberOfForks2 = newIdx;
      pushTreeFork(returnFiber, _numberOfForks2);
    }

    return resultingFirstChild;
  }

  function reconcileChildrenIteratable(returnFiber, currentFirstChild, newChildrenIterable, lanes) {
    // This is the same implementation as reconcileChildrenArray(),
    // but using the iterator instead.
    var iteratorFn = getIteratorFn(newChildrenIterable);

    if (typeof iteratorFn !== 'function') {
      throw new Error('An object is not an iterable. This error is likely caused by a bug in ' + 'React. Please file an issue.');
    }

    var newChildren = iteratorFn.call(newChildrenIterable);

    if (__DEV__) {
      if (newChildren === newChildrenIterable) {
        // We don't support rendering Generators as props because it's a mutation.
        // See https://github.com/facebook/react/issues/12995
        // We do support generators if they were created by a GeneratorFunction component
        // as its direct child since we can recreate those by rerendering the component
        // as needed.
        var isGeneratorComponent = returnFiber.tag === FunctionComponent && // $FlowFixMe[method-unbinding]
        Object.prototype.toString.call(returnFiber.type) === '[object GeneratorFunction]' && // $FlowFixMe[method-unbinding]
        Object.prototype.toString.call(newChildren) === '[object Generator]';

        if (!isGeneratorComponent) {
          if (!didWarnAboutGenerators) {
            console.error('Using Iterators as children is unsupported and will likely yield ' + 'unexpected results because enumerating a generator mutates it. ' + 'You may convert it to an array with `Array.from()` or the ' + '`[...spread]` operator before rendering. You can also use an ' + 'Iterable that can iterate multiple times over the same items.');
          }

          didWarnAboutGenerators = true;
        }
      } else if (newChildrenIterable.entries === iteratorFn) {
        // Warn about using Maps as children
        if (!didWarnAboutMaps) {
          console.error('Using Maps as children is not supported. ' + 'Use an array of keyed ReactElements instead.');
          didWarnAboutMaps = true;
        }
      }
    }

    return reconcileChildrenIterator(returnFiber, currentFirstChild, newChildren, lanes);
  }

  function reconcileChildrenAsyncIteratable(returnFiber, currentFirstChild, newChildrenIterable, lanes) {
    var newChildren = newChildrenIterable[ASYNC_ITERATOR]();

    if (__DEV__) {
      if (newChildren === newChildrenIterable) {
        // We don't support rendering AsyncGenerators as props because it's a mutation.
        // We do support generators if they were created by a AsyncGeneratorFunction component
        // as its direct child since we can recreate those by rerendering the component
        // as needed.
        var isGeneratorComponent = returnFiber.tag === FunctionComponent && // $FlowFixMe[method-unbinding]
        Object.prototype.toString.call(returnFiber.type) === '[object AsyncGeneratorFunction]' && // $FlowFixMe[method-unbinding]
        Object.prototype.toString.call(newChildren) === '[object AsyncGenerator]';

        if (!isGeneratorComponent) {
          if (!didWarnAboutGenerators) {
            console.error('Using AsyncIterators as children is unsupported and will likely yield ' + 'unexpected results because enumerating a generator mutates it. ' + 'You can use an AsyncIterable that can iterate multiple times over ' + 'the same items.');
          }

          didWarnAboutGenerators = true;
        }
      }
    }

    if (newChildren == null) {
      throw new Error('An iterable object provided no iterator.');
    } // To save bytes, we reuse the logic by creating a synchronous Iterable and
    // reusing that code path.


    var iterator = {
      next: function () {
        return unwrapThenable(newChildren.next());
      }
    };
    return reconcileChildrenIterator(returnFiber, currentFirstChild, iterator, lanes);
  }

  function reconcileChildrenIterator(returnFiber, currentFirstChild, newChildren, lanes) {
    if (newChildren == null) {
      throw new Error('An iterable object provided no iterator.');
    }

    var resultingFirstChild = null;
    var previousNewFiber = null;
    var oldFiber = currentFirstChild;
    var lastPlacedIndex = 0;
    var newIdx = 0;
    var nextOldFiber = null;
    var knownKeys = null;
    var step = newChildren.next();

    for (; oldFiber !== null && !step.done; newIdx++, step = newChildren.next()) {
      if (oldFiber.index > newIdx) {
        nextOldFiber = oldFiber;
        oldFiber = null;
      } else {
        nextOldFiber = oldFiber.sibling;
      }

      var newFiber = updateSlot(returnFiber, oldFiber, step.value, lanes);

      if (newFiber === null) {
        // TODO: This breaks on empty slots like null children. That's
        // unfortunate because it triggers the slow path all the time. We need
        // a better way to communicate whether this was a miss or null,
        // boolean, undefined, etc.
        if (oldFiber === null) {
          oldFiber = nextOldFiber;
        }

        break;
      }

      if (__DEV__) {
        knownKeys = warnOnInvalidKey(returnFiber, newFiber, step.value, knownKeys);
      }

      if (shouldTrackSideEffects) {
        if (oldFiber && newFiber.alternate === null) {
          // We matched the slot, but we didn't reuse the existing fiber, so we
          // need to delete the existing child.
          deleteChild(returnFiber, oldFiber);
        }
      }

      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

      if (previousNewFiber === null) {
        // TODO: Move out of the loop. This only happens for the first run.
        resultingFirstChild = newFiber;
      } else {
        // TODO: Defer siblings if we're not at the right index for this slot.
        // I.e. if we had null values before, then we want to defer this
        // for each null value. However, we also don't want to call updateSlot
        // with the previous one.
        previousNewFiber.sibling = newFiber;
      }

      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }

    if (step.done) {
      // We've reached the end of the new children. We can delete the rest.
      deleteRemainingChildren(returnFiber, oldFiber);

      if (getIsHydrating()) {
        var numberOfForks = newIdx;
        pushTreeFork(returnFiber, numberOfForks);
      }

      return resultingFirstChild;
    }

    if (oldFiber === null) {
      // If we don't have any more existing children we can choose a fast path
      // since the rest will all be insertions.
      for (; !step.done; newIdx++, step = newChildren.next()) {
        var _newFiber3 = createChild(returnFiber, step.value, lanes);

        if (_newFiber3 === null) {
          continue;
        }

        if (__DEV__) {
          knownKeys = warnOnInvalidKey(returnFiber, _newFiber3, step.value, knownKeys);
        }

        lastPlacedIndex = placeChild(_newFiber3, lastPlacedIndex, newIdx);

        if (previousNewFiber === null) {
          // TODO: Move out of the loop. This only happens for the first run.
          resultingFirstChild = _newFiber3;
        } else {
          previousNewFiber.sibling = _newFiber3;
        }

        previousNewFiber = _newFiber3;
      }

      if (getIsHydrating()) {
        var _numberOfForks3 = newIdx;
        pushTreeFork(returnFiber, _numberOfForks3);
      }

      return resultingFirstChild;
    } // Add all children to a key map for quick lookups.


    var existingChildren = mapRemainingChildren(oldFiber); // Keep scanning and use the map to restore deleted items as moves.

    for (; !step.done; newIdx++, step = newChildren.next()) {
      var _newFiber4 = updateFromMap(existingChildren, returnFiber, newIdx, step.value, lanes);

      if (_newFiber4 !== null) {
        if (__DEV__) {
          knownKeys = warnOnInvalidKey(returnFiber, _newFiber4, step.value, knownKeys);
        }

        if (shouldTrackSideEffects) {
          if (_newFiber4.alternate !== null) {
            // The new fiber is a work in progress, but if there exists a
            // current, that means that we reused the fiber. We need to delete
            // it from the child list so that we don't add it to the deletion
            // list.
            existingChildren.delete(_newFiber4.key === null ? newIdx : _newFiber4.key);
          }
        }

        lastPlacedIndex = placeChild(_newFiber4, lastPlacedIndex, newIdx);

        if (previousNewFiber === null) {
          resultingFirstChild = _newFiber4;
        } else {
          previousNewFiber.sibling = _newFiber4;
        }

        previousNewFiber = _newFiber4;
      }
    }

    if (shouldTrackSideEffects) {
      // Any existing children that weren't consumed above were deleted. We need
      // to add them to the deletion list.
      existingChildren.forEach(function (child) {
        return deleteChild(returnFiber, child);
      });
    }

    if (getIsHydrating()) {
      var _numberOfForks4 = newIdx;
      pushTreeFork(returnFiber, _numberOfForks4);
    }

    return resultingFirstChild;
  }

  function reconcileSingleTextNode(returnFiber, currentFirstChild, textContent, lanes) {
    // There's no need to check for keys on text nodes since we don't have a
    // way to define them.
    if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
      // We already have an existing node so let's just update it and delete
      // the rest.
      deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
      var existing = useFiber(currentFirstChild, textContent);
      existing.return = returnFiber;
      return existing;
    } // The existing first child is not a text node so we need to create one
    // and delete the existing ones.


    deleteRemainingChildren(returnFiber, currentFirstChild);
    var created = createFiberFromText(textContent, returnFiber.mode, lanes);
    created.return = returnFiber;

    if (__DEV__) {
      // We treat the parent as the owner for stack purposes.
      created._debugOwner = returnFiber;
      created._debugTask = returnFiber._debugTask;
      created._debugInfo = currentDebugInfo;
    }

    return created;
  }

  function reconcileSingleElement(returnFiber, currentFirstChild, element, lanes) {
    var key = element.key;
    var child = currentFirstChild;

    while (child !== null) {
      // TODO: If key === null and child.key === null, then this only applies to
      // the first item in the list.
      if (child.key === key) {
        var elementType = element.type;

        if (elementType === REACT_FRAGMENT_TYPE) {
          if (child.tag === Fragment) {
            deleteRemainingChildren(returnFiber, child.sibling);
            var existing = useFiber(child, element.props.children);

            if (enableFragmentRefs) {
              coerceRef(existing, element);
            }

            existing.return = returnFiber;

            if (__DEV__) {
              existing._debugOwner = element._owner;
              existing._debugInfo = currentDebugInfo;
            }

            validateFragmentProps(element, existing, returnFiber);
            return existing;
          }
        } else {
          if (child.elementType === elementType || ( // Keep this check inline so it only runs on the false path:
          __DEV__ ? isCompatibleFamilyForHotReloading(child, element) : false) || // Lazy types should reconcile their resolved type.
          // We need to do this after the Hot Reloading check above,
          // because hot reloading has different semantics than prod because
          // it doesn't resuspend. So we can't let the call below suspend.
          typeof elementType === 'object' && elementType !== null && elementType.$$typeof === REACT_LAZY_TYPE && resolveLazy(elementType) === child.type) {
            deleteRemainingChildren(returnFiber, child.sibling);

            var _existing = useFiber(child, element.props);

            coerceRef(_existing, element);
            _existing.return = returnFiber;

            if (__DEV__) {
              _existing._debugOwner = element._owner;
              _existing._debugInfo = currentDebugInfo;
            }

            return _existing;
          }
        } // Didn't match.


        deleteRemainingChildren(returnFiber, child);
        break;
      } else {
        deleteChild(returnFiber, child);
      }

      child = child.sibling;
    }

    if (element.type === REACT_FRAGMENT_TYPE) {
      var created = createFiberFromFragment(element.props.children, returnFiber.mode, lanes, element.key);

      if (enableFragmentRefs) {
        coerceRef(created, element);
      }

      created.return = returnFiber;

      if (__DEV__) {
        // We treat the parent as the owner for stack purposes.
        created._debugOwner = returnFiber;
        created._debugTask = returnFiber._debugTask;
        created._debugInfo = currentDebugInfo;
      }

      validateFragmentProps(element, created, returnFiber);
      return created;
    } else {
      var _created6 = createFiberFromElement(element, returnFiber.mode, lanes);

      coerceRef(_created6, element);
      _created6.return = returnFiber;

      if (__DEV__) {
        _created6._debugInfo = currentDebugInfo;
      }

      return _created6;
    }
  }

  function reconcileSinglePortal(returnFiber, currentFirstChild, portal, lanes) {
    var key = portal.key;
    var child = currentFirstChild;

    while (child !== null) {
      // TODO: If key === null and child.key === null, then this only applies to
      // the first item in the list.
      if (child.key === key) {
        if (child.tag === HostPortal && child.stateNode.containerInfo === portal.containerInfo && child.stateNode.implementation === portal.implementation) {
          deleteRemainingChildren(returnFiber, child.sibling);
          var existing = useFiber(child, portal.children || []);
          existing.return = returnFiber;
          return existing;
        } else {
          deleteRemainingChildren(returnFiber, child);
          break;
        }
      } else {
        deleteChild(returnFiber, child);
      }

      child = child.sibling;
    }

    var created = createFiberFromPortal(portal, returnFiber.mode, lanes);
    created.return = returnFiber;
    return created;
  } // This API will tag the children with the side-effect of the reconciliation
  // itself. They will be added to the side-effect list as we pass through the
  // children and the parent.


  function reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes) {
    // This function is only recursive for Usables/Lazy and not nested arrays.
    // That's so that using a Lazy wrapper is unobservable to the Fragment
    // convention.
    // If the top level item is an array, we treat it as a set of children,
    // not as a fragment. Nested arrays on the other hand will be treated as
    // fragment nodes. Recursion happens at the normal flow.
    // Handle top level unkeyed fragments without refs (enableFragmentRefs)
    // as if they were arrays. This leads to an ambiguity between <>{[...]}</> and <>...</>.
    // We treat the ambiguous cases above the same.
    // We don't use recursion here because a fragment inside a fragment
    // is no longer considered "top level" for these purposes.
    var isUnkeyedUnrefedTopLevelFragment = typeof newChild === 'object' && newChild !== null && newChild.type === REACT_FRAGMENT_TYPE && newChild.key === null && (enableFragmentRefs ? newChild.props.ref === undefined : true);

    if (isUnkeyedUnrefedTopLevelFragment) {
      validateFragmentProps(newChild, null, returnFiber);
      newChild = newChild.props.children;
    } // Handle object types


    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          {
            var prevDebugInfo = pushDebugInfo(newChild._debugInfo);
            var firstChild = placeSingleChild(reconcileSingleElement(returnFiber, currentFirstChild, newChild, lanes));
            currentDebugInfo = prevDebugInfo;
            return firstChild;
          }

        case REACT_PORTAL_TYPE:
          return placeSingleChild(reconcileSinglePortal(returnFiber, currentFirstChild, newChild, lanes));

        case REACT_LAZY_TYPE:
          {
            var _prevDebugInfo10 = pushDebugInfo(newChild._debugInfo);

            var result;

            if (__DEV__) {
              result = callLazyInitInDEV(newChild);
            } else {
              var payload = newChild._payload;
              var init = newChild._init;
              result = init(payload);
            }

            var _firstChild = reconcileChildFibersImpl(returnFiber, currentFirstChild, result, lanes);

            currentDebugInfo = _prevDebugInfo10;
            return _firstChild;
          }
      }

      if (isArray(newChild)) {
        var _prevDebugInfo11 = pushDebugInfo(newChild._debugInfo);

        var _firstChild2 = reconcileChildrenArray(returnFiber, currentFirstChild, newChild, lanes);

        currentDebugInfo = _prevDebugInfo11;
        return _firstChild2;
      }

      if (getIteratorFn(newChild)) {
        var _prevDebugInfo12 = pushDebugInfo(newChild._debugInfo);

        var _firstChild3 = reconcileChildrenIteratable(returnFiber, currentFirstChild, newChild, lanes);

        currentDebugInfo = _prevDebugInfo12;
        return _firstChild3;
      }

      if (enableAsyncIterableChildren && typeof newChild[ASYNC_ITERATOR] === 'function') {
        var _prevDebugInfo13 = pushDebugInfo(newChild._debugInfo);

        var _firstChild4 = reconcileChildrenAsyncIteratable(returnFiber, currentFirstChild, newChild, lanes);

        currentDebugInfo = _prevDebugInfo13;
        return _firstChild4;
      } // Usables are a valid React node type. When React encounters a Usable in
      // a child position, it unwraps it using the same algorithm as `use`. For
      // example, for promises, React will throw an exception to unwind the
      // stack, then replay the component once the promise resolves.
      //
      // A difference from `use` is that React will keep unwrapping the value
      // until it reaches a non-Usable type.
      //
      // e.g. Usable<Usable<Usable<T>>> should resolve to T
      //
      // The structure is a bit unfortunate. Ideally, we shouldn't need to
      // replay the entire begin phase of the parent fiber in order to reconcile
      // the children again. This would require a somewhat significant refactor,
      // because reconcilation happens deep within the begin phase, and
      // depending on the type of work, not always at the end. We should
      // consider as an future improvement.


      if (typeof newChild.then === 'function') {
        var thenable = newChild;

        var _prevDebugInfo14 = pushDebugInfo(thenable._debugInfo);

        var _firstChild5 = reconcileChildFibersImpl(returnFiber, currentFirstChild, unwrapThenable(thenable), lanes);

        currentDebugInfo = _prevDebugInfo14;
        return _firstChild5;
      }

      if (newChild.$$typeof === REACT_CONTEXT_TYPE) {
        var context = newChild;
        return reconcileChildFibersImpl(returnFiber, currentFirstChild, readContextDuringReconciliation(returnFiber, context, lanes), lanes);
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    if (typeof newChild === 'string' && newChild !== '' || typeof newChild === 'number' || typeof newChild === 'bigint') {
      return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFirstChild, // $FlowFixMe[unsafe-addition] Flow doesn't want us to use `+` operator with string and bigint
      '' + newChild, lanes));
    }

    if (__DEV__) {
      if (typeof newChild === 'function') {
        warnOnFunctionType(returnFiber, newChild);
      }

      if (typeof newChild === 'symbol') {
        warnOnSymbolType(returnFiber, newChild);
      }
    } // Remaining cases are all treated as empty.


    return deleteRemainingChildren(returnFiber, currentFirstChild);
  }

  function reconcileChildFibers(returnFiber, currentFirstChild, newChild, lanes) {
    var prevDebugInfo = currentDebugInfo;
    currentDebugInfo = null;

    try {
      // This indirection only exists so we can reset `thenableState` at the end.
      // It should get inlined by Closure.
      thenableIndexCounter = 0;
      var firstChildFiber = reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes);
      thenableState = null; // Don't bother to reset `thenableIndexCounter` to 0 because it always gets
      // set at the beginning.

      return firstChildFiber;
    } catch (x) {
      if (x === SuspenseException || x === SuspenseActionException || !disableLegacyMode && (returnFiber.mode & ConcurrentMode) === NoMode && typeof x === 'object' && x !== null && typeof x.then === 'function') {
        // Suspense exceptions need to read the current suspended state before
        // yielding and replay it using the same sequence so this trick doesn't
        // work here.
        // Suspending in legacy mode actually mounts so if we let the child
        // mount then we delete its state in an update.
        throw x;
      } // Something errored during reconciliation but it's conceptually a child that
      // errored and not the current component itself so we create a virtual child
      // that throws in its begin phase. That way the current component can handle
      // the error or suspending if needed.


      var throwFiber = createFiberFromThrow(x, returnFiber.mode, lanes);
      throwFiber.return = returnFiber;

      if (__DEV__) {
        var debugInfo = throwFiber._debugInfo = currentDebugInfo; // Conceptually the error's owner/task should ideally be captured when the
        // Error constructor is called but neither console.createTask does this,
        // nor do we override them to capture our `owner`. So instead, we use the
        // nearest parent as the owner/task of the error. This is usually the same
        // thing when it's thrown from the same async component but not if you await
        // a promise started from a different component/task.

        throwFiber._debugOwner = returnFiber._debugOwner;
        throwFiber._debugTask = returnFiber._debugTask;

        if (debugInfo != null) {
          for (var i = debugInfo.length - 1; i >= 0; i--) {
            if (typeof debugInfo[i].stack === 'string') {
              throwFiber._debugOwner = debugInfo[i];
              throwFiber._debugTask = debugInfo[i].debugTask;
              break;
            }
          }
        }
      }

      return throwFiber;
    } finally {
      currentDebugInfo = prevDebugInfo;
    }
  }

  return reconcileChildFibers;
}

export var reconcileChildFibers = createChildReconciler(true);
export var mountChildFibers = createChildReconciler(false);
export function resetChildReconcilerOnUnwind() {
  // On unwind, clear any pending thenables that were used.
  thenableState = null;
  thenableIndexCounter = 0;
}
export function cloneChildFibers(current, workInProgress) {
  if (current !== null && workInProgress.child !== current.child) {
    throw new Error('Resuming work not yet implemented.');
  }

  if (workInProgress.child === null) {
    return;
  }

  var currentChild = workInProgress.child;
  var newChild = createWorkInProgress(currentChild, currentChild.pendingProps);
  workInProgress.child = newChild;
  newChild.return = workInProgress;

  while (currentChild.sibling !== null) {
    currentChild = currentChild.sibling;
    newChild = newChild.sibling = createWorkInProgress(currentChild, currentChild.pendingProps);
    newChild.return = workInProgress;
  }

  newChild.sibling = null;
} // Reset a workInProgress child set to prepare it for a second pass.

export function resetChildFibers(workInProgress, lanes) {
  var child = workInProgress.child;

  while (child !== null) {
    resetWorkInProgress(child, lanes);
    child = child.sibling;
  }
}

function validateSuspenseListNestedChild(childSlot, index) {
  if (__DEV__) {
    var isAnArray = isArray(childSlot);
    var isIterable = !isAnArray && typeof getIteratorFn(childSlot) === 'function';
    var isAsyncIterable = enableAsyncIterableChildren && typeof childSlot === 'object' && childSlot !== null && typeof childSlot[ASYNC_ITERATOR] === 'function';

    if (isAnArray || isIterable || isAsyncIterable) {
      var type = isAnArray ? 'array' : isAsyncIterable ? 'async iterable' : 'iterable';
      console.error('A nested %s was passed to row #%s in <SuspenseList />. Wrap it in ' + 'an additional SuspenseList to configure its revealOrder: ' + '<SuspenseList revealOrder=...> ... ' + '<SuspenseList revealOrder=...>{%s}</SuspenseList> ... ' + '</SuspenseList>', type, index, type);
      return false;
    }
  }

  return true;
}

export function validateSuspenseListChildren(children, revealOrder) {
  if (__DEV__) {
    if ((revealOrder === 'forwards' || revealOrder === 'backwards') && children !== undefined && children !== null && children !== false) {
      if (isArray(children)) {
        for (var i = 0; i < children.length; i++) {
          if (!validateSuspenseListNestedChild(children[i], i)) {
            return;
          }
        }
      } else {
        var iteratorFn = getIteratorFn(children);

        if (typeof iteratorFn === 'function') {
          var childrenIterator = iteratorFn.call(children);

          if (childrenIterator) {
            var step = childrenIterator.next();
            var _i = 0;

            for (; !step.done; step = childrenIterator.next()) {
              if (!validateSuspenseListNestedChild(step.value, _i)) {
                return;
              }

              _i++;
            }
          }
        } else if (enableAsyncIterableChildren && typeof children[ASYNC_ITERATOR] === 'function') {// TODO: Technically we should warn for nested arrays inside the
          // async iterable but it would require unwrapping the array.
          // However, this mistake is not as easy to make so it's ok not to warn.
        } else if (enableAsyncIterableChildren && children.$$typeof === REACT_ELEMENT_TYPE && typeof children.type === 'function' && ( // $FlowFixMe
        Object.prototype.toString.call(children.type) === '[object GeneratorFunction]' || // $FlowFixMe
        Object.prototype.toString.call(children.type) === '[object AsyncGeneratorFunction]')) {
          console.error('A generator Component was passed to a <SuspenseList revealOrder="%s" />. ' + 'This is not supported as a way to generate lists. Instead, pass an ' + 'iterable as the children.', revealOrder);
        } else {
          console.error('A single row was passed to a <SuspenseList revealOrder="%s" />. ' + 'This is not useful since it needs multiple rows. ' + 'Did you mean to pass multiple children or an array?', revealOrder);
        }
      }
    }
  }
}