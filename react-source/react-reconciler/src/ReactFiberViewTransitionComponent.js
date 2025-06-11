/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { getCommittingRoot, getPendingTransitionTypes } from './ReactFiberWorkLoop';
var globalClientIdCounter = 0;
export function getViewTransitionName(props, instance) {
  if (props.name != null && props.name !== 'auto') {
    return props.name;
  }

  if (instance.autoName !== null) {
    return instance.autoName;
  } // We assume we always call this in the commit phase.


  var root = getCommittingRoot();
  var identifierPrefix = root.identifierPrefix;
  var globalClientId = globalClientIdCounter++;
  var name = "\xAB" + identifierPrefix + 't' + globalClientId.toString(32) + "\xBB";
  instance.autoName = name;
  return name;
}

function getClassNameByType(classByType) {
  if (classByType == null || typeof classByType === 'string') {
    return classByType;
  }

  var className = null;
  var activeTypes = getPendingTransitionTypes();

  if (activeTypes !== null) {
    for (var i = 0; i < activeTypes.length; i++) {
      var match = classByType[activeTypes[i]];

      if (match != null) {
        if (match === 'none') {
          // If anything matches "none" that takes precedence over any other
          // type that also matches.
          return 'none';
        }

        if (className == null) {
          className = match;
        } else {
          className += ' ' + match;
        }
      }
    }
  }

  if (className == null) {
    // We had no other matches. Match the default for this configuration.
    return classByType.default;
  }

  return className;
}

export function getViewTransitionClassName(defaultClass, eventClass) {
  var className = getClassNameByType(defaultClass);
  var eventClassName = getClassNameByType(eventClass);

  if (eventClassName == null) {
    return className === 'auto' ? null : className;
  }

  if (eventClassName === 'auto') {
    return null;
  }

  return eventClassName;
}