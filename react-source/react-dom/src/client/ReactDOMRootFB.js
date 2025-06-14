/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { createRoot as createRootImpl, hydrateRoot as hydrateRootImpl } from './ReactDOMRoot';
import { disableLegacyMode, disableCommentsAsDOMContainers } from 'shared/ReactFeatureFlags';
import { clearContainer } from 'react-dom-bindings/src/client/ReactFiberConfigDOM';
import { getInstanceFromNode, isContainerMarkedAsRoot, markContainerAsRoot, unmarkContainerAsRoot } from 'react-dom-bindings/src/client/ReactDOMComponentTree';
import { listenToAllSupportedEvents } from 'react-dom-bindings/src/events/DOMPluginEventSystem';
import { isValidContainer } from 'react-dom-bindings/src/client/ReactDOMContainer';
import { DOCUMENT_NODE, ELEMENT_NODE, COMMENT_NODE } from 'react-dom-bindings/src/client/HTMLNodeType';
import { batchedUpdates, createContainer, createHydrationContainer, findHostInstanceWithNoPortals, updateContainer, updateContainerSync, flushSyncWork, getPublicRootInstance, findHostInstance, findHostInstanceWithWarning, defaultOnUncaughtError, defaultOnCaughtError } from 'react-reconciler/src/ReactFiberReconciler';
import { LegacyRoot } from 'react-reconciler/src/ReactRootTags';
import getComponentNameFromType from 'shared/getComponentNameFromType';
import { current as currentOwner, isRendering } from 'react-reconciler/src/ReactCurrentFiber';
import assign from 'shared/assign';
import noop from 'shared/noop'; // Provided by www

var ReactFiberErrorDialogWWW = require('ReactFiberErrorDialog');

if (typeof ReactFiberErrorDialogWWW.showErrorDialog !== 'function') {
  throw new Error('Expected ReactFiberErrorDialog.showErrorDialog to be a function.');
}

function wwwOnUncaughtError(error, errorInfo) {
  var componentStack = errorInfo.componentStack != null ? errorInfo.componentStack : '';
  var logError = ReactFiberErrorDialogWWW.showErrorDialog({
    errorBoundary: null,
    error: error,
    componentStack: componentStack
  }); // Allow injected showErrorDialog() to prevent default console.error logging.
  // This enables renderers like ReactNative to better manage redbox behavior.

  if (logError === false) {
    return;
  }

  defaultOnUncaughtError(error, errorInfo);
}

function wwwOnCaughtError(error, errorInfo) {
  var errorBoundary = errorInfo.errorBoundary;
  var componentStack = errorInfo.componentStack != null ? errorInfo.componentStack : '';
  var logError = ReactFiberErrorDialogWWW.showErrorDialog({
    errorBoundary: errorBoundary,
    error: error,
    componentStack: componentStack
  }); // Allow injected showErrorDialog() to prevent default console.error logging.
  // This enables renderers like ReactNative to better manage redbox behavior.

  if (logError === false) {
    return;
  }

  defaultOnCaughtError(error, errorInfo);
}

export function createRoot(container, options) {
  return createRootImpl(container, assign({
    onUncaughtError: wwwOnUncaughtError,
    onCaughtError: wwwOnCaughtError
  }, options));
}
export function hydrateRoot(container, initialChildren, options) {
  return hydrateRootImpl(container, initialChildren, assign({
    onUncaughtError: wwwOnUncaughtError,
    onCaughtError: wwwOnCaughtError
  }, options));
}
var topLevelUpdateWarnings;

if (__DEV__) {
  topLevelUpdateWarnings = function (container) {
    if (container._reactRootContainer && container.nodeType !== COMMENT_NODE) {
      var hostInstance = findHostInstanceWithNoPortals(container._reactRootContainer.current);

      if (hostInstance) {
        if (hostInstance.parentNode !== container) {
          console.error('It looks like the React-rendered content of this ' + 'container was removed without using React. This is not ' + 'supported and will cause errors. Instead, call ' + 'ReactDOM.unmountComponentAtNode to empty a container.');
        }
      }
    }

    var isRootRenderedBySomeReact = !!container._reactRootContainer;
    var rootEl = getReactRootElementInContainer(container);
    var hasNonRootReactChild = !!(rootEl && getInstanceFromNode(rootEl));

    if (hasNonRootReactChild && !isRootRenderedBySomeReact) {
      console.error('Replacing React-rendered children with a new root ' + 'component. If you intended to update the children of this node, ' + 'you should instead have the existing children update their state ' + 'and render the new components instead of calling ReactDOM.render.');
    }
  };
}

