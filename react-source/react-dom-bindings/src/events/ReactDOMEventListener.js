/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { isDiscreteEventThatRequiresHydration, clearIfContinuousEvent, queueIfContinuousEvent } from './ReactDOMEventReplaying';
import { attemptSynchronousHydration } from 'react-reconciler/src/ReactFiberReconciler';
import { getNearestMountedFiber, getContainerFromFiber, getActivityInstanceFromFiber, getSuspenseInstanceFromFiber } from 'react-reconciler/src/ReactFiberTreeReflection';
import { HostRoot, ActivityComponent, SuspenseComponent } from 'react-reconciler/src/ReactWorkTags';
import { IS_CAPTURE_PHASE } from './EventSystemFlags';
import getEventTarget from './getEventTarget';
import { getInstanceFromNode, getClosestInstanceFromNode } from '../client/ReactDOMComponentTree';
import { dispatchEventForPluginEventSystem } from './DOMPluginEventSystem';
import { getCurrentUpdatePriority, setCurrentUpdatePriority } from '../client/ReactDOMUpdatePriority';
import { getCurrentPriorityLevel as getCurrentSchedulerPriorityLevel, IdlePriority as IdleSchedulerPriority, ImmediatePriority as ImmediateSchedulerPriority, LowPriority as LowSchedulerPriority, NormalPriority as NormalSchedulerPriority, UserBlockingPriority as UserBlockingSchedulerPriority } from 'react-reconciler/src/Scheduler';
import { DiscreteEventPriority, ContinuousEventPriority, DefaultEventPriority, IdleEventPriority } from 'react-reconciler/src/ReactEventPriorities';
import ReactSharedInternals from 'shared/ReactSharedInternals';
import { isRootDehydrated } from 'react-reconciler/src/ReactFiberShellHydration'; // TODO: can we stop exporting these?

var _enabled = true; // This is exported in FB builds for use by legacy FB layer infra.
// We'd like to remove this but it's not clear if this is safe.

export function setEnabled(enabled) {
  _enabled = !!enabled;
}
export function isEnabled() {
  return _enabled;
}
export function createEventListenerWrapper(targetContainer, domEventName, eventSystemFlags) {
  return dispatchEvent.bind(null, domEventName, eventSystemFlags, targetContainer);
}
export function createEventListenerWrapperWithPriority(targetContainer, domEventName, eventSystemFlags) {
  var eventPriority = getEventPriority(domEventName);
  var listenerWrapper;

  switch (eventPriority) {
    case DiscreteEventPriority:
      listenerWrapper = dispatchDiscreteEvent;
      break;

    case ContinuousEventPriority:
      listenerWrapper = dispatchContinuousEvent;
      break;

    case DefaultEventPriority:
    default:
      listenerWrapper = dispatchEvent;
      break;
  }

  return listenerWrapper.bind(null, domEventName, eventSystemFlags, targetContainer);
}

function dispatchDiscreteEvent(domEventName, eventSystemFlags, container, nativeEvent) {
  var prevTransition = ReactSharedInternals.T;
  ReactSharedInternals.T = null;
  var previousPriority = getCurrentUpdatePriority();

  try {
    setCurrentUpdatePriority(DiscreteEventPriority);
    dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
  } finally {
    setCurrentUpdatePriority(previousPriority);
    ReactSharedInternals.T = prevTransition;
  }
}

function dispatchContinuousEvent(domEventName, eventSystemFlags, container, nativeEvent) {
  var prevTransition = ReactSharedInternals.T;
  ReactSharedInternals.T = null;
  var previousPriority = getCurrentUpdatePriority();

  try {
    setCurrentUpdatePriority(ContinuousEventPriority);
    dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
  } finally {
    setCurrentUpdatePriority(previousPriority);
    ReactSharedInternals.T = prevTransition;
  }
}

export function dispatchEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent) {
  if (!_enabled) {
    return;
  }

  var blockedOn = findInstanceBlockingEvent(nativeEvent);

  if (blockedOn === null) {
    dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, return_targetInst, targetContainer);
    clearIfContinuousEvent(domEventName, nativeEvent);
    return;
  }

  if (queueIfContinuousEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent)) {
    nativeEvent.stopPropagation();
    return;
  } // We need to clear only if we didn't queue because
  // queueing is accumulative.


  clearIfContinuousEvent(domEventName, nativeEvent);

  if (eventSystemFlags & IS_CAPTURE_PHASE && isDiscreteEventThatRequiresHydration(domEventName)) {
    while (blockedOn !== null) {
      var fiber = getInstanceFromNode(blockedOn);

      if (fiber !== null) {
        attemptSynchronousHydration(fiber);
      }

      var nextBlockedOn = findInstanceBlockingEvent(nativeEvent);

      if (nextBlockedOn === null) {
        dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, return_targetInst, targetContainer);
      }

      if (nextBlockedOn === blockedOn) {
        break;
      }

      blockedOn = nextBlockedOn;
    }

    if (blockedOn !== null) {
      nativeEvent.stopPropagation();
    }

    return;
  } // This is not replayable so we'll invoke it but without a target,
  // in case the event system needs to trace it.


  dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, null, targetContainer);
}
export function findInstanceBlockingEvent(nativeEvent) {
  var nativeEventTarget = getEventTarget(nativeEvent);
  return findInstanceBlockingTarget(nativeEventTarget);
}
export var return_targetInst = null; // Returns a SuspenseInstance, ActivityInstance or Container if it's blocked.
// The return_targetInst field above is conceptually part of the return value.

