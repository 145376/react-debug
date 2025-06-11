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
  throw new Error('The current renderer does not support mutation. ' + 'This error is likely caused by a bug in React. ' + 'Please file an issue.');
} // Mutation (when unsupported)


export var supportsMutation = false;
export var cloneMutableInstance = shim;
export var cloneMutableTextInstance = shim;
export var appendChild = shim;
export var appendChildToContainer = shim;
export var commitTextUpdate = shim;
export var commitMount = shim;
export var commitUpdate = shim;
export var insertBefore = shim;
export var insertInContainerBefore = shim;
export var removeChild = shim;
export var removeChildFromContainer = shim;
export var resetTextContent = shim;
export var hideInstance = shim;
export var hideTextInstance = shim;
export var unhideInstance = shim;
export var unhideTextInstance = shim;
export var clearContainer = shim;
export var applyViewTransitionName = shim;
export var restoreViewTransitionName = shim;
export var cancelViewTransitionName = shim;
export var cancelRootViewTransitionName = shim;
export var restoreRootViewTransitionName = shim;
export var cloneRootViewTransitionContainer = shim;
export var removeRootViewTransitionClone = shim;
export var measureInstance = shim;
export var measureClonedInstance = shim;
export var wasInstanceInViewport = shim;
export var hasInstanceChanged = shim;
export var hasInstanceAffectedParent = shim;
export var startViewTransition = shim;
export var startGestureTransition = shim;
export var stopViewTransition = shim;
export var createViewTransitionInstance = shim;
export var getCurrentGestureOffset = shim;