/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// TODO: direct imports like some-package/src/* are bad. Fix me.
import { getCurrentFiberOwnerNameInDevOrNull } from 'react-reconciler/src/ReactCurrentFiber';
import { getToStringValue, toString } from './ToStringValue';
import isArray from 'shared/isArray';
import { queueChangeEvent } from '../events/ReactDOMEventReplaying';
var didWarnValueDefaultValue;

if (__DEV__) {
  didWarnValueDefaultValue = false;
}

function getDeclarationErrorAddendum() {
  var ownerName = getCurrentFiberOwnerNameInDevOrNull();

  if (ownerName) {
    return '\n\nCheck the render method of `' + ownerName + '`.';
  }

  return '';
}

var valuePropNames = ['value', 'defaultValue'];
/**
 * Validation function for `value` and `defaultValue`.
 */

function checkSelectPropTypes(props) {
  if (__DEV__) {
    for (var i = 0; i < valuePropNames.length; i++) {
      var propName = valuePropNames[i];

      if (props[propName] == null) {
        continue;
      }

      var propNameIsArray = isArray(props[propName]);

      if (props.multiple && !propNameIsArray) {
        console.error('The `%s` prop supplied to <select> must be an array if ' + '`multiple` is true.%s', propName, getDeclarationErrorAddendum());
      } else if (!props.multiple && propNameIsArray) {
        console.error('The `%s` prop supplied to <select> must be a scalar ' + 'value if `multiple` is false.%s', propName, getDeclarationErrorAddendum());
      }
    }
  }
}

function updateOptions(node, multiple, propValue, setDefaultSelected) {
  var options = node.options;

  if (multiple) {
    var selectedValues = propValue;
    var selectedValue = {};

    for (var i = 0; i < selectedValues.length; i++) {
      // Prefix to avoid chaos with special keys.
      selectedValue['$' + selectedValues[i]] = true;
    }

    for (var _i = 0; _i < options.length; _i++) {
      var selected = selectedValue.hasOwnProperty('$' + options[_i].value);

      if (options[_i].selected !== selected) {
        options[_i].selected = selected;
      }

      if (selected && setDefaultSelected) {
        options[_i].defaultSelected = true;
      }
    }
  } else {
    // Do not set `select.value` as exact behavior isn't consistent across all
    // browsers for all cases.
    var _selectedValue = toString(getToStringValue(propValue));

    var defaultSelected = null;

    for (var _i2 = 0; _i2 < options.length; _i2++) {
      if (options[_i2].value === _selectedValue) {
        options[_i2].selected = true;

        if (setDefaultSelected) {
          options[_i2].defaultSelected = true;
        }

        return;
      }

      if (defaultSelected === null && !options[_i2].disabled) {
        defaultSelected = options[_i2];
      }
    }

    if (defaultSelected !== null) {
      defaultSelected.selected = true;
    }
  }
}
/**
 * Implements a <select> host component that allows optionally setting the
 * props `value` and `defaultValue`. If `multiple` is false, the prop must be a
 * stringable. If `multiple` is true, the prop must be an array of stringables.
 *
 * If `value` is not supplied (or null/undefined), user actions that change the
 * selected option will trigger updates to the rendered options.
 *
 * If it is supplied (and not null/undefined), the rendered options will not
 * update in response to user actions. Instead, the `value` prop must change in
 * order for the rendered options to update.
 *
 * If `defaultValue` is provided, any options with the supplied values will be
 * selected.
 */


export function validateSelectProps(element, props) {
  if (__DEV__) {
    checkSelectPropTypes(props);

    if (props.value !== undefined && props.defaultValue !== undefined && !didWarnValueDefaultValue) {
      console.error('Select elements must be either controlled or uncontrolled ' + '(specify either the value prop, or the defaultValue prop, but not ' + 'both). Decide between using a controlled or uncontrolled select ' + 'element and remove one of these props. More info: ' + 'https://react.dev/link/controlled-components');
      didWarnValueDefaultValue = true;
    }
  }
}
export function initSelect(element, value, defaultValue, multiple) {
  var node = element;
  node.multiple = !!multiple;

  if (value != null) {
    updateOptions(node, !!multiple, value, false);
  } else if (defaultValue != null) {
    updateOptions(node, !!multiple, defaultValue, true);
  }
}
export function hydrateSelect(element, value, defaultValue, multiple) {
  var node = element;
  var options = node.options;
  var propValue = value != null ? value : defaultValue;
  var changed = false;

  if (multiple) {
    var selectedValues = propValue;
    var selectedValue = {};

    if (selectedValues != null) {
      for (var i = 0; i < selectedValues.length; i++) {
        // Prefix to avoid chaos with special keys.
        selectedValue['$' + selectedValues[i]] = true;
      }
    }

    for (var _i3 = 0; _i3 < options.length; _i3++) {
      var expectedSelected = selectedValue.hasOwnProperty('$' + options[_i3].value);

      if (options[_i3].selected !== expectedSelected) {
        changed = true;
        break;
      }
    }
  } else {
    var _selectedValue2 = propValue == null ? null : toString(getToStringValue(propValue));

    for (var _i4 = 0; _i4 < options.length; _i4++) {
      if (_selectedValue2 == null && !options[_i4].disabled) {
        // We expect the first non-disabled option to be selected if the selected is null.
        _selectedValue2 = options[_i4].value;
      }

      var _expectedSelected = options[_i4].value === _selectedValue2;

      if (options[_i4].selected !== _expectedSelected) {
        changed = true;
        break;
      }
    }
  }

  if (changed) {
    // If the current selection is different than our initial that suggests that the user
    // changed it before hydration. Queue a replay of the change event.
    queueChangeEvent(node);
  }
}
export function updateSelect(element, value, defaultValue, multiple, wasMultiple) {
  var node = element;

  if (value != null) {
    updateOptions(node, !!multiple, value, false);
  } else if (!!wasMultiple !== !!multiple) {
    // For simplicity, reapply `defaultValue` if `multiple` is toggled.
    if (defaultValue != null) {
      updateOptions(node, !!multiple, defaultValue, true);
    } else {
      // Revert the select back to its default unselected state.
      updateOptions(node, !!multiple, multiple ? [] : '', false);
    }
  }
}
export function restoreControlledSelectState(element, props) {
  var node = element;
  var value = props.value;

  if (value != null) {
    updateOptions(node, !!props.multiple, value, false);
  }
}