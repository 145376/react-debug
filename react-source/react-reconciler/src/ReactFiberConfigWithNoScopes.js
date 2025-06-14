/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// Renderers that don't support React Scopes
// can re-export everything from this module.
function shim() {
  throw new Error('The current renderer does not support React Scopes. ' + 'This error is likely caused by a bug in React. ' + 'Please file an issue.');
} // React Scopes (when unsupported)


export var prepareScopeUpdate = shim;
export var getInstanceFromScope = shim;