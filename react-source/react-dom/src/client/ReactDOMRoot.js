/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { isValidContainer } from 'react-dom-bindings/src/client/ReactDOMContainer';
import { queueExplicitHydrationTarget } from 'react-dom-bindings/src/events/ReactDOMEventReplaying';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { disableCommentsAsDOMContainers, enableDefaultTransitionIndicator } from 'shared/ReactFeatureFlags';
import { isContainerMarkedAsRoot, markContainerAsRoot, unmarkContainerAsRoot } from 'react-dom-bindings/src/client/ReactDOMComponentTree';
import { listenToAllSupportedEvents } from 'react-dom-bindings/src/events/DOMPluginEventSystem';
import { COMMENT_NODE } from 'react-dom-bindings/src/client/HTMLNodeType';
import { createContainer, createHydrationContainer, updateContainer, updateContainerSync, flushSyncWork, isAlreadyRendering, defaultOnUncaughtError, defaultOnCaughtError, defaultOnRecoverableError } from 'react-reconciler/src/ReactFiberReconciler';
import { defaultOnDefaultTransitionIndicator } from './ReactDOMDefaultTransitionIndicator';
import { ConcurrentRoot } from 'react-reconciler/src/ReactRootTags'; // $FlowFixMe[missing-this-annot]

function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
} // $FlowFixMe[prop-missing] found when upgrading Flow


ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render = // $FlowFixMe[missing-this-annot]
function (children) {
  var root = this._internalRoot;

  if (root === null) {
    throw new Error('Cannot update an unmounted root.');
  }

  if (__DEV__) {
    // using a reference to `arguments` bails out of GCC optimizations which affect function arity
    var args = arguments;

    if (typeof args[1] === 'function') {
      console.error('does not support the second callback argument. ' + 'To execute a side effect after rendering, declare it in a component body with useEffect().');
    } else if (isValidContainer(args[1])) {
      console.error('You passed a container to the second argument of root.render(...). ' + "You don't need to pass it again since you already passed it to create the root.");
    } else if (typeof args[1] !== 'undefined') {
      console.error('You passed a second argument to root.render(...) but it only accepts ' + 'one argument.');
    }
  }

  updateContainer(children, root, null, null);
}; // $FlowFixMe[prop-missing] found when upgrading Flow


ReactDOMHydrationRoot.prototype.unmount = ReactDOMRoot.prototype.unmount = // $FlowFixMe[missing-this-annot]
function () {
  if (__DEV__) {
    // using a reference to `arguments` bails out of GCC optimizations which affect function arity
    var args = arguments;

    if (typeof args[0] === 'function') {
      console.error('does not support a callback argument. ' + 'To execute a side effect after rendering, declare it in a component body with useEffect().');
    }
  }

  var root = this._internalRoot;

  if (root !== null) {
    this._internalRoot = null;
    var container = root.containerInfo;

    if (__DEV__) {
      if (isAlreadyRendering()) {
        console.error('Attempted to synchronously unmount a root while React was already ' + 'rendering. React cannot finish unmounting the root until the ' + 'current render has completed, which may lead to a race condition.');
      }
    }

    updateContainerSync(null, root, null, null);
    flushSyncWork();
    unmarkContainerAsRoot(container);
  }
};

export function createRoot(container, options) {
  if (!isValidContainer(container)) {
    throw new Error('Target container is not a DOM element.');
  }

  warnIfReactDOMContainerInDEV(container);
  var concurrentUpdatesByDefaultOverride = false;
  var isStrictMode = false;
  var identifierPrefix = '';
  var onUncaughtError = defaultOnUncaughtError;
  var onCaughtError = defaultOnCaughtError;
  var onRecoverableError = defaultOnRecoverableError;
  var onDefaultTransitionIndicator = defaultOnDefaultTransitionIndicator;
  var transitionCallbacks = null;

  if (options !== null && options !== undefined) {
    if (__DEV__) {
      if (options.hydrate) {
        console.warn('hydrate through createRoot is deprecated. Use ReactDOMClient.hydrateRoot(container, <App />) instead.');
      } else {
        if (typeof options === 'object' && options !== null && options.$$typeof === REACT_ELEMENT_TYPE) {
          console.error('You passed a JSX element to createRoot. You probably meant to ' + 'call root.render instead. ' + 'Example usage:\n\n' + '  let root = createRoot(domContainer);\n' + '  root.render(<App />);');
        }
      }
    }

    if (options.unstable_strictMode === true) {
      isStrictMode = true;
    }

    if (options.identifierPrefix !== undefined) {
      identifierPrefix = options.identifierPrefix;
    }

    if (options.onUncaughtError !== undefined) {
      onUncaughtError = options.onUncaughtError;
    }

    if (options.onCaughtError !== undefined) {
      onCaughtError = options.onCaughtError;
    }

    if (options.onRecoverableError !== undefined) {
      onRecoverableError = options.onRecoverableError;
    }

    if (enableDefaultTransitionIndicator) {
      if (options.onDefaultTransitionIndicator !== undefined) {
        onDefaultTransitionIndicator = options.onDefaultTransitionIndicator;
      }
    }

    if (options.unstable_transitionCallbacks !== undefined) {
      transitionCallbacks = options.unstable_transitionCallbacks;
    }
  }

  var root = createContainer(container, ConcurrentRoot, null, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator, transitionCallbacks);
  markContainerAsRoot(root.current, container);
  var rootContainerElement = !disableCommentsAsDOMContainers && container.nodeType === COMMENT_NODE ? container.parentNode : container;
  listenToAllSupportedEvents(rootContainerElement); // $FlowFixMe[invalid-constructor] Flow no longer supports calling new on functions

  return new ReactDOMRoot(root);
} // $FlowFixMe[missing-this-annot]

