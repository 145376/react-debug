/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
var isArrayImpl = Array.isArray;

function isArray(a) {
  return isArrayImpl(a);
}

export default isArray;