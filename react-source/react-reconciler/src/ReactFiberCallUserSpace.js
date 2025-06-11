/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { isRendering, setIsRendering } from './ReactCurrentFiber';
import { captureCommitPhaseError } from './ReactFiberWorkLoop'; // These indirections exists so we can exclude its stack frame in DEV (and anything below it).
// TODO: Consider marking the whole bundle instead of these boundaries.

var callComponent = {
  'react-stack-bottom-frame': function (Component, props, secondArg) {
    var wasRendering = isRendering;
    setIsRendering(true);

    try {
      var result = Component(props, secondArg);
      return result;
    } finally {
      setIsRendering(wasRendering);
    }
  }
};
export var callComponentInDEV = __DEV__ ? // We use this technique to trick minifiers to preserve the function name.
callComponent['react-stack-bottom-frame'].bind(callComponent) : null;
var callRender = {
  'react-stack-bottom-frame': function (instance) {
    var wasRendering = isRendering;
    setIsRendering(true);

    try {
      var result = instance.render();
      return result;
    } finally {
      setIsRendering(wasRendering);
    }
  }
};
export var callRenderInDEV = __DEV__ ? // We use this technique to trick minifiers to preserve the function name.
callRender['react-stack-bottom-frame'].bind(callRender) : null;
var callComponentDidMount = {
  'react-stack-bottom-frame': function (finishedWork, instance) {
    try {
      instance.componentDidMount();
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
};
export var callComponentDidMountInDEV = __DEV__ ? // We use this technique to trick minifiers to preserve the function name.
callComponentDidMount['react-stack-bottom-frame'].bind(callComponentDidMount) : null;
var callComponentDidUpdate = {
  'react-stack-bottom-frame': function (finishedWork, instance, prevProps, prevState, snapshot) {
    try {
      instance.componentDidUpdate(prevProps, prevState, snapshot);
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
};
export var callComponentDidUpdateInDEV = __DEV__ ? // We use this technique to trick minifiers to preserve the function name.
callComponentDidUpdate['react-stack-bottom-frame'].bind(callComponentDidUpdate) : null;
var callComponentDidCatch = {
  'react-stack-bottom-frame': function (instance, errorInfo) {
    var error = errorInfo.value;
    var stack = errorInfo.stack;
    instance.componentDidCatch(error, {
      componentStack: stack !== null ? stack : ''
    });
  }
};
export var callComponentDidCatchInDEV = __DEV__ ? // We use this technique to trick minifiers to preserve the function name.
callComponentDidCatch['react-stack-bottom-frame'].bind(callComponentDidCatch) : null;
var callComponentWillUnmount = {
  'react-stack-bottom-frame': function (current, nearestMountedAncestor, instance) {
    try {
      instance.componentWillUnmount();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
};
export var callComponentWillUnmountInDEV = __DEV__ ? // We use this technique to trick minifiers to preserve the function name.
callComponentWillUnmount['react-stack-bottom-frame'].bind(callComponentWillUnmount) : null;
var callCreate = {
  'react-stack-bottom-frame': function (effect) {
    var create = effect.create;
    var inst = effect.inst;
    var destroy = create();
    inst.destroy = destroy;
    return destroy;
  }
};
export var callCreateInDEV = __DEV__ ? // We use this technique to trick minifiers to preserve the function name.
callCreate['react-stack-bottom-frame'].bind(callCreate) : null;
var callDestroy = {
  'react-stack-bottom-frame': function (current, nearestMountedAncestor, destroy) {
    try {
      destroy();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
};
export var callDestroyInDEV = __DEV__ ? // We use this technique to trick minifiers to preserve the function name.
callDestroy['react-stack-bottom-frame'].bind(callDestroy) : null;
var callLazyInit = {
  'react-stack-bottom-frame': function (lazy) {
    var payload = lazy._payload;
    var init = lazy._init;
    return init(payload);
  }
};
export var callLazyInitInDEV = __DEV__ ? // We use this technique to trick minifiers to preserve the function name.
callLazyInit['react-stack-bottom-frame'].bind(callLazyInit) : null;