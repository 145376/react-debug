/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// $FlowFixMe[cannot-resolve-module]
var dynamicFeatureFlags = require('SchedulerFeatureFlags');

var enableRequestPaint = dynamicFeatureFlags.enableRequestPaint;
export { enableRequestPaint };
export var enableProfiling = __DEV__;
export var frameYieldMs = 10;
export var userBlockingPriorityTimeout = 250;
export var normalPriorityTimeout = 5000;
export var lowPriorityTimeout = 10000;
export var enableAlwaysYieldScheduler = false;