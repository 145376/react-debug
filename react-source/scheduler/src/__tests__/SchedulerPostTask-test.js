/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

/* eslint-disable no-for-of-loops/no-for-of-loops */
'use strict';

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function () {}; return { s: F, n: function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function (e) { throw e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function () { it = o[Symbol.iterator](); }, n: function () { var step = it.next(); normalCompletion = step.done; return step; }, e: function (e) { didErr = true; err = e; }, f: function () { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var Scheduler;
var runtime;
var performance;
var cancelCallback;
var scheduleCallback;
var ImmediatePriority;
var NormalPriority;
var UserBlockingPriority;
var LowPriority;
var IdlePriority;
var shouldYield; // The Scheduler postTask implementation uses a new postTask browser API to
// schedule work on the main thread. This test suite mocks all browser methods
// used in our implementation. It assumes as little as possible about the order
// and timing of events.

describe('SchedulerPostTask', function () {
  beforeEach(function () {
    jest.resetModules();
    jest.mock('scheduler', function () {
      return jest.requireActual('scheduler/unstable_post_task');
    });
    runtime = installMockBrowserRuntime();
    performance = window.performance;
    Scheduler = require('scheduler');
    cancelCallback = Scheduler.unstable_cancelCallback;
    scheduleCallback = Scheduler.unstable_scheduleCallback;
    ImmediatePriority = Scheduler.unstable_ImmediatePriority;
    UserBlockingPriority = Scheduler.unstable_UserBlockingPriority;
    NormalPriority = Scheduler.unstable_NormalPriority;
    LowPriority = Scheduler.unstable_LowPriority;
    IdlePriority = Scheduler.unstable_IdlePriority;
    shouldYield = Scheduler.unstable_shouldYield;
  });
  afterEach(function () {
    if (!runtime.isLogEmpty()) {
      throw Error('Test exited without clearing log.');
    }
  });

  function installMockBrowserRuntime() {
    var taskQueue = new Map();
    var eventLog = []; // Mock window functions

    var window = {};
    global.window = window;
    var idCounter = 0;
    var currentTime = 0;
    window.performance = {
      now: function () {
        return currentTime;
      }
    }; // Note: setTimeout is used to report errors and nothing else.

    window.setTimeout = function (cb) {
      try {
        cb();
      } catch (error) {
        runtime.log("Error: " + error.message);
      }
    }; // Mock browser scheduler.


    var scheduler = {};
    global.scheduler = scheduler;

    scheduler.postTask = function (callback, _ref) {
      var signal = _ref.signal;
      var priority = signal.priority;
      var id = idCounter++;
      log("Post Task " + id + " [" + (priority === undefined ? '<default>' : priority) + "]");
      var controller = signal._controller;
      return new Promise(function (resolve, reject) {
        taskQueue.set(controller, {
          id: id,
          callback: callback,
          resolve: resolve,
          reject: reject
        });
      });
    };

    scheduler.yield = function (_ref2) {
      var signal = _ref2.signal;
      var priority = signal.priority;
      var id = idCounter++;
      log("Yield " + id + " [" + (priority === undefined ? '<default>' : priority) + "]");
      var controller = signal._controller;
      var callback;
      return {
        then: function (cb) {
          callback = cb;
          return new Promise(function (resolve, reject) {
            taskQueue.set(controller, {
              id: id,
              callback: callback,
              resolve: resolve,
              reject: reject
            });
          });
        }
      };
    };

    global.TaskController = class TaskController {
      constructor(_ref3) {
        var priority = _ref3.priority;
        this.signal = {
          _controller: this,
          priority: priority
        };
      }

      abort() {
        var task = taskQueue.get(this);

        if (task !== undefined) {
          taskQueue.delete(this);
          var reject = task.reject;
          reject(new Error('Aborted'));
        }
      }

    };

    function ensureLogIsEmpty() {
      if (eventLog.length !== 0) {
        throw Error('Log is not empty. Call assertLog before continuing.');
      }
    }

    function advanceTime(ms) {
      currentTime += ms;
    }

    function flushTasks() {
      ensureLogIsEmpty(); // If there's a continuation, it will call postTask again
      // which will set nextTask. That means we need to clear
      // nextTask before the invocation, otherwise we would
      // delete the continuation task.

      var prevTaskQueue = taskQueue;
      taskQueue = new Map();

      var _iterator = _createForOfIteratorHelper(prevTaskQueue),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var _step$value = _step.value,
              _step$value$ = _step$value[1],
              id = _step$value$.id,
              callback = _step$value$.callback,
              resolve = _step$value$.resolve;
          log("Task " + id + " Fired");
          callback(false);
          resolve();
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
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
      flushTasks: flushTasks,
      log: log,
      isLogEmpty: isLogEmpty,
      assertLog: assertLog
    };
  }

  it('task that finishes before deadline', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('A');
    });
    runtime.assertLog(['Post Task 0 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 0 Fired', 'A']);
  });
  it('task with continuation', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('A');

      while (!Scheduler.unstable_shouldYield()) {
        runtime.advanceTime(1);
      }

      runtime.log("Yield at " + performance.now() + "ms");
      return function () {
        runtime.log('Continuation');
      };
    });
    runtime.assertLog(['Post Task 0 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 0 Fired', 'A', 'Yield at 5ms', 'Yield 1 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 1 Fired', 'Continuation']);
  });
  it('multiple tasks', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('A');
    });
    scheduleCallback(NormalPriority, function () {
      runtime.log('B');
    });
    runtime.assertLog(['Post Task 0 [user-visible]', 'Post Task 1 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 0 Fired', 'A', 'Task 1 Fired', 'B']);
  });
  it('cancels tasks', function () {
    var task = scheduleCallback(NormalPriority, function () {
      runtime.log('A');
    });
    runtime.assertLog(['Post Task 0 [user-visible]']);
    cancelCallback(task);
    runtime.flushTasks();
    runtime.assertLog([]);
  });
  it('an error in one task does not affect execution of other tasks', function () {
    scheduleCallback(NormalPriority, function () {
      throw Error('Oops!');
    });
    scheduleCallback(NormalPriority, function () {
      runtime.log('Yay');
    });
    runtime.assertLog(['Post Task 0 [user-visible]', 'Post Task 1 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 0 Fired', 'Error: Oops!', 'Task 1 Fired', 'Yay']);
  });
  it('schedule new task after queue has emptied', function () {
    scheduleCallback(NormalPriority, function () {
      runtime.log('A');
    });
    runtime.assertLog(['Post Task 0 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 0 Fired', 'A']);
    scheduleCallback(NormalPriority, function () {
      runtime.log('B');
    });
    runtime.assertLog(['Post Task 1 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 1 Fired', 'B']);
  });
  it('schedule new task after a cancellation', function () {
    var handle = scheduleCallback(NormalPriority, function () {
      runtime.log('A');
    });
    runtime.assertLog(['Post Task 0 [user-visible]']);
    cancelCallback(handle);
    runtime.flushTasks();
    runtime.assertLog([]);
    scheduleCallback(NormalPriority, function () {
      runtime.log('B');
    });
    runtime.assertLog(['Post Task 1 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 1 Fired', 'B']);
  });
  it('schedules tasks at different priorities', function () {
    scheduleCallback(ImmediatePriority, function () {
      runtime.log('A');
    });
    scheduleCallback(UserBlockingPriority, function () {
      runtime.log('B');
    });
    scheduleCallback(NormalPriority, function () {
      runtime.log('C');
    });
    scheduleCallback(LowPriority, function () {
      runtime.log('D');
    });
    scheduleCallback(IdlePriority, function () {
      runtime.log('E');
    });
    runtime.assertLog(['Post Task 0 [user-blocking]', 'Post Task 1 [user-blocking]', 'Post Task 2 [user-visible]', 'Post Task 3 [user-visible]', 'Post Task 4 [background]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 0 Fired', 'A', 'Task 1 Fired', 'B', 'Task 2 Fired', 'C', 'Task 3 Fired', 'D', 'Task 4 Fired', 'E']);
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
    runtime.assertLog(['Post Task 0 [user-visible]']);
    runtime.flushTasks();
    runtime.assertLog(['Task 0 Fired', 'Original Task', // Immediately before returning a continuation, `shouldYield` returns
    // false, which means there must be time remaining in the frame.
    'shouldYield: false', 'Return a continuation', // The continuation should be scheduled in a separate macrotask even
    // though there's time remaining.
    'Yield 1 [user-visible]']); // No time has elapsed

    expect(performance.now()).toBe(0);
    runtime.flushTasks();
    runtime.assertLog(['Task 1 Fired', 'Continuation Task']);
  });
  describe('falls back to postTask for scheduling continuations when scheduler.yield is not available', function () {
    beforeEach(function () {
      delete global.scheduler.yield;
    });
    it('task with continuation', function () {
      scheduleCallback(NormalPriority, function () {
        runtime.log('A');

        while (!Scheduler.unstable_shouldYield()) {
          runtime.advanceTime(1);
        }

        runtime.log("Yield at " + performance.now() + "ms");
        return function () {
          runtime.log('Continuation');
        };
      });
      runtime.assertLog(['Post Task 0 [user-visible]']);
      runtime.flushTasks();
      runtime.assertLog(['Task 0 Fired', 'A', 'Yield at 5ms', 'Post Task 1 [user-visible]']);
      runtime.flushTasks();
      runtime.assertLog(['Task 1 Fired', 'Continuation']);
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
      runtime.assertLog(['Post Task 0 [user-visible]']);
      runtime.flushTasks();
      runtime.assertLog(['Task 0 Fired', 'Original Task', // Immediately before returning a continuation, `shouldYield` returns
      // false, which means there must be time remaining in the frame.
      'shouldYield: false', 'Return a continuation', // The continuation should be scheduled in a separate macrotask even
      // though there's time remaining.
      'Post Task 1 [user-visible]']); // No time has elapsed

      expect(performance.now()).toBe(0);
      runtime.flushTasks();
      runtime.assertLog(['Task 1 Fired', 'Continuation Task']);
    });
  });
});