function ReactDOMHydrationRoot(internalRoot) {
  this._internalRoot = internalRoot;
}

function scheduleHydration(target) {
  if (target) {
    queueExplicitHydrationTarget(target);
  }
} // $FlowFixMe[prop-missing] found when upgrading Flow


ReactDOMHydrationRoot.prototype.unstable_scheduleHydration = scheduleHydration;
export function hydrateRoot(container, initialChildren, options) {
  if (!isValidContainer(container)) {
    throw new Error('Target container is not a DOM element.');
  }

  warnIfReactDOMContainerInDEV(container);

  if (__DEV__) {
    if (initialChildren === undefined) {
      console.error('Must provide initial children as second argument to hydrateRoot. ' + 'Example usage: hydrateRoot(domContainer, <App />)');
    }
  } // For now we reuse the whole bag of options since they contain
  // the hydration callbacks.


  var hydrationCallbacks = options != null ? options : null;
  var concurrentUpdatesByDefaultOverride = false;
  var isStrictMode = false;
  var identifierPrefix = '';
  var onUncaughtError = defaultOnUncaughtError;
  var onCaughtError = defaultOnCaughtError;
  var onRecoverableError = defaultOnRecoverableError;
  var onDefaultTransitionIndicator = defaultOnDefaultTransitionIndicator;
  var transitionCallbacks = null;
  var formState = null;

  if (options !== null && options !== undefined) {
    if (options.unstable_strictMode === true) {
      isStrictMode = true;
    }

    if (options.identifierPrefix !== undefined) {
      identifierPrefix = options.identifierPrefix;
    }

    if (options.onUncaughtError !== undefined) {
      onUncaughtError = options.onUncaughtError;
    }

    if (options.onCaughtError !== undefined) {
      onCaughtError = options.onCaughtError;
    }

    if (options.onRecoverableError !== undefined) {
      onRecoverableError = options.onRecoverableError;
    }

    if (enableDefaultTransitionIndicator) {
      if (options.onDefaultTransitionIndicator !== undefined) {
        onDefaultTransitionIndicator = options.onDefaultTransitionIndicator;
      }
    }

    if (options.unstable_transitionCallbacks !== undefined) {
      transitionCallbacks = options.unstable_transitionCallbacks;
    }

    if (options.formState !== undefined) {
      formState = options.formState;
    }
  }

  var root = createHydrationContainer(initialChildren, null, container, ConcurrentRoot, hydrationCallbacks, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator, transitionCallbacks, formState);
  markContainerAsRoot(root.current, container); // This can't be a comment node since hydration doesn't work on comment nodes anyway.

  listenToAllSupportedEvents(container); // $FlowFixMe[invalid-constructor] Flow no longer supports calling new on functions

  return new ReactDOMHydrationRoot(root);
}

function warnIfReactDOMContainerInDEV(container) {
  if (__DEV__) {
    if (isContainerMarkedAsRoot(container)) {
      if (container._reactRootContainer) {
        console.error('You are calling ReactDOMClient.createRoot() on a container that was previously ' + 'passed to ReactDOM.render(). This is not supported.');
      } else {
        console.error('You are calling ReactDOMClient.createRoot() on a container that ' + 'has already been passed to createRoot() before. Instead, call ' + 'root.render() on the existing root instead if you want to update it.');
      }
    }
  }
}