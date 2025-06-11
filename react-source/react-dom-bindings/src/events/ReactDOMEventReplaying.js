/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { unstable_scheduleCallback as scheduleCallback, unstable_NormalPriority as NormalPriority } from 'scheduler';
import { getNearestMountedFiber, getContainerFromFiber, getActivityInstanceFromFiber, getSuspenseInstanceFromFiber } from 'react-reconciler/src/ReactFiberTreeReflection';
import { findInstanceBlockingEvent, findInstanceBlockingTarget } from './ReactDOMEventListener';
import { setReplayingEvent, resetReplayingEvent } from './CurrentReplayingEvent';
import { getInstanceFromNode, getClosestInstanceFromNode, getFiberCurrentPropsFromNode } from '../client/ReactDOMComponentTree';
import { HostRoot, ActivityComponent, SuspenseComponent } from 'react-reconciler/src/ReactWorkTags';
import { isHigherEventPriority } from 'react-reconciler/src/ReactEventPriorities';
import { isRootDehydrated } from 'react-reconciler/src/ReactFiberShellHydration';
import { dispatchReplayedFormAction } from './plugins/FormActionEventPlugin';
import { resolveUpdatePriority, runWithPriority as attemptHydrationAtPriority } from '../client/ReactDOMUpdatePriority';
import { attemptContinuousHydration, attemptHydrationAtCurrentPriority } from 'react-reconciler/src/ReactFiberReconciler';
import { enableHydrationChangeEvent } from 'shared/ReactFeatureFlags'; // TODO: Upgrade this definition once we're on a newer version of Flow that
// has this definition built-in.

var hasScheduledReplayAttempt = false; // The last of each continuous event type. We only need to replay the last one
// if the last target was dehydrated.

var queuedFocus = null;
var queuedDrag = null;
var queuedMouse = null; // For pointer events there can be one latest event per pointerId.

var queuedPointers = new Map();
var queuedPointerCaptures = new Map(); // We could consider replaying selectionchange and touchmoves too.

var queuedChangeEventTargets = [];
var queuedExplicitHydrationTargets = [];
var discreteReplayableEvents = ['mousedown', 'mouseup', 'touchcancel', 'touchend', 'touchstart', 'auxclick', 'dblclick', 'pointercancel', 'pointerdown', 'pointerup', 'dragend', 'dragstart', 'drop', 'compositionend', 'compositionstart', 'keydown', 'keypress', 'keyup', 'input', 'textInput', // Intentionally camelCase
'copy', 'cut', 'paste', 'click', 'change', 'contextmenu', 'reset' // 'submit', // stopPropagation blocks the replay mechanism
];
export function isDiscreteEventThatRequiresHydration(eventType) {
  return discreteReplayableEvents.indexOf(eventType) > -1;
}

function createQueuedReplayableEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
  return {
    blockedOn: blockedOn,
    domEventName: domEventName,
    eventSystemFlags: eventSystemFlags,
    nativeEvent: nativeEvent,
    targetContainers: [targetContainer]
  };
} // Resets the replaying for this type of continuous event to no event.


export function clearIfContinuousEvent(domEventName, nativeEvent) {
  switch (domEventName) {
    case 'focusin':
    case 'focusout':
      queuedFocus = null;
      break;

    case 'dragenter':
    case 'dragleave':
      queuedDrag = null;
      break;

    case 'mouseover':
    case 'mouseout':
      queuedMouse = null;
      break;

    case 'pointerover':
    case 'pointerout':
      {
        var pointerId = nativeEvent.pointerId;
        queuedPointers.delete(pointerId);
        break;
      }

    case 'gotpointercapture':
    case 'lostpointercapture':
      {
        var _pointerId = nativeEvent.pointerId;
        queuedPointerCaptures.delete(_pointerId);
        break;
      }
  }
}

function accumulateOrCreateContinuousQueuedReplayableEvent(existingQueuedEvent, blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
  if (existingQueuedEvent === null || existingQueuedEvent.nativeEvent !== nativeEvent) {
    var queuedEvent = createQueuedReplayableEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent);

    if (blockedOn !== null) {
      var fiber = getInstanceFromNode(blockedOn);

      if (fiber !== null) {
        // Attempt to increase the priority of this target.
        attemptContinuousHydration(fiber);
      }
    }

    return queuedEvent;
  } // If we have already queued this exact event, then it's because
  // the different event systems have different DOM event listeners.
  // We can accumulate the flags, and the targetContainers, and
  // store a single event to be replayed.


  existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
  var targetContainers = existingQueuedEvent.targetContainers;

  if (targetContainer !== null && targetContainers.indexOf(targetContainer) === -1) {
    targetContainers.push(targetContainer);
  }

  return existingQueuedEvent;
}

