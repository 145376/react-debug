/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// Renderers that don't support mutation
// can re-export everything from this module.
function shim() {
  throw new Error('The current renderer does not support Singletons. ' + 'This error is likely caused by a bug in React. ' + 'Please file an issue.');
} // Resources (when unsupported)


export var supportsSingletons = false;
export var resolveSingletonInstance = shim;
export var acquireSingletonInstance = shim;
export var releaseSingletonInstance = shim;
export var isHostSingletonType = shim;
export var isSingletonScope = shim;