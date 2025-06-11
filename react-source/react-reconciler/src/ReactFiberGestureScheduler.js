/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { GestureLane, includesBlockingLane, includesTransitionLane } from './ReactFiberLane';
import { ensureRootIsScheduled } from './ReactFiberRootScheduler';
import { getCurrentGestureOffset, stopViewTransition } from './ReactFiberConfig'; // This type keeps track of any scheduled or active gestures.

export function scheduleGesture(root, provider) {
  var prev = root.pendingGestures;

  while (prev !== null) {
    if (prev.provider === provider) {
      // Existing instance found.
      return prev;
    }

    var next = prev.next;

    if (next === null) {
      break;
    }

    prev = next;
  }

  var gesture = {
    provider: provider,
    count: 0,
    rangeStart: 0,
    // Uninitialized
    rangeEnd: 100,
    // Uninitialized
    types: null,
    running: null,
    prev: prev,
    next: null
  };

  if (prev === null) {
    root.pendingGestures = gesture;
  } else {
    prev.next = gesture;
  }

  ensureRootIsScheduled(root);
  return gesture;
}
export function startScheduledGesture(root, gestureTimeline, gestureOptions, transitionTypes) {
  var rangeStart = gestureOptions && gestureOptions.rangeStart != null ? gestureOptions.rangeStart : getCurrentGestureOffset(gestureTimeline);
  var rangeEnd = gestureOptions && gestureOptions.rangeEnd != null ? gestureOptions.rangeEnd : rangeStart < 50 ? 100 : 0;
  var prev = root.pendingGestures;

  while (prev !== null) {
    if (prev.provider === gestureTimeline) {
      // Existing instance found.
      prev.count++; // Update the options.

      prev.rangeStart = rangeStart;
      prev.rangeEnd = rangeEnd;

      if (transitionTypes !== null) {
        var scheduledTypes = prev.types;

        if (scheduledTypes === null) {
          scheduledTypes = prev.types = [];
        }

        for (var i = 0; i < transitionTypes.length; i++) {
          var transitionType = transitionTypes[i];

          if (scheduledTypes.indexOf(transitionType) === -1) {
            scheduledTypes.push(transitionType);
          }
        }
      }

      return prev;
    }

    var next = prev.next;

    if (next === null) {
      break;
    }

    prev = next;
  } // No scheduled gestures. It must mean nothing for this renderer updated but
  // some other renderer might have updated.


  return null;
}
export function cancelScheduledGesture(root, gesture) {
  gesture.count--;

  if (gesture.count === 0) {
    // Delete the scheduled gesture from the pending queue.
    deleteScheduledGesture(root, gesture); // TODO: If we're currently rendering this gesture, we need to restart the render
    // on a different gesture or cancel the render..
    // TODO: We might want to pause the View Transition at this point since you should
    // no longer be able to update the position of anything but it might be better to
    // just commit the gesture state.

    var runningTransition = gesture.running;

    if (runningTransition !== null) {
      var pendingLanesExcludingGestureLane = root.pendingLanes & ~GestureLane;

      if (includesBlockingLane(pendingLanesExcludingGestureLane) || includesTransitionLane(pendingLanesExcludingGestureLane)) {
        // If we have pending work we schedule the gesture to be stopped at the next commit.
        // This ensures that we don't snap back to the previous state until we have
        // had a chance to commit any resulting updates.
        var existing = root.stoppingGestures;

        if (existing !== null) {
          gesture.next = existing;
          existing.prev = gesture;
        }

        root.stoppingGestures = gesture;
      } else {
        gesture.running = null; // If there's no work scheduled so we can stop the View Transition right away.

        stopViewTransition(runningTransition);
      }
    }
  }
}
export function deleteScheduledGesture(root, gesture) {
  if (gesture.prev === null) {
    if (root.pendingGestures === gesture) {
      root.pendingGestures = gesture.next;

      if (root.pendingGestures === null) {
        // Gestures don't clear their lanes while the gesture is still active but it
        // might not be scheduled to do any more renders and so we shouldn't schedule
        // any more gesture lane work until a new gesture is scheduled.
        root.pendingLanes &= ~GestureLane;
      }
    }

    if (root.stoppingGestures === gesture) {
      // This should not really happen the way we use it now but just in case we start.
      root.stoppingGestures = gesture.next;
    }
  } else {
    gesture.prev.next = gesture.next;

    if (gesture.next !== null) {
      gesture.next.prev = gesture.prev;
    }

    gesture.prev = null;
    gesture.next = null;
  }
}
export function stopCompletedGestures(root) {
  var gesture = root.stoppingGestures;
  root.stoppingGestures = null;

  while (gesture !== null) {
    if (gesture.running !== null) {
      stopViewTransition(gesture.running);
      gesture.running = null;
    }

    var nextGesture = gesture.next;
    gesture.next = null;
    gesture.prev = null;
    gesture = nextGesture;
  }
}