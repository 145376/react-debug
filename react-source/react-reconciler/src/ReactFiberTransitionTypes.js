/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { enableViewTransition } from 'shared/ReactFeatureFlags';
import { includesTransitionLane } from './ReactFiberLane';
export function queueTransitionTypes(root, transitionTypes) {
  if (enableViewTransition) {
    // TODO: We should really store transitionTypes per lane in a LaneMap on
    // the root. Then merge it when we commit. We currently assume that all
    // Transitions are entangled.
    if (includesTransitionLane(root.pendingLanes)) {
      var queued = root.transitionTypes;

      if (queued === null) {
        queued = root.transitionTypes = [];
      }

      for (var i = 0; i < transitionTypes.length; i++) {
        var transitionType = transitionTypes[i];

        if (queued.indexOf(transitionType) === -1) {
          queued.push(transitionType);
        }
      }
    }
  }
} // Store all types while we're entangled with an async Transition.

export var entangledTransitionTypes = null;
export function entangleAsyncTransitionTypes(transitionTypes) {
  if (enableViewTransition) {
    var queued = entangledTransitionTypes;

    if (queued === null) {
      queued = entangledTransitionTypes = [];
    }

    for (var i = 0; i < transitionTypes.length; i++) {
      var transitionType = transitionTypes[i];

      if (queued.indexOf(transitionType) === -1) {
        queued.push(transitionType);
      }
    }
  }
}
export function clearEntangledAsyncTransitionTypes() {
  // Called when all Async Actions are done.
  entangledTransitionTypes = null;
}
export function claimQueuedTransitionTypes(root) {
  var claimed = root.transitionTypes;
  root.transitionTypes = null;
  return claimed;
}