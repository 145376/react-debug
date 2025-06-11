/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { requestPostPaintCallback } from './ReactFiberConfig';
var postPaintCallbackScheduled = false;
var callbacks = [];
export function schedulePostPaintCallback(callback) {
  callbacks.push(callback);

  if (!postPaintCallbackScheduled) {
    postPaintCallbackScheduled = true;
    requestPostPaintCallback(function (endTime) {
      for (var i = 0; i < callbacks.length; i++) {
        callbacks[i](endTime);
      }

      postPaintCallbackScheduled = false;
      callbacks = [];
    });
  }
}