function getReactRootElementInContainer(container) {
  if (!container) {
    return null;
  }

  if (container.nodeType === DOCUMENT_NODE) {
    return container.documentElement;
  } else {
    return container.firstChild;
  }
} // This isn't reachable because onRecoverableError isn't called in the
// legacy API.


var noopOnRecoverableError = noop;
var noopOnDefaultTransitionIndicator = noop;

function legacyCreateRootFromDOMContainer(container, initialChildren, parentComponent, callback, isHydrationContainer) {
  if (isHydrationContainer) {
    if (typeof callback === 'function') {
      var originalCallback = callback;

      callback = function () {
        var instance = getPublicRootInstance(root);
        originalCallback.call(instance);
      };
    }

    var root = createHydrationContainer(initialChildren, callback, container, LegacyRoot, null, // hydrationCallbacks
    false, // isStrictMode
    false, // concurrentUpdatesByDefaultOverride,
    '', // identifierPrefix
    wwwOnUncaughtError, wwwOnCaughtError, noopOnRecoverableError, noopOnDefaultTransitionIndicator, // TODO(luna) Support hydration later
    null, null);
    container._reactRootContainer = root;
    markContainerAsRoot(root.current, container);
    var rootContainerElement = !disableCommentsAsDOMContainers && container.nodeType === COMMENT_NODE ? container.parentNode : container; // $FlowFixMe[incompatible-call]

    listenToAllSupportedEvents(rootContainerElement);
    flushSyncWork();
    return root;
  } else {
    // First clear any existing content.
    clearContainer(container);

    if (typeof callback === 'function') {
      var _originalCallback = callback;

      callback = function () {
        var instance = getPublicRootInstance(_root);

        _originalCallback.call(instance);
      };
    }

    var _root = createContainer(container, LegacyRoot, null, // hydrationCallbacks
    false, // isStrictMode
    false, // concurrentUpdatesByDefaultOverride,
    '', // identifierPrefix
    wwwOnUncaughtError, wwwOnCaughtError, noopOnRecoverableError, noopOnDefaultTransitionIndicator, null // transitionCallbacks
    );

    container._reactRootContainer = _root;
    markContainerAsRoot(_root.current, container);

    var _rootContainerElement = !disableCommentsAsDOMContainers && container.nodeType === COMMENT_NODE ? container.parentNode : container; // $FlowFixMe[incompatible-call]


    listenToAllSupportedEvents(_rootContainerElement); // Initial mount should not be batched.

    updateContainerSync(initialChildren, _root, parentComponent, callback);
    flushSyncWork();
    return _root;
  }
}

function warnOnInvalidCallback(callback) {
  if (__DEV__) {
    if (callback !== null && typeof callback !== 'function') {
      console.error('Expected the last optional `callback` argument to be a ' + 'function. Instead received: %s.', callback);
    }
  }
}

function legacyRenderSubtreeIntoContainer(parentComponent, children, container, forceHydrate, callback) {
  if (__DEV__) {
    topLevelUpdateWarnings(container);
    warnOnInvalidCallback(callback === undefined ? null : callback);
  }

  var maybeRoot = container._reactRootContainer;
  var root;

  if (!maybeRoot) {
    // Initial mount
    root = legacyCreateRootFromDOMContainer(container, children, parentComponent, callback, forceHydrate);
  } else {
    root = maybeRoot;

    if (typeof callback === 'function') {
      var originalCallback = callback;

      callback = function () {
        var instance = getPublicRootInstance(root);
        originalCallback.call(instance);
      };
    } // Update


    updateContainer(children, root, parentComponent, callback);
  }

  return getPublicRootInstance(root);
}

