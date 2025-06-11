/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// Renderers that don't support hydration
// can re-export everything from this module.
function shim() {
  throw new Error('The current renderer does not support Resources. ' + 'This error is likely caused by a bug in React. ' + 'Please file an issue.');
}

// Resources (when unsupported)
export var supportsResources = false;
export var isHostHoistableType = shim;
export var getHoistableRoot = shim;
export var getResource = shim;
export var acquireResource = shim;
export var releaseResource = shim;
export var hydrateHoistable = shim;
export var mountHoistable = shim;
export var unmountHoistable = shim;
export var createHoistableInstance = shim;
export var prepareToCommitHoistables = shim;
export var mayResourceSuspendCommit = shim;
export var preloadResource = shim;
export var suspendResource = shim;