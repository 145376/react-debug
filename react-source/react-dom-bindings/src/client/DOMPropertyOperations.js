/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import isAttributeNameSafe from '../shared/isAttributeNameSafe';
import { enableTrustedTypesIntegration } from 'shared/ReactFeatureFlags';
import { checkAttributeStringCoercion } from 'shared/CheckStringCoercion';
import { getFiberCurrentPropsFromNode } from './ReactDOMComponentTree';
import { trackHostMutation } from 'react-reconciler/src/ReactFiberMutationTracking';
/**
 * Get the value for a attribute on a node. Only used in DEV for SSR validation.
 * The third argument is used as a hint of what the expected value is. Some
 * attributes have multiple equivalent values.
 */

export function getValueForAttribute(node, name, expected) {
  if (__DEV__) {
    if (!isAttributeNameSafe(name)) {
      return;
    }

    if (!node.hasAttribute(name)) {
      // shouldRemoveAttribute
      switch (typeof expected) {
        case 'function':
        case 'symbol':
          return expected;

        case 'boolean':
          {
            var prefix = name.toLowerCase().slice(0, 5);

            if (prefix !== 'data-' && prefix !== 'aria-') {
              return expected;
            }
          }
      }

      return expected === undefined ? undefined : null;
    }

    var value = node.getAttribute(name);

    if (__DEV__) {
      checkAttributeStringCoercion(expected, name);
    }

    if (value === '' + expected) {
      return expected;
    }

    return value;
  }
}
export function getValueForAttributeOnCustomComponent(node, name, expected) {
  if (__DEV__) {
    if (!isAttributeNameSafe(name)) {
      return;
    }

    if (!node.hasAttribute(name)) {
      // shouldRemoveAttribute
      switch (typeof expected) {
        case 'symbol':
        case 'object':
          // Symbols and objects are ignored when they're emitted so
          // it would be expected that they end up not having an attribute.
          return expected;

        case 'function':
          return expected;

        case 'boolean':
          if (expected === false) {
            return expected;
          }

      }

      return expected === undefined ? undefined : null;
    }

    var value = node.getAttribute(name);

    if (value === '' && expected === true) {
      return true;
    }

    if (__DEV__) {
      checkAttributeStringCoercion(expected, name);
    }

    if (value === '' + expected) {
      return expected;
    }

    return value;
  }
}
export function setValueForAttribute(node, name, value) {
  if (isAttributeNameSafe(name)) {
    // If the prop isn't in the special list, treat it as a simple attribute.
    // shouldRemoveAttribute
    if (value === null) {
      node.removeAttribute(name);
      return;
    }

    switch (typeof value) {
      case 'undefined':
      case 'function':
      case 'symbol':
        node.removeAttribute(name);
        return;

      case 'boolean':
        {
          var prefix = name.toLowerCase().slice(0, 5);

          if (prefix !== 'data-' && prefix !== 'aria-') {
            node.removeAttribute(name);
            return;
          }
        }
    }

    if (__DEV__) {
      checkAttributeStringCoercion(value, name);
    }

    node.setAttribute(name, enableTrustedTypesIntegration ? value : '' + value);
  }
}
export function setValueForKnownAttribute(node, name, value) {
  if (value === null) {
    node.removeAttribute(name);
    return;
  }

  switch (typeof value) {
    case 'undefined':
    case 'function':
    case 'symbol':
    case 'boolean':
      {
        node.removeAttribute(name);
        return;
      }
  }

  if (__DEV__) {
    checkAttributeStringCoercion(value, name);
  }

  node.setAttribute(name, enableTrustedTypesIntegration ? value : '' + value);
}
export function setValueForNamespacedAttribute(node, namespace, name, value) {
  if (value === null) {
    node.removeAttribute(name);
    return;
  }

  switch (typeof value) {
    case 'undefined':
    case 'function':
    case 'symbol':
    case 'boolean':
      {
        node.removeAttribute(name);
        return;
      }
  }

  if (__DEV__) {
    checkAttributeStringCoercion(value, name);
  }

  node.setAttributeNS(namespace, name, enableTrustedTypesIntegration ? value : '' + value);
}
export function setValueForPropertyOnCustomComponent(node, name, value) {
  if (name[0] === 'o' && name[1] === 'n') {
    var useCapture = name.endsWith('Capture');
    var eventName = name.slice(2, useCapture ? name.length - 7 : undefined);
    var prevProps = getFiberCurrentPropsFromNode(node); // $FlowFixMe[invalid-computed-prop]

    var prevValue = prevProps != null ? prevProps[name] : null;

    if (typeof prevValue === 'function') {
      node.removeEventListener(eventName, prevValue, useCapture);
    }

    if (typeof value === 'function') {
      if (typeof prevValue !== 'function' && prevValue !== null) {
        // If we previously assigned a non-function type into this node, then
        // remove it when switching to event listener mode.
        if (name in node) {
          node[name] = null;
        } else if (node.hasAttribute(name)) {
          node.removeAttribute(name);
        }
      } // $FlowFixMe[incompatible-cast] value can't be casted to EventListener.


      node.addEventListener(eventName, value, useCapture);
      return;
    }
  }

  trackHostMutation();

  if (name in node) {
    node[name] = value;
    return;
  }

  if (value === true) {
    node.setAttribute(name, '');
    return;
  } // From here, it's the same as any attribute


  setValueForAttribute(node, name, value);
}