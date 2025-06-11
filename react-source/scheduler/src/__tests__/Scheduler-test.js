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
var requestPaint;
var shouldYield;
var NormalPriority;
var SchedulerFeatureFlags; // The Scheduler implementation uses browser APIs like `MessageChannel` and
// `setTimeout` to schedule work on the main thread. Most of our tests treat
// these as implementation details; however, the sequence and timing of these
// APIs are not precisely specified, and can vary across browsers.
//
// To prevent regressions, we need the ability to simulate specific edge cases
// that we may encounter in various browsers.
//
// This test suite mocks all browser methods used in our implementation. It
// assumes as little as possible about the order and timing of events.

describe('SchedulerBrowser', function () {
  beforeEach(function () {
    jest.resetModules();
    runtime = installMockBrowserRuntime();
    jest.unmock('scheduler');
    performance = global.performance;
    Scheduler = require('scheduler');
    cancelCallback = Scheduler.unstable_cancelCallback;
    scheduleCallback = Scheduler.unstable_scheduleCallback;
    NormalPriority = Scheduler.unstable_NormalPriority;
    requestPaint = Scheduler.unstable_requestPaint;
    shouldYield = Scheduler.unstable_shouldYield;
    SchedulerFeatureFlags = require('../SchedulerFeatureFlags');
  });
  afterEach(function () {
    delete global.performance;

    if (!runtime.isLogEmpty()) {
      throw Error('Test exited without clearing log.');
    }
  });

  function installMockBrowserRuntime() {
    var hasPendingMessageEvent = false;
    var isFiringMessageEvent = false;
    var hasPendingDiscreteEvent = false;
    var hasPendingContinuousEvent = false;
    var timerIDCounter = 0; // let timerIDs = new Map();

    var eventLog = [];
    var currentTime = 0;
    global.performance = {
      now: function () {
        return currentTime;
      }
    }; // Delete node provide setImmediate so we fall through to MessageChannel.

    delete global.setImmediate;

    global.setTimeout = function (cb, delay) {
      var id = timerIDCounter++;
      log("Set Timer"); // TODO

      return id;
    };

    global.clearTimeout = function (id) {// TODO
    };

    var port1 = {};
    var port2 = {
      postMessage: function () {
        if (hasPendingMessageEvent) {
          throw Error('Message event already scheduled');
        }

        log('Post Message');
        hasPendingMessageEvent = true;
      }
    };

    global.MessageChannel = function MessageChannel() {
      this.port1 = port1;
      this.port2 = port2;
    };

    function ensureLogIsEmpty() {
      if (eventLog.length !== 0) {
        throw Error('Log is not empty. Call assertLog before continuing.');
      }
    }

    function advanceTime(ms) {
      currentTime += ms;
    }

    function resetTime() {
      currentTime = 0;
    }

    function fireMessageEvent() {
      ensureLogIsEmpty();

      if (!hasPendingMessageEvent) {
        throw Error('No message event was scheduled');
      }

      hasPendingMessageEvent = false;
      var onMessage = port1.onmessage;
      log('Message Event');
      isFiringMessageEvent = true;

      try {
        onMessage();
      } finally {
        isFiringMessageEvent = false;

        if (hasPendingDiscreteEvent) {
          log('Discrete Event');
          hasPendingDiscreteEvent = false;
        }

        if (hasPendingContinuousEvent) {
          log('Continuous Event');
          hasPendingContinuousEvent = false;
        }
      }
    }

    function scheduleDiscreteEvent() {
      if (isFiringMessageEvent) {
        hasPendingDiscreteEvent = true;
      } else {
        log('Discrete Event');
      }
    }

    function scheduleContinuousEvent() {
      if (isFiringMessageEvent) {
        hasPendingContinuousEvent = true;
      } else {
        log('Continuous Event');
      }
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
      resetTime: resetTime,
      fireMessageEvent: fireMessageEvent,
      log: log,
      isLogEmpty: isLogEmpty,
      assertLog: assertLog,
      scheduleDiscreteEvent: scheduleDiscreteEvent,
      scheduleContinuousEvent: scheduleContinuousEvent
    };
  }

  it('task that finishes before deadline', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('Task');
    });
    runtime.assertLog(['Post Message']);
    runtime.fireMessageEvent();
    runtime.assertLog(['Message Event', 'Task']);
  });
  it('task with continuation', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('Task'); // Request paint so that we yield immediately

      requestPaint();

      while (!Scheduler.unstable_shouldYield()) {
        runtime.advanceTime(1);
      }

      runtime.log("Yield at " + performance.now() + "ms");
      return function () {
        runtime.log('Continuation');
      };
    });
    runtime.assertLog(['Post Message']);
    runtime.fireMessageEvent();
    runtime.assertLog(['Message Event', 'Task', gate(function (flags) {
      return flags.enableAlwaysYieldScheduler;
    }) || !SchedulerFeatureFlags.enableRequestPaint ? gate(function (flags) {
      return flags.www ? 'Yield at 10ms' : 'Yield at 5ms';
    }) : 'Yield at 0ms', 'Post Message']);
    runtime.fireMessageEvent();
    runtime.assertLog(['Message Event', 'Continuation']);
  });
  it('multiple tasks', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('A');
    });
    scheduleCallback(NormalPriority, function () {
      runtime.log('B');
    });
    runtime.assertLog(['Post Message']);
    runtime.fireMessageEvent();

    if (gate(function (flags) {
      return flags.enableAlwaysYieldScheduler;
    })) {
      runtime.assertLog(['Message Event', 'A', 'Post Message']);
      runtime.fireMessageEvent();
      runtime.assertLog(['Message Event', 'B']);
    } else {
      runtime.assertLog(['Message Event', 'A', 'B']);
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
    runtime.assertLog(['Post Message']);
    runtime.fireMessageEvent();
    runtime.assertLog(['Message Event', 'A', // Ran out of time. Post a continuation event.
    'Post Message']);
    runtime.fireMessageEvent();
    runtime.assertLog(['Message Event', 'B']);
  });
  it('cancels tasks', function () {
    var task = scheduleCallback(NormalPriority, function () {
      runtime.log('Task');
    });
    runtime.assertLog(['Post Message']);
    cancelCallback(task);
    runtime.fireMessageEvent();
    runtime.assertLog(['Message Event']);
  });
  it('throws when a task errors then continues in a new event', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('Oops!');
      throw Error('Oops!');
    });
    scheduleCallback(NormalPriority, function () {
      runtime.log('Yay');
    });
    runtime.assertLog(['Post Message']);
    expect(function () {
      return runtime.fireMessageEvent();
    }).toThrow('Oops!');
    runtime.assertLog(['Message Event', 'Oops!', 'Post Message']);
    runtime.fireMessageEvent();

    if (gate(function (flags) {
      return flags.enableAlwaysYieldScheduler;
    })) {
      runtime.assertLog(['Message Event', 'Post Message']);
      runtime.fireMessageEvent();
    }

    runtime.assertLog(['Message Event', 'Yay']);
  });
  it('schedule new task after queue has emptied', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('A');
    });
    runtime.assertLog(['Post Message']);
    runtime.fireMessageEvent();
    runtime.assertLog(['Message Event', 'A']);
    scheduleCallback(NormalPriority, function () {
      runtime.log('B');
    });
    runtime.assertLog(['Post Message']);
    runtime.fireMessageEvent();
    runtime.assertLog(['Message Event', 'B']);
  });
  it('schedule new task after a cancellation', function () {
    var handle = scheduleCallback(NormalPriority, function () {
      runtime.log('A');
    });
    runtime.assertLog(['Post Message']);
    cancelCallback(handle);
    runtime.fireMessageEvent();
    runtime.assertLog(['Message Event']);
    scheduleCallback(NormalPriority, function () {
      runtime.log('B');
    });
    runtime.assertLog(['Post Message']);
    runtime.fireMessageEvent();
    runtime.assertLog(['Message Event', 'B']);
  });
  it('yielding continues in a new task regardless of how much time is remaining', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('Original Task');
      runtime.log('shouldYield: ' + shouldYield());
      runtime.log('Return a continuation');
      return function () {
        runtime.log('Continuation Task');
      };
    });
    runtime.assertLog(['Post Message']);
    runtime.fireMessageEvent();
    runtime.assertLog(['Message Event', 'Original Task', // Immediately before returning a continuation, `shouldYield` returns
    // false, which means there must be time remaining in the frame.
    'shouldYield: false', 'Return a continuation', // The continuation should be scheduled in a separate macrotask even
    // though there's time remaining.
    'Post Message']); // No time has elapsed

    expect(performance.now()).toBe(0);
    runtime.fireMessageEvent();
    runtime.assertLog(['Message Event', 'Continuation Task']);
  });
});