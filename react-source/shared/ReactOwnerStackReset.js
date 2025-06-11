/**
 * Copyright (c) Meta Platforms, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import ReactSharedInternals from 'shared/ReactSharedInternals';
var lastResetTime = 0;
var getCurrentTime;
var hasPerformanceNow = // $FlowFixMe[method-unbinding]
typeof performance === 'object' && typeof performance.now === 'function';

if (hasPerformanceNow) {
  var localPerformance = performance;

  getCurrentTime = function () {
    return localPerformance.now();
  };
} else {
  var localDate = Date;

  getCurrentTime = function () {
    return localDate.now();
  };
}

export function resetOwnerStackLimit() {
  if (__DEV__) {
    var now = getCurrentTime();
    var timeSinceLastReset = now - lastResetTime;

    if (timeSinceLastReset > 1000) {
      ReactSharedInternals.recentlyCreatedOwnerStacks = 0;
      lastResetTime = now;
    }
  } else {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('resetOwnerStackLimit should never be called in production mode. This is a bug in React.');
  }
}