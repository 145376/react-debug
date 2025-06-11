/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { NoLane, SyncLane, InputContinuousLane, DefaultLane, IdleLane, getHighestPriorityLane, includesNonIdleWork } from './ReactFiberLane';
export var NoEventPriority = NoLane;
export var DiscreteEventPriority = SyncLane;
export var ContinuousEventPriority = InputContinuousLane;
export var DefaultEventPriority = DefaultLane;
export var IdleEventPriority = IdleLane;
export function higherEventPriority(a, b) {
  return a !== 0 && a < b ? a : b;
}
export function lowerEventPriority(a, b) {
  return a === 0 || a > b ? a : b;
}
export function isHigherEventPriority(a, b) {
  return a !== 0 && a < b;
}
export function eventPriorityToLane(updatePriority) {
  return updatePriority;
}
export function lanesToEventPriority(lanes) {
  var lane = getHighestPriorityLane(lanes);

  if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
    return DiscreteEventPriority;
  }

  if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
    return ContinuousEventPriority;
  }

  if (includesNonIdleWork(lane)) {
    return DefaultEventPriority;
  }

  return IdleEventPriority;
}