export function queueIfContinuousEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
  // These set relatedTarget to null because the replayed event will be treated as if we
  // moved from outside the window (no target) onto the target once it hydrates.
  // Instead of mutating we could clone the event.
  switch (domEventName) {
    case 'focusin':
      {
        var focusEvent = nativeEvent;
        queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(queuedFocus, blockedOn, domEventName, eventSystemFlags, targetContainer, focusEvent);
        return true;
      }

    case 'dragenter':
      {
        var dragEvent = nativeEvent;
        queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(queuedDrag, blockedOn, domEventName, eventSystemFlags, targetContainer, dragEvent);
        return true;
      }

    case 'mouseover':
      {
        var mouseEvent = nativeEvent;
        queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(queuedMouse, blockedOn, domEventName, eventSystemFlags, targetContainer, mouseEvent);
        return true;
      }

    case 'pointerover':
      {
        var pointerEvent = nativeEvent;
        var pointerId = pointerEvent.pointerId;
        queuedPointers.set(pointerId, accumulateOrCreateContinuousQueuedReplayableEvent(queuedPointers.get(pointerId) || null, blockedOn, domEventName, eventSystemFlags, targetContainer, pointerEvent));
        return true;
      }

    case 'gotpointercapture':
      {
        var _pointerEvent = nativeEvent;
        var _pointerId2 = _pointerEvent.pointerId;
        queuedPointerCaptures.set(_pointerId2, accumulateOrCreateContinuousQueuedReplayableEvent(queuedPointerCaptures.get(_pointerId2) || null, blockedOn, domEventName, eventSystemFlags, targetContainer, _pointerEvent));
        return true;
      }
  }

  return false;
} // Check if this target is unblocked. Returns true if it's unblocked.

function attemptExplicitHydrationTarget(queuedTarget) {
  // TODO: This function shares a lot of logic with findInstanceBlockingEvent.
  // Try to unify them. It's a bit tricky since it would require two return
  // values.
  var targetInst = getClosestInstanceFromNode(queuedTarget.target);

  if (targetInst !== null) {
    var nearestMounted = getNearestMountedFiber(targetInst);

    if (nearestMounted !== null) {
      var tag = nearestMounted.tag;

      if (tag === SuspenseComponent) {
        var instance = getSuspenseInstanceFromFiber(nearestMounted);

        if (instance !== null) {
          // We're blocked on hydrating this boundary.
          // Increase its priority.
          queuedTarget.blockedOn = instance;
          attemptHydrationAtPriority(queuedTarget.priority, function () {
            attemptHydrationAtCurrentPriority(nearestMounted);
          });
          return;
        }
      } else if (tag === ActivityComponent) {
        var _instance = getActivityInstanceFromFiber(nearestMounted);

        if (_instance !== null) {
          // We're blocked on hydrating this boundary.
          // Increase its priority.
          queuedTarget.blockedOn = _instance;
          attemptHydrationAtPriority(queuedTarget.priority, function () {
            attemptHydrationAtCurrentPriority(nearestMounted);
          });
          return;
        }
      } else if (tag === HostRoot) {
        var root = nearestMounted.stateNode;

        if (isRootDehydrated(root)) {
          queuedTarget.blockedOn = getContainerFromFiber(nearestMounted); // We don't currently have a way to increase the priority of
          // a root other than sync.

          return;
        }
      }
    }
  }

  queuedTarget.blockedOn = null;
}

export function queueExplicitHydrationTarget(target) {
  var updatePriority = resolveUpdatePriority();
  var queuedTarget = {
    blockedOn: null,
    target: target,
    priority: updatePriority
  };
  var i = 0;

  for (; i < queuedExplicitHydrationTargets.length; i++) {
    // Stop once we hit the first target with lower priority than
    if (!isHigherEventPriority(updatePriority, queuedExplicitHydrationTargets[i].priority)) {
      break;
    }
  }

  queuedExplicitHydrationTargets.splice(i, 0, queuedTarget);

  if (i === 0) {
    attemptExplicitHydrationTarget(queuedTarget);
  }
}

function attemptReplayContinuousQueuedEvent(queuedEvent) {
  if (queuedEvent.blockedOn !== null) {
    return false;
  }

  var targetContainers = queuedEvent.targetContainers;

  while (targetContainers.length > 0) {
    var nextBlockedOn = findInstanceBlockingEvent(queuedEvent.nativeEvent);

    if (nextBlockedOn === null) {
      var nativeEvent = queuedEvent.nativeEvent;
      var nativeEventClone = new nativeEvent.constructor(nativeEvent.type, nativeEvent);
      setReplayingEvent(nativeEventClone);
      nativeEvent.target.dispatchEvent(nativeEventClone);
      resetReplayingEvent();
    } else {
      // We're still blocked. Try again later.
      var fiber = getInstanceFromNode(nextBlockedOn);

      if (fiber !== null) {
        attemptContinuousHydration(fiber);
      }

      queuedEvent.blockedOn = nextBlockedOn;
      return false;
    } // This target container was successfully dispatched. Try the next.


    targetContainers.shift();
  }

  return true;
}

