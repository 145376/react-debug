/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// Renderers that don't support persistence
// can re-export everything from this module.
function shim() {
  throw new Error('The current renderer does not support persistence. ' + 'This error is likely caused by a bug in React. ' + 'Please file an issue.');
} // Persistence (when unsupported)


export var supportsPersistence = false;
export var cloneInstance = shim;
export var createContainerChildSet = shim;
export var appendChildToContainerChildSet = shim;
export var finalizeContainerChildren = shim;
export var replaceContainerChildren = shim;
export var cloneHiddenInstance = shim;
export var cloneHiddenTextInstance = shim;