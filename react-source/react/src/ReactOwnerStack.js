/**
 * Copyright (c) Meta Platforms, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import ReactSharedInternals from 'shared/ReactSharedInternals';
export function captureOwnerStack() {
  if (__DEV__) {
    var getCurrentStack = ReactSharedInternals.getCurrentStack;

    if (getCurrentStack === null) {
      return null;
    } // The current stack will be the owner stack which it is always here.


    return getCurrentStack();
  }

  return null;
}