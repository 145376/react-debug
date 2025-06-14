/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { checkFormFieldValueStringCoercion } from 'shared/CheckStringCoercion';

function isCheckable(elem) {
  var type = elem.type;
  var nodeName = elem.nodeName;
  return nodeName && nodeName.toLowerCase() === 'input' && (type === 'checkbox' || type === 'radio');
}

function getTracker(node) {
  return node._valueTracker;
}

function detachTracker(node) {
  node._valueTracker = null;
}

function getValueFromNode(node) {
  var value = '';

  if (!node) {
    return value;
  }

  if (isCheckable(node)) {
    value = node.checked ? 'true' : 'false';
  } else {
    value = node.value;
  }

  return value;
}

function trackValueOnNode(node, valueField, currentValue) {
  var descriptor = Object.getOwnPropertyDescriptor(node.constructor.prototype, valueField); // if someone has already defined a value or Safari, then bail
  // and don't track value will cause over reporting of changes,
  // but it's better then a hard failure
  // (needed for certain tests that spyOn input values and Safari)

  if (node.hasOwnProperty(valueField) || typeof descriptor === 'undefined' || typeof descriptor.get !== 'function' || typeof descriptor.set !== 'function') {
    return;
  }

  var get = descriptor.get,
      set = descriptor.set;
  Object.defineProperty(node, valueField, {
    configurable: true,
    // $FlowFixMe[missing-this-annot]
    get: function () {
      return get.call(this);
    },
    // $FlowFixMe[missing-local-annot]
    // $FlowFixMe[missing-this-annot]
    set: function (value) {
      if (__DEV__) {
        checkFormFieldValueStringCoercion(value);
      }

      currentValue = '' + value;
      set.call(this, value);
    }
  }); // We could've passed this the first time
  // but it triggers a bug in IE11 and Edge 14/15.
  // Calling defineProperty() again should be equivalent.
  // https://github.com/facebook/react/issues/11768

  Object.defineProperty(node, valueField, {
    enumerable: descriptor.enumerable
  });
  var tracker = {
    getValue: function () {
      return currentValue;
    },
    setValue: function (value) {
      if (__DEV__) {
        checkFormFieldValueStringCoercion(value);
      }

      currentValue = '' + value;
    },
    stopTracking: function () {
      detachTracker(node);
      delete node[valueField];
    }
  };
  return tracker;
}

export function track(node) {
  if (getTracker(node)) {
    return;
  }

  var valueField = isCheckable(node) ? 'checked' : 'value'; // This is read from the DOM so always safe to coerce. We really shouldn't
  // be coercing to a string at all. It's just historical.
  // eslint-disable-next-line react-internal/safe-string-coercion

  var initialValue = '' + node[valueField];
  node._valueTracker = trackValueOnNode(node, valueField, initialValue);
}
export function trackHydrated(node, initialValue, initialChecked) {
  // For hydration, the initial value is not the current value but the value
  // that we last observed which is what the initial server render was.
  if (getTracker(node)) {
    return false;
  }

  var valueField;
  var expectedValue;

  if (isCheckable(node)) {
    valueField = 'checked'; // eslint-disable-next-line react-internal/safe-string-coercion

    expectedValue = '' + initialChecked;
  } else {
    valueField = 'value';
    expectedValue = initialValue;
  } // eslint-disable-next-line react-internal/safe-string-coercion


  var currentValue = '' + node[valueField];
  node._valueTracker = trackValueOnNode(node, valueField, expectedValue);
  return currentValue !== expectedValue;
}
export function updateValueIfChanged(node) {
  if (!node) {
    return false;
  }

  var tracker = getTracker(node); // if there is no tracker at this point it's unlikely
  // that trying again will succeed

  if (!tracker) {
    return true;
  }

  var lastValue = tracker.getValue();
  var nextValue = getValueFromNode(node);

  if (nextValue !== lastValue) {
    tracker.setValue(nextValue);
    return true;
  }

  return false;
}
export function stopTracking(node) {
  var tracker = getTracker(node);

  if (tracker) {
    tracker.stopTracking();
  }
}