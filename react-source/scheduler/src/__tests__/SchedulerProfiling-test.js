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

var Scheduler; // let runWithPriority;

var ImmediatePriority;
var UserBlockingPriority;
var NormalPriority;
var LowPriority;
var IdlePriority;
var scheduleCallback;
var cancelCallback; // let wrapCallback;
// let getCurrentPriorityLevel;
// let shouldYield;

var waitForAll;
var waitFor;
var waitForThrow;

function priorityLevelToString(priorityLevel) {
  switch (priorityLevel) {
    case ImmediatePriority:
      return 'Immediate';

    case UserBlockingPriority:
      return 'User-blocking';

    case NormalPriority:
      return 'Normal';

    case LowPriority:
      return 'Low';

    case IdlePriority:
      return 'Idle';

    default:
      return null;
  }
}

describe('Scheduler', function () {
  var _require = require('scheduler/src/SchedulerFeatureFlags'),
      enableProfiling = _require.enableProfiling;

  if (!enableProfiling) {
    // The tests in this suite only apply when profiling is on
    it('profiling APIs are not available', function () {
      Scheduler = require('scheduler');
      expect(Scheduler.unstable_Profiling).toBe(null);
    });
    return;
  }

  beforeEach(function () {
    jest.resetModules();
    jest.mock('scheduler', function () {
      return require('scheduler/unstable_mock');
    });
    Scheduler = require('scheduler'); // runWithPriority = Scheduler.unstable_runWithPriority;

    ImmediatePriority = Scheduler.unstable_ImmediatePriority;
    UserBlockingPriority = Scheduler.unstable_UserBlockingPriority;
    NormalPriority = Scheduler.unstable_NormalPriority;
    LowPriority = Scheduler.unstable_LowPriority;
    IdlePriority = Scheduler.unstable_IdlePriority;
    scheduleCallback = Scheduler.unstable_scheduleCallback;
    cancelCallback = Scheduler.unstable_cancelCallback; // wrapCallback = Scheduler.unstable_wrapCallback;
    // getCurrentPriorityLevel = Scheduler.unstable_getCurrentPriorityLevel;
    // shouldYield = Scheduler.unstable_shouldYield;

    var InternalTestUtils = require('internal-test-utils');

    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    waitForThrow = InternalTestUtils.waitForThrow;
  });
  var TaskStartEvent = 1;
  var TaskCompleteEvent = 2;
  var TaskErrorEvent = 3;
  var TaskCancelEvent = 4;
  var TaskRunEvent = 5;
  var TaskYieldEvent = 6;
  var SchedulerSuspendEvent = 7;
  var SchedulerResumeEvent = 8;

  function stopProfilingAndPrintFlamegraph() {
    var eventBuffer = Scheduler.unstable_Profiling.stopLoggingProfilingEvents();

    if (eventBuffer === null) {
      return '(empty profile)';
    }

    var eventLog = new Int32Array(eventBuffer);
    var tasks = new Map();
    var mainThreadRuns = [];
    var isSuspended = true;
    var i = 0;

    processLog: while (i < eventLog.length) {
      var instruction = eventLog[i];
      var time = eventLog[i + 1];

      switch (instruction) {
        case 0:
          {
            break processLog;
          }

        case TaskStartEvent:
          {
            var taskId = eventLog[i + 2];
            var priorityLevel = eventLog[i + 3];
            var task = {
              id: taskId,
              priorityLevel: priorityLevel,
              label: null,
              start: time,
              end: -1,
              exitStatus: null,
              runs: []
            };
            tasks.set(taskId, task);
            i += 4;
            break;
          }

        case TaskCompleteEvent:
          {
            if (isSuspended) {
              throw Error('Task cannot Complete outside the work loop.');
            }

            var _taskId = eventLog[i + 2];

            var _task = tasks.get(_taskId);

            if (_task === undefined) {
              throw Error('Task does not exist.');
            }

            _task.end = time;
            _task.exitStatus = 'completed';
            i += 3;
            break;
          }

        case TaskErrorEvent:
          {
            if (isSuspended) {
              throw Error('Task cannot Error outside the work loop.');
            }

            var _taskId2 = eventLog[i + 2];

            var _task2 = tasks.get(_taskId2);

            if (_task2 === undefined) {
              throw Error('Task does not exist.');
            }

            _task2.end = time;
            _task2.exitStatus = 'errored';
            i += 3;
            break;
          }

        case TaskCancelEvent:
          {
            var _taskId3 = eventLog[i + 2];

            var _task3 = tasks.get(_taskId3);

            if (_task3 === undefined) {
              throw Error('Task does not exist.');
            }

            _task3.end = time;
            _task3.exitStatus = 'canceled';
            i += 3;
            break;
          }

        case TaskRunEvent:
        case TaskYieldEvent:
          {
            if (isSuspended) {
              throw Error('Task cannot Run or Yield outside the work loop.');
            }

            var _taskId4 = eventLog[i + 2];

            var _task4 = tasks.get(_taskId4);

            if (_task4 === undefined) {
              throw Error('Task does not exist.');
            }

            _task4.runs.push(time);

            i += 4;
            break;
          }

        case SchedulerSuspendEvent:
          {
            if (isSuspended) {
              throw Error('Scheduler cannot Suspend outside the work loop.');
            }

            isSuspended = true;
            mainThreadRuns.push(time);
            i += 3;
            break;
          }

        case SchedulerResumeEvent:
          {
            if (!isSuspended) {
              throw Error('Scheduler cannot Resume inside the work loop.');
            }

            isSuspended = false;
            mainThreadRuns.push(time);
            i += 3;
            break;
          }

        default:
          {
            throw Error('Unknown instruction type: ' + instruction);
          }
      }
    } // Now we can render the tasks as a flamegraph.


    var labelColumnWidth = 30; // Scheduler event times are in microseconds

    var microsecondsPerChar = 50000;
    var result = '';
    var mainThreadLabelColumn = '!!! Main thread              ';
    var mainThreadTimelineColumn = '';
    var isMainThreadBusy = true;

    for (var _i = 0, _mainThreadRuns = mainThreadRuns; _i < _mainThreadRuns.length; _i++) {
      var _time = _mainThreadRuns[_i];
      var index = _time / microsecondsPerChar;
      mainThreadTimelineColumn += (isMainThreadBusy ? '█' : '░').repeat(index - mainThreadTimelineColumn.length);
      isMainThreadBusy = !isMainThreadBusy;
    }

    result += mainThreadLabelColumn + "\u2502" + mainThreadTimelineColumn + "\n";
    var tasksByPriority = Array.from(tasks.values()).sort(function (t1, t2) {
      return t1.priorityLevel - t2.priorityLevel;
    });

    var _iterator = _createForOfIteratorHelper(tasksByPriority),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var _task5 = _step.value;
        var label = _task5.label;

        if (label === undefined) {
          label = 'Task';
        }

        var labelColumn = "Task " + _task5.id + " [" + priorityLevelToString(_task5.priorityLevel) + "]";
        labelColumn += ' '.repeat(labelColumnWidth - labelColumn.length - 1); // Add empty space up until the start mark

        var timelineColumn = ' '.repeat(_task5.start / microsecondsPerChar);
        var isRunning = false;

        var _iterator2 = _createForOfIteratorHelper(_task5.runs),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var _time2 = _step2.value;

            var _index = _time2 / microsecondsPerChar;

            timelineColumn += (isRunning ? '█' : '░').repeat(_index - timelineColumn.length);
            isRunning = !isRunning;
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }

        var endIndex = _task5.end / microsecondsPerChar;
        timelineColumn += (isRunning ? '█' : '░').repeat(endIndex - timelineColumn.length);

        if (_task5.exitStatus !== 'completed') {
          timelineColumn += "\uD83E\uDC50 " + _task5.exitStatus;
        }

        result += labelColumn + "\u2502" + timelineColumn + "\n";
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return '\n' + result;
  }

  it('creates a basic flamegraph', async function () {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    Scheduler.unstable_advanceTime(100);
    scheduleCallback(NormalPriority, function () {
      Scheduler.unstable_advanceTime(300);
      Scheduler.log('Yield 1');
      scheduleCallback(UserBlockingPriority, function () {
        Scheduler.log('Yield 2');
        Scheduler.unstable_advanceTime(300);
      }, {
        label: 'Bar'
      });
      Scheduler.unstable_advanceTime(100);
      Scheduler.log('Yield 3');
      return function () {
        Scheduler.log('Yield 4');
        Scheduler.unstable_advanceTime(300);
      };
    }, {
      label: 'Foo'
    });
    await waitFor(['Yield 1', 'Yield 3']);
    Scheduler.unstable_advanceTime(100);
    await waitForAll(['Yield 2', 'Yield 4']);
    expect(stopProfilingAndPrintFlamegraph()).toEqual("\n!!! Main thread              \u2502\u2588\u2588\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2588\u2588\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\nTask 2 [User-blocking]       \u2502        \u2591\u2591\u2591\u2591\u2588\u2588\u2588\u2588\u2588\u2588\nTask 1 [Normal]              \u2502  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2588\u2588\u2588\u2588\u2588\u2588\n");
  });
  it('marks when a task is canceled', async function () {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    var task = scheduleCallback(NormalPriority, function () {
      Scheduler.log('Yield 1');
      Scheduler.unstable_advanceTime(300);
      Scheduler.log('Yield 2');
      return function () {
        Scheduler.log('Continuation');
        Scheduler.unstable_advanceTime(200);
      };
    });
    await waitFor(['Yield 1', 'Yield 2']);
    Scheduler.unstable_advanceTime(100);
    cancelCallback(task);
    Scheduler.unstable_advanceTime(1000);
    await waitForAll([]);
    expect(stopProfilingAndPrintFlamegraph()).toEqual("\n!!! Main thread              \u2502\u2591\u2591\u2591\u2591\u2591\u2591\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\nTask 1 [Normal]              \u2502\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\uD83E\uDC50 canceled\n");
  });
  it('marks when a task errors', async function () {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    scheduleCallback(NormalPriority, function () {
      Scheduler.unstable_advanceTime(300);
      throw Error('Oops');
    });
    await waitForThrow('Oops');
    Scheduler.unstable_advanceTime(100);
    Scheduler.unstable_advanceTime(1000);
    await waitForAll([]);
    expect(stopProfilingAndPrintFlamegraph()).toEqual("\n!!! Main thread              \u2502\u2591\u2591\u2591\u2591\u2591\u2591\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\nTask 1 [Normal]              \u2502\u2588\u2588\u2588\u2588\u2588\u2588\uD83E\uDC50 errored\n");
  });
  it('marks when multiple tasks are canceled', async function () {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    var task1 = scheduleCallback(NormalPriority, function () {
      Scheduler.log('Yield 1');
      Scheduler.unstable_advanceTime(300);
      Scheduler.log('Yield 2');
      return function () {
        Scheduler.log('Continuation');
        Scheduler.unstable_advanceTime(200);
      };
    });
    var task2 = scheduleCallback(NormalPriority, function () {
      Scheduler.log('Yield 3');
      Scheduler.unstable_advanceTime(300);
      Scheduler.log('Yield 4');
      return function () {
        Scheduler.log('Continuation');
        Scheduler.unstable_advanceTime(200);
      };
    });
    await waitFor(['Yield 1', 'Yield 2']);
    Scheduler.unstable_advanceTime(100);
    cancelCallback(task1);
    cancelCallback(task2); // Advance more time. This should not affect the size of the main
    // thread row, since the Scheduler queue is empty.

    Scheduler.unstable_advanceTime(1000);
    await waitForAll([]); // The main thread row should end when the callback is cancelled.

    expect(stopProfilingAndPrintFlamegraph()).toEqual("\n!!! Main thread              \u2502\u2591\u2591\u2591\u2591\u2591\u2591\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\nTask 1 [Normal]              \u2502\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\uD83E\uDC50 canceled\nTask 2 [Normal]              \u2502\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\uD83E\uDC50 canceled\n");
  });
  it('handles cancelling a task that already finished', async function () {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    var task = scheduleCallback(NormalPriority, function () {
      Scheduler.log('A');
      Scheduler.unstable_advanceTime(1000);
    });
    await waitForAll(['A']);
    cancelCallback(task);
    expect(stopProfilingAndPrintFlamegraph()).toEqual("\n!!! Main thread              \u2502\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\nTask 1 [Normal]              \u2502\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\n");
  });
  it('handles cancelling a task multiple times', async function () {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    scheduleCallback(NormalPriority, function () {
      Scheduler.log('A');
      Scheduler.unstable_advanceTime(1000);
    }, {
      label: 'A'
    });
    Scheduler.unstable_advanceTime(200);
    var task = scheduleCallback(NormalPriority, function () {
      Scheduler.log('B');
      Scheduler.unstable_advanceTime(1000);
    }, {
      label: 'B'
    });
    Scheduler.unstable_advanceTime(400);
    cancelCallback(task);
    cancelCallback(task);
    cancelCallback(task);
    await waitForAll(['A']);
    expect(stopProfilingAndPrintFlamegraph()).toEqual("\n!!! Main thread              \u2502\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\nTask 1 [Normal]              \u2502\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\nTask 2 [Normal]              \u2502    \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\uD83E\uDC50 canceled\n");
  });
  it('handles delayed tasks', async function () {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    scheduleCallback(NormalPriority, function () {
      Scheduler.unstable_advanceTime(1000);
      Scheduler.log('A');
    }, {
      delay: 1000
    });
    await waitForAll([]);
    Scheduler.unstable_advanceTime(1000);
    await waitForAll(['A']);
    expect(stopProfilingAndPrintFlamegraph()).toEqual("\n!!! Main thread              \u2502\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\nTask 1 [Normal]              \u2502                    \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\n");
  });
  it('handles cancelling a delayed task', async function () {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    var task = scheduleCallback(NormalPriority, function () {
      return Scheduler.log('A');
    }, {
      delay: 1000
    });
    cancelCallback(task);
    await waitForAll([]);
    expect(stopProfilingAndPrintFlamegraph()).toEqual("\n!!! Main thread              \u2502\n");
  });
  it('automatically stops profiling and warns if event log gets too big', async function () {
    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    spyOnDevAndProd(console, 'error').mockImplementation(function () {}); // Increase infinite loop guard limit

    var originalMaxIterations = global.__MAX_ITERATIONS__;
    global.__MAX_ITERATIONS__ = 120000;
    var taskId = 1;

    while (console.error.mock.calls.length === 0) {
      taskId++;
      var task = scheduleCallback(NormalPriority, function () {});
      cancelCallback(task);
      Scheduler.unstable_flushAll();
    }

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0]).toBe("Scheduler Profiling: Event log exceeded maximum size. Don't forget " + 'to call `stopLoggingProfilingEvents()`.'); // Should automatically clear profile

    expect(stopProfilingAndPrintFlamegraph()).toEqual('(empty profile)'); // Test that we can start a new profile later

    Scheduler.unstable_Profiling.startLoggingProfilingEvents();
    scheduleCallback(NormalPriority, function () {
      Scheduler.unstable_advanceTime(1000);
    });
    await waitForAll([]); // Note: The exact task id is not super important. That just how many tasks
    // it happens to take before the array is resized.

    expect(stopProfilingAndPrintFlamegraph()).toEqual("\n!!! Main thread              \u2502\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\nTask " + taskId + " [Normal]          \u2502\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\n");
    global.__MAX_ITERATIONS__ = originalMaxIterations;
  });
});