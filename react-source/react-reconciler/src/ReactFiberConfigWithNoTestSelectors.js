/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// Renderers that don't support test selectors
// can re-export everything from this module.
function shim() {
  throw new Error('The current renderer does not support test selectors. ' + 'This error is likely caused by a bug in React. ' + 'Please file an issue.');
} // Test selectors (when unsupported)


export var supportsTestSelectors = false;
export var findFiberRoot = shim;
export var getBoundingRect = shim;
export var getTextContent = shim;
export var isHiddenSubtree = shim;
export var matchAccessibilityRole = shim;
export var setFocusIfFocusable = shim;
export var setupIntersectionObserver = shim;