export function findDOMNode(componentOrElement) {
  if (__DEV__) {
    var owner = currentOwner;

    if (owner !== null && isRendering && owner.stateNode !== null) {
      var warnedAboutRefsInRender = owner.stateNode._warnedAboutRefsInRender;

      if (!warnedAboutRefsInRender) {
        console.error('%s is accessing findDOMNode inside its render(). ' + 'render() should be a pure function of props and state. It should ' + 'never access something that requires stale data from the previous ' + 'render, such as refs. Move this logic to componentDidMount and ' + 'componentDidUpdate instead.', getComponentNameFromType(owner.type) || 'A component');
      }

      owner.stateNode._warnedAboutRefsInRender = true;
    }
  }

  if (componentOrElement == null) {
    return null;
  }

  if (componentOrElement.nodeType === ELEMENT_NODE) {
    return componentOrElement;
  }

  if (__DEV__) {
    return findHostInstanceWithWarning(componentOrElement, 'findDOMNode');
  }

  return findHostInstance(componentOrElement);
}
export function render(element, container, callback) {
  if (disableLegacyMode) {
    if (__DEV__) {
      console.error('ReactDOM.render was removed in React 19. Use createRoot instead.');
    }

    throw new Error('ReactDOM: Unsupported Legacy Mode API.');
  }

  if (__DEV__) {
    console.error('ReactDOM.render has not been supported since React 18. Use createRoot ' + 'instead. Until you switch to the new API, your app will behave as ' + "if it's running React 17. Learn " + 'more: https://react.dev/link/switch-to-createroot');
  }

  if (!isValidContainer(container)) {
    throw new Error('Target container is not a DOM element.');
  }

  if (__DEV__) {
    var isModernRoot = isContainerMarkedAsRoot(container) && container._reactRootContainer === undefined;

    if (isModernRoot) {
      console.error('You are calling ReactDOM.render() on a container that was previously ' + 'passed to ReactDOMClient.createRoot(). This is not supported. ' + 'Did you mean to call root.render(element)?');
    }
  }

  return legacyRenderSubtreeIntoContainer(null, element, container, false, callback);
}
export function unmountComponentAtNode(container) {
  if (disableLegacyMode) {
    if (__DEV__) {
      console.error('unmountComponentAtNode was removed in React 19. Use root.unmount() instead.');
    }

    throw new Error('ReactDOM: Unsupported Legacy Mode API.');
  }

  if (!isValidContainer(container)) {
    throw new Error('Target container is not a DOM element.');
  }

  if (__DEV__) {
    var isModernRoot = isContainerMarkedAsRoot(container) && container._reactRootContainer === undefined;

    if (isModernRoot) {
      console.error('You are calling ReactDOM.unmountComponentAtNode() on a container that was previously ' + 'passed to ReactDOMClient.createRoot(). This is not supported. Did you mean to call root.unmount()?');
    }
  }

  if (container._reactRootContainer) {
    var root = container._reactRootContainer;

    if (__DEV__) {
      var rootEl = getReactRootElementInContainer(container);
      var renderedByDifferentReact = rootEl && !getInstanceFromNode(rootEl);

      if (renderedByDifferentReact) {
        console.error("unmountComponentAtNode(): The node you're attempting to unmount " + 'was rendered by another copy of React.');
      }
    }

    updateContainerSync(null, root, null, null);
    flushSyncWork(); // $FlowFixMe[incompatible-type] This should probably use `delete container._reactRootContainer`

    container._reactRootContainer = null;
    unmarkContainerAsRoot(container);
    return true;
  } else {
    if (__DEV__) {
      var _rootEl = getReactRootElementInContainer(container);

      var hasNonRootReactChild = !!(_rootEl && getInstanceFromNode(_rootEl)); // Check if the container itself is a React root node.

      var isContainerReactRoot = container.nodeType === ELEMENT_NODE && isValidContainer(container.parentNode) && // $FlowFixMe[prop-missing]
      // $FlowFixMe[incompatible-use]
      !!container.parentNode._reactRootContainer;

      if (hasNonRootReactChild) {
        console.error("unmountComponentAtNode(): The node you're attempting to unmount " + 'was rendered by React and is not a top-level container. %s', isContainerReactRoot ? 'You may have accidentally passed in a React root node instead ' + 'of its container.' : 'Instead, have the parent component update its state and ' + 'rerender in order to remove this component.');
      }
    }

    return false;
  }
}
export { batchedUpdates as unstable_batchedUpdates };