/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */
'use strict';

var Scheduler;
var runtime;
var performance;
var cancelCallback;
var scheduleCallback;
var NormalPriority;
var UserBlockingPriority; // The Scheduler implementation uses browser APIs like `MessageChannel` and
// `setTimeout` to schedule work on the main thread. Most of our tests treat
// these as implementation details; however, the sequence and timing of these
// APIs are not precisely specified, and can vary across browsers.
//
// To prevent regressions, we need the ability to simulate specific edge cases
// that we may encounter in various browsers.
//
// This test suite mocks all browser methods used in our implementation. It
// assumes as little as possible about the order and timing of events.

describe('SchedulerDOMSetImmediate', function () {
  beforeEach(function () {
    jest.resetModules();
    runtime = installMockBrowserRuntime();
    jest.unmock('scheduler');
    performance = global.performance;
    Scheduler = require('scheduler');
    cancelCallback = Scheduler.unstable_cancelCallback;
    scheduleCallback = Scheduler.unstable_scheduleCallback;
    NormalPriority = Scheduler.unstable_NormalPriority;
    UserBlockingPriority = Scheduler.unstable_UserBlockingPriority;
  });
  afterEach(function () {
    delete global.performance;

    if (!runtime.isLogEmpty()) {
      throw Error('Test exited without clearing log.');
    }
  });

  function installMockBrowserRuntime() {
    var timerIDCounter = 0; // let timerIDs = new Map();

    var eventLog = [];
    var currentTime = 0;
    global.performance = {
      now: function () {
        return currentTime;
      }
    };

    global.setTimeout = function (cb, delay) {
      var id = timerIDCounter++;
      log("Set Timer");
      return id;
    };

    global.clearTimeout = function (id) {// TODO
    }; // Unused: we expect setImmediate to be preferred.


    global.MessageChannel = function () {
      return {
        port1: {},
        port2: {
          postMessage: function () {
            throw Error('Should be unused');
          }
        }
      };
    };

    var pendingSetImmediateCallback = null;

    global.setImmediate = function (cb) {
      if (pendingSetImmediateCallback) {
        throw Error('Message event already scheduled');
      }

      log('Set Immediate');
      pendingSetImmediateCallback = cb;
    };

    function ensureLogIsEmpty() {
      if (eventLog.length !== 0) {
        throw Error('Log is not empty. Call assertLog before continuing.');
      }
    }

    function advanceTime(ms) {
      currentTime += ms;
    }

    function fireSetImmediate() {
      ensureLogIsEmpty();

      if (!pendingSetImmediateCallback) {
        throw Error('No setImmediate was scheduled');
      }

      var cb = pendingSetImmediateCallback;
      pendingSetImmediateCallback = null;
      log('setImmediate Callback');
      cb();
    }

    function log(val) {
      eventLog.push(val);
    }

    function isLogEmpty() {
      return eventLog.length === 0;
    }

    function assertLog(expected) {
      var actual = eventLog;
      eventLog = [];
      expect(actual).toEqual(expected);
    }

    return {
      advanceTime: advanceTime,
      fireSetImmediate: fireSetImmediate,
      log: log,
      isLogEmpty: isLogEmpty,
      assertLog: assertLog
    };
  }

  it('does not use setImmediate override', function () {
    global.setImmediate = function () {
      throw new Error('Should not throw');
    };

    scheduleCallback(NormalPriority, function () {
      runtime.log('Task');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'Task']);
  });
  it('task that finishes before deadline', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('Task');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'Task']);
  });
  it('task with continuation', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('Task');

      while (!Scheduler.unstable_shouldYield()) {
        runtime.advanceTime(1);
      }

      runtime.log("Yield at " + performance.now() + "ms");
      return function () {
        runtime.log('Continuation');
      };
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'Task', gate(function (flags) {
      return flags.www ? 'Yield at 10ms' : 'Yield at 5ms';
    }), 'Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'Continuation']);
  });
  it('multiple tasks', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('A');
    });
    scheduleCallback(NormalPriority, function () {
      runtime.log('B');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();

    if (gate(function (flags) {
      return flags.enableAlwaysYieldScheduler;
    })) {
      runtime.assertLog(['setImmediate Callback', 'A', 'Set Immediate']);
      runtime.fireSetImmediate();
      runtime.assertLog(['setImmediate Callback', 'B']);
    } else {
      runtime.assertLog(['setImmediate Callback', 'A', 'B']);
    }
  });
  it('multiple tasks at different priority', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('A');
    });
    scheduleCallback(UserBlockingPriority, function () {
      runtime.log('B');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();

    if (gate(function (flags) {
      return flags.enableAlwaysYieldScheduler;
    })) {
      runtime.assertLog(['setImmediate Callback', 'B', 'Set Immediate']);
      runtime.fireSetImmediate();
      runtime.assertLog(['setImmediate Callback', 'A']);
    } else {
      runtime.assertLog(['setImmediate Callback', 'B', 'A']);
    }
  });
  it('multiple tasks with a yield in between', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('A');
      runtime.advanceTime(4999);
    });
    scheduleCallback(NormalPriority, function () {
      runtime.log('B');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'A', // Ran out of time. Post a continuation event.
    'Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'B']);
  });
  it('cancels tasks', function () {
    var task = scheduleCallback(NormalPriority, function () {
      runtime.log('Task');
    });
    runtime.assertLog(['Set Immediate']);
    cancelCallback(task);
    runtime.assertLog([]);
  });
  it('throws when a task errors then continues in a new event', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('Oops!');
      throw Error('Oops!');
    });
    scheduleCallback(NormalPriority, function () {
      runtime.log('Yay');
    });
    runtime.assertLog(['Set Immediate']);
    expect(function () {
      return runtime.fireSetImmediate();
    }).toThrow('Oops!');
    runtime.assertLog(['setImmediate Callback', 'Oops!', 'Set Immediate']);
    runtime.fireSetImmediate();

    if (gate(function (flags) {
      return flags.enableAlwaysYieldScheduler;
    })) {
      runtime.assertLog(['setImmediate Callback', 'Set Immediate']);
      runtime.fireSetImmediate();
      runtime.assertLog(['setImmediate Callback', 'Yay']);
    } else {
      runtime.assertLog(['setImmediate Callback', 'Yay']);
    }
  });
  it('schedule new task after queue has emptied', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('A');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'A']);
    scheduleCallback(NormalPriority, function () {
      runtime.log('B');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'B']);
  });
  it('schedule new task after a cancellation', function () {
    var handle = scheduleCallback(NormalPriority, function () {
      runtime.log('A');
    });
    runtime.assertLog(['Set Immediate']);
    cancelCallback(handle);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback']);
    scheduleCallback(NormalPriority, function () {
      runtime.log('B');
    });
    runtime.assertLog(['Set Immediate']);
    runtime.fireSetImmediate();
    runtime.assertLog(['setImmediate Callback', 'B']);
  });
});
test('does not crash if setImmediate is undefined', function () {
  jest.resetModules();
  var originalSetImmediate = global.setImmediate;

  try {
    delete global.setImmediate;
    jest.unmock('scheduler');
    expect(function () {
      require('scheduler');
    }).not.toThrow();
  } finally {
    global.setImmediate = originalSetImmediate;
  }
});