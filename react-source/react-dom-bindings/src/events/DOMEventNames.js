/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import getVendorPrefixedEventName from './getVendorPrefixedEventName';
export var ANIMATION_END = getVendorPrefixedEventName('animationend');
export var ANIMATION_ITERATION = getVendorPrefixedEventName('animationiteration');
export var ANIMATION_START = getVendorPrefixedEventName('animationstart');
export var TRANSITION_RUN = getVendorPrefixedEventName('transitionrun');
export var TRANSITION_START = getVendorPrefixedEventName('transitionstart');
export var TRANSITION_CANCEL = getVendorPrefixedEventName('transitioncancel');
export var TRANSITION_END = getVendorPrefixedEventName('transitionend');