export function findInstanceBlockingTarget(targetNode) {
  // TODO: Warn if _enabled is false.
  return_targetInst = null;
  var targetInst = getClosestInstanceFromNode(targetNode);

  if (targetInst !== null) {
    var nearestMounted = getNearestMountedFiber(targetInst);

    if (nearestMounted === null) {
      // This tree has been unmounted already. Dispatch without a target.
      targetInst = null;
    } else {
      var tag = nearestMounted.tag;

      if (tag === SuspenseComponent) {
        var instance = getSuspenseInstanceFromFiber(nearestMounted);

        if (instance !== null) {
          // Queue the event to be replayed later. Abort dispatching since we
          // don't want this event dispatched twice through the event system.
          // TODO: If this is the first discrete event in the queue. Schedule an increased
          // priority for this boundary.
          return instance;
        } // This shouldn't happen, something went wrong but to avoid blocking
        // the whole system, dispatch the event without a target.
        // TODO: Warn.


        targetInst = null;
      } else if (tag === ActivityComponent) {
        var _instance = getActivityInstanceFromFiber(nearestMounted);

        if (_instance !== null) {
          // Queue the event to be replayed later. Abort dispatching since we
          // don't want this event dispatched twice through the event system.
          // TODO: If this is the first discrete event in the queue. Schedule an increased
          // priority for this boundary.
          return _instance;
        } // This shouldn't happen, something went wrong but to avoid blocking
        // the whole system, dispatch the event without a target.
        // TODO: Warn.


        targetInst = null;
      } else if (tag === HostRoot) {
        var root = nearestMounted.stateNode;

        if (isRootDehydrated(root)) {
          // If this happens during a replay something went wrong and it might block
          // the whole system.
          return getContainerFromFiber(nearestMounted);
        }

        targetInst = null;
      } else if (nearestMounted !== targetInst) {
        // If we get an event (ex: img onload) before committing that
        // component's mount, ignore it for now (that is, treat it as if it was an
        // event on a non-React tree). We might also consider queueing events and
        // dispatching them after the mount.
        targetInst = null;
      }
    }
  }

  return_targetInst = targetInst; // We're not blocked on anything.

  return null;
}
export function getEventPriority(domEventName) {
  switch (domEventName) {
    // Used by SimpleEventPlugin:
    case 'beforetoggle':
    case 'cancel':
    case 'click':
    case 'close':
    case 'contextmenu':
    case 'copy':
    case 'cut':
    case 'auxclick':
    case 'dblclick':
    case 'dragend':
    case 'dragstart':
    case 'drop':
    case 'focusin':
    case 'focusout':
    case 'input':
    case 'invalid':
    case 'keydown':
    case 'keypress':
    case 'keyup':
    case 'mousedown':
    case 'mouseup':
    case 'paste':
    case 'pause':
    case 'play':
    case 'pointercancel':
    case 'pointerdown':
    case 'pointerup':
    case 'ratechange':
    case 'reset':
    case 'resize':
    case 'seeked':
    case 'submit':
    case 'toggle':
    case 'touchcancel':
    case 'touchend':
    case 'touchstart':
    case 'volumechange': // Used by polyfills: (fall through)

    case 'change':
    case 'selectionchange':
    case 'textInput':
    case 'compositionstart':
    case 'compositionend':
    case 'compositionupdate': // Only enableCreateEventHandleAPI: (fall through)

    case 'beforeblur':
    case 'afterblur': // Not used by React but could be by user code: (fall through)

    case 'beforeinput':
    case 'blur':
    case 'fullscreenchange':
    case 'focus':
    case 'hashchange':
    case 'popstate':
    case 'select':
    case 'selectstart':
      return DiscreteEventPriority;

    case 'drag':
    case 'dragenter':
    case 'dragexit':
    case 'dragleave':
    case 'dragover':
    case 'mousemove':
    case 'mouseout':
    case 'mouseover':
    case 'pointermove':
    case 'pointerout':
    case 'pointerover':
    case 'scroll':
    case 'touchmove':
    case 'wheel': // Not used by React but could be by user code: (fall through)

    case 'mouseenter':
    case 'mouseleave':
    case 'pointerenter':
    case 'pointerleave':
      return ContinuousEventPriority;

    case 'message':
      {
        // We might be in the Scheduler callback.
        // Eventually this mechanism will be replaced by a check
        // of the current priority on the native scheduler.
        var schedulerPriority = getCurrentSchedulerPriorityLevel();

        switch (schedulerPriority) {
          case ImmediateSchedulerPriority:
            return DiscreteEventPriority;

          case UserBlockingSchedulerPriority:
            return ContinuousEventPriority;

          case NormalSchedulerPriority:
          case LowSchedulerPriority:
            // TODO: Handle LowSchedulerPriority, somehow. Maybe the same lane as hydration.
            return DefaultEventPriority;

          case IdleSchedulerPriority:
            return IdleEventPriority;

          default:
            return DefaultEventPriority;
        }
      }

    default:
      return DefaultEventPriority;
  }
}