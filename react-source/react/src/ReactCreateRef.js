/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * 
 */
// an immutable object with a single mutable value
export function createRef() {
  var refObject = {
    current: null
  };

  if (__DEV__) {
    Object.seal(refObject);
  }

  return refObject;
}