function attemptReplayContinuousQueuedEventInMap(queuedEvent, key, map) {
  if (attemptReplayContinuousQueuedEvent(queuedEvent)) {
    map.delete(key);
  }
}

function replayChangeEvent(target) {
  // Dispatch a fake "change" event for the input.
  var element = target;

  if (element.nodeName === 'INPUT') {
    if (element.type === 'checkbox' || element.type === 'radio') {
      // Checkboxes always fire a click event regardless of how the change was made.
      var EventCtr = typeof PointerEvent === 'function' ? PointerEvent : Event;
      target.dispatchEvent(new EventCtr('click', {
        bubbles: true
      })); // For checkboxes the input event uses the Event constructor instead of InputEvent.

      target.dispatchEvent(new Event('input', {
        bubbles: true
      }));
    } else {
      if (typeof InputEvent === 'function') {
        target.dispatchEvent(new InputEvent('input', {
          bubbles: true
        }));
      }
    }
  } else if (element.nodeName === 'TEXTAREA') {
    if (typeof InputEvent === 'function') {
      target.dispatchEvent(new InputEvent('input', {
        bubbles: true
      }));
    }
  }

  target.dispatchEvent(new Event('change', {
    bubbles: true
  }));
}

function replayUnblockedEvents() {
  hasScheduledReplayAttempt = false; // Replay any continuous events.

  if (queuedFocus !== null && attemptReplayContinuousQueuedEvent(queuedFocus)) {
    queuedFocus = null;
  }

  if (queuedDrag !== null && attemptReplayContinuousQueuedEvent(queuedDrag)) {
    queuedDrag = null;
  }

  if (queuedMouse !== null && attemptReplayContinuousQueuedEvent(queuedMouse)) {
    queuedMouse = null;
  }

  queuedPointers.forEach(attemptReplayContinuousQueuedEventInMap);
  queuedPointerCaptures.forEach(attemptReplayContinuousQueuedEventInMap);

  if (enableHydrationChangeEvent) {
    for (var i = 0; i < queuedChangeEventTargets.length; i++) {
      replayChangeEvent(queuedChangeEventTargets[i]);
    }

    queuedChangeEventTargets.length = 0;
  }
}

export function flushEventReplaying() {
  // Synchronously flush any event replaying so that it gets observed before
  // any new updates are applied.
  if (hasScheduledReplayAttempt) {
    replayUnblockedEvents();
  }
}
export function queueChangeEvent(target) {
  if (enableHydrationChangeEvent) {
    queuedChangeEventTargets.push(target);

    if (!hasScheduledReplayAttempt) {
      hasScheduledReplayAttempt = true;
    }
  }
}

function scheduleCallbackIfUnblocked(queuedEvent, unblocked) {
  if (queuedEvent.blockedOn === unblocked) {
    queuedEvent.blockedOn = null;

    if (!hasScheduledReplayAttempt) {
      hasScheduledReplayAttempt = true;

      if (!enableHydrationChangeEvent) {
        // Schedule a callback to attempt replaying as many events as are
        // now unblocked. This first might not actually be unblocked yet.
        // We could check it early to avoid scheduling an unnecessary callback.
        scheduleCallback(NormalPriority, replayUnblockedEvents);
      }
    }
  }
}

// [form, submitter or action, formData...]
var lastScheduledReplayQueue = null;

function replayUnblockedFormActions(formReplayingQueue) {
  if (lastScheduledReplayQueue === formReplayingQueue) {
    lastScheduledReplayQueue = null;
  }

  for (var i = 0; i < formReplayingQueue.length; i += 3) {
    var form = formReplayingQueue[i];
    var submitterOrAction = formReplayingQueue[i + 1];
    var formData = formReplayingQueue[i + 2];

    if (typeof submitterOrAction !== 'function') {
      // This action is not hydrated yet. This might be because it's blocked on
      // a different React instance or higher up our tree.
      var blockedOn = findInstanceBlockingTarget(submitterOrAction || form);

      if (blockedOn === null) {
        // We're not blocked but we don't have an action. This must mean that
        // this is in another React instance. We'll just skip past it.
        continue;
      } else {
        // We're blocked on something in this React instance. We'll retry later.
        break;
      }
    }

    var formInst = getInstanceFromNode(form);

    if (formInst !== null) {
      // This is part of our instance.
      // We're ready to replay this. Let's delete it from the queue.
      formReplayingQueue.splice(i, 3);
      i -= 3;
      dispatchReplayedFormAction(formInst, form, submitterOrAction, formData); // Continue without incrementing the index.

      continue;
    } // This form must've been part of a different React instance.
    // If we want to preserve ordering between React instances on the same root
    // we'd need some way for the other instance to ping us when it's done.
    // We'll just skip this and let the other instance execute it.

  }
}

