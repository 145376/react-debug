/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { getInstanceFromNode, getFiberCurrentPropsFromNode } from '../client/ReactDOMComponentTree';
import { restoreControlledState } from 'react-dom-bindings/src/client/ReactDOMComponent'; // Use to restore controlled state after a change event has fired.

var restoreTarget = null;
var restoreQueue = null;

function restoreStateOfTarget(target) {
  // We perform this translation at the end of the event loop so that we
  // always receive the correct fiber here
  var internalInstance = getInstanceFromNode(target);

  if (!internalInstance) {
    // Unmounted
    return;
  }

  var stateNode = internalInstance.stateNode; // Guard against Fiber being unmounted.

  if (stateNode) {
    var props = getFiberCurrentPropsFromNode(stateNode);
    restoreControlledState(internalInstance.stateNode, internalInstance.type, props);
  }
}

export function enqueueStateRestore(target) {
  if (restoreTarget) {
    if (restoreQueue) {
      restoreQueue.push(target);
    } else {
      restoreQueue = [target];
    }
  } else {
    restoreTarget = target;
  }
}
export function needsStateRestore() {
  return restoreTarget !== null || restoreQueue !== null;
}
export function restoreStateIfNeeded() {
  if (!restoreTarget) {
    return;
  }

  var target = restoreTarget;
  var queuedTargets = restoreQueue;
  restoreTarget = null;
  restoreQueue = null;
  restoreStateOfTarget(target);

  if (queuedTargets) {
    for (var i = 0; i < queuedTargets.length; i++) {
      restoreStateOfTarget(queuedTargets[i]);
    }
  }
}