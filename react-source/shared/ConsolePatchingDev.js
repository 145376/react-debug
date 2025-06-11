/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// Helpers to patch console.logs to avoid logging during side-effect free
// replaying on render function. This currently only patches the object
// lazily which won't cover if the log function was extracted eagerly.
// We could also eagerly patch the method.
var disabledDepth = 0;
var prevLog;
var prevInfo;
var prevWarn;
var prevError;
var prevGroup;
var prevGroupCollapsed;
var prevGroupEnd;

function disabledLog() {}

disabledLog.__reactDisabledLog = true;
export function disableLogs() {
  if (__DEV__) {
    if (disabledDepth === 0) {
      /* eslint-disable react-internal/no-production-logging */
      prevLog = console.log;
      prevInfo = console.info;
      prevWarn = console.warn;
      prevError = console.error;
      prevGroup = console.group;
      prevGroupCollapsed = console.groupCollapsed;
      prevGroupEnd = console.groupEnd; // https://github.com/facebook/react/issues/19099

      var props = {
        configurable: true,
        enumerable: true,
        value: disabledLog,
        writable: true
      }; // $FlowFixMe[cannot-write] Flow thinks console is immutable.

      Object.defineProperties(console, {
        info: props,
        log: props,
        warn: props,
        error: props,
        group: props,
        groupCollapsed: props,
        groupEnd: props
      });
    }

    disabledDepth++;
  }
}
export function reenableLogs() {
  if (__DEV__) {
    disabledDepth--;

    if (disabledDepth === 0) {
      var props = {
        configurable: true,
        enumerable: true,
        writable: true
      }; // $FlowFixMe[cannot-write] Flow thinks console is immutable.

      Object.defineProperties(console, {
        log: Object.assign({}, props, {
          value: prevLog
        }),
        info: Object.assign({}, props, {
          value: prevInfo
        }),
        warn: Object.assign({}, props, {
          value: prevWarn
        }),
        error: Object.assign({}, props, {
          value: prevError
        }),
        group: Object.assign({}, props, {
          value: prevGroup
        }),
        groupCollapsed: Object.assign({}, props, {
          value: prevGroupCollapsed
        }),
        groupEnd: Object.assign({}, props, {
          value: prevGroupEnd
        })
      });
    }

    if (disabledDepth < 0) {
      console.error('disabledDepth fell below zero. ' + 'This is a bug in React. Please file an issue.');
    }
  }
}