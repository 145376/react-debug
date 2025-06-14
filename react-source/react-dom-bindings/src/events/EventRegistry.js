/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { enableCreateEventHandleAPI } from 'shared/ReactFeatureFlags';
export var allNativeEvents = new Set();

if (enableCreateEventHandleAPI) {
  allNativeEvents.add('beforeblur');
  allNativeEvents.add('afterblur');
}
/**
 * Mapping from registration name to event name
 */


export var registrationNameDependencies = {};
/**
 * Mapping from lowercase registration names to the properly cased version,
 * used to warn in the case of missing event handlers. Available
 * only in __DEV__.
 * @type {Object}
 */

export var possibleRegistrationNames = __DEV__ ? {} : null; // Trust the developer to only use possibleRegistrationNames in __DEV__

export function registerTwoPhaseEvent(registrationName, dependencies) {
  registerDirectEvent(registrationName, dependencies);
  registerDirectEvent(registrationName + 'Capture', dependencies);
}
export function registerDirectEvent(registrationName, dependencies) {
  if (__DEV__) {
    if (registrationNameDependencies[registrationName]) {
      console.error('EventRegistry: More than one plugin attempted to publish the same ' + 'registration name, `%s`.', registrationName);
    }
  }

  registrationNameDependencies[registrationName] = dependencies;

  if (__DEV__) {
    var _lowerCasedName = registrationName.toLowerCase();

    possibleRegistrationNames[_lowerCasedName] = registrationName;

    if (registrationName === 'onDoubleClick') {
      possibleRegistrationNames.ondblclick = registrationName;
    }
  }

  for (var i = 0; i < dependencies.length; i++) {
    allNativeEvents.add(dependencies[i]);
  }
}