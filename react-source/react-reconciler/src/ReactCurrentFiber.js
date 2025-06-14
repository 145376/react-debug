/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import ReactSharedInternals from 'shared/ReactSharedInternals';
import { getOwnerStackByFiberInDev } from './ReactFiberComponentStack';
import { getComponentNameFromOwner } from 'react-reconciler/src/getComponentNameFromFiber';
export var current = null;
export var isRendering = false;
export function getCurrentFiberOwnerNameInDevOrNull() {
  if (__DEV__) {
    if (current === null) {
      return null;
    }

    var owner = current._debugOwner;

    if (owner != null) {
      return getComponentNameFromOwner(owner);
    }
  }

  return null;
}

function getCurrentFiberStackInDev() {
  if (__DEV__) {
    if (current === null) {
      return '';
    } // Safe because if current fiber exists, we are reconciling,
    // and it is guaranteed to be the work-in-progress version.
    // TODO: The above comment is not actually true. We might be
    // in a commit phase or preemptive set state callback.


    return getOwnerStackByFiberInDev(current);
  }

  return '';
}

export function runWithFiberInDEV(fiber, callback, arg0, arg1, arg2, arg3, arg4) {
  if (__DEV__) {
    var previousFiber = current;
    setCurrentFiber(fiber);

    try {
      if (fiber !== null && fiber._debugTask) {
        return fiber._debugTask.run(callback.bind(null, arg0, arg1, arg2, arg3, arg4));
      }

      return callback(arg0, arg1, arg2, arg3, arg4);
    } finally {
      setCurrentFiber(previousFiber);
    }
  } // These errors should never make it into a build so we don't need to encode them in codes.json
  // eslint-disable-next-line react-internal/prod-error-codes


  throw new Error('runWithFiberInDEV should never be called in production. This is a bug in React.');
}
export function resetCurrentFiber() {
  if (__DEV__) {
    ReactSharedInternals.getCurrentStack = null;
    isRendering = false;
  }

  current = null;
}
export function setCurrentFiber(fiber) {
  if (__DEV__) {
    ReactSharedInternals.getCurrentStack = fiber === null ? null : getCurrentFiberStackInDev;
    isRendering = false;
  }

  current = fiber;
}
export function setIsRendering(rendering) {
  if (__DEV__) {
    isRendering = rendering;
  }
}
export function getIsRendering() {
  if (__DEV__) {
    return isRendering;
  }
}