function scheduleReplayQueueIfNeeded(formReplayingQueue) {
  // Schedule a callback to execute any unblocked form actions in.
  // We only keep track of the last queue which means that if multiple React oscillate
  // commits, we could schedule more callbacks than necessary but it's not a big deal
  // and we only really except one instance.
  if (lastScheduledReplayQueue !== formReplayingQueue) {
    lastScheduledReplayQueue = formReplayingQueue;
    scheduleCallback(NormalPriority, function () {
      return replayUnblockedFormActions(formReplayingQueue);
    });
  }
}

export function retryIfBlockedOn(unblocked) {
  if (queuedFocus !== null) {
    scheduleCallbackIfUnblocked(queuedFocus, unblocked);
  }

  if (queuedDrag !== null) {
    scheduleCallbackIfUnblocked(queuedDrag, unblocked);
  }

  if (queuedMouse !== null) {
    scheduleCallbackIfUnblocked(queuedMouse, unblocked);
  }

  var unblock = function (queuedEvent) {
    return scheduleCallbackIfUnblocked(queuedEvent, unblocked);
  };

  queuedPointers.forEach(unblock);
  queuedPointerCaptures.forEach(unblock);

  for (var i = 0; i < queuedExplicitHydrationTargets.length; i++) {
    var queuedTarget = queuedExplicitHydrationTargets[i];

    if (queuedTarget.blockedOn === unblocked) {
      queuedTarget.blockedOn = null;
    }
  }

  while (queuedExplicitHydrationTargets.length > 0) {
    var nextExplicitTarget = queuedExplicitHydrationTargets[0];

    if (nextExplicitTarget.blockedOn !== null) {
      // We're still blocked.
      break;
    } else {
      attemptExplicitHydrationTarget(nextExplicitTarget);

      if (nextExplicitTarget.blockedOn === null) {
        // We're unblocked.
        queuedExplicitHydrationTargets.shift();
      }
    }
  } // Check the document if there are any queued form actions.
  // If there's no ownerDocument, then this is the document.


  var root = unblocked.ownerDocument || unblocked;
  var formReplayingQueue = root.$$reactFormReplay;

  if (formReplayingQueue != null) {
    for (var _i = 0; _i < formReplayingQueue.length; _i += 3) {
      var form = formReplayingQueue[_i];
      var submitterOrAction = formReplayingQueue[_i + 1];
      var formProps = getFiberCurrentPropsFromNode(form);

      if (typeof submitterOrAction === 'function') {
        // This action has already resolved. We're just waiting to dispatch it.
        if (!formProps) {
          // This was not part of this React instance. It might have been recently
          // unblocking us from dispatching our events. So let's make sure we schedule
          // a retry.
          scheduleReplayQueueIfNeeded(formReplayingQueue);
        }

        continue;
      }

      var target = form;

      if (formProps) {
        // This form belongs to this React instance but the submitter might
        // not be done yet.
        var action = null;
        var submitter = submitterOrAction;

        if (submitter && submitter.hasAttribute('formAction')) {
          // The submitter is the one that is responsible for the action.
          target = submitter;
          var submitterProps = getFiberCurrentPropsFromNode(submitter);

          if (submitterProps) {
            // The submitter is part of this instance.
            action = submitterProps.formAction;
          } else {
            var blockedOn = findInstanceBlockingTarget(target);

            if (blockedOn !== null) {
              // The submitter is not hydrated yet. We'll wait for it.
              continue;
            } // The submitter must have been a part of a different React instance.
            // Except the form isn't. We don't dispatch actions in this scenario.

          }
        } else {
          action = formProps.action;
        }

        if (typeof action === 'function') {
          formReplayingQueue[_i + 1] = action;
        } else {
          // Something went wrong so let's just delete this action.
          formReplayingQueue.splice(_i, 3);
          _i -= 3;
        } // Schedule a replay in case this unblocked something.


        scheduleReplayQueueIfNeeded(formReplayingQueue);
        continue;
      } // Something above this target is still blocked so we can't continue yet.
      // We're not sure if this target is actually part of this React instance
      // yet. It could be a different React as a child but at least some parent is.
      // We must continue for any further queued actions.

    }
  }
}