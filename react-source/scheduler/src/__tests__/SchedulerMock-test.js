/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */
'use strict';

var Scheduler;
var runWithPriority;
var ImmediatePriority;
var UserBlockingPriority;
var NormalPriority;
var LowPriority;
var IdlePriority;
var scheduleCallback;
var cancelCallback;
var wrapCallback;
var getCurrentPriorityLevel;
var shouldYield;
var waitForAll;
var assertLog;
var waitFor;
var waitForPaint;
describe('Scheduler', function () {
  beforeEach(function () {
    jest.resetModules();
    jest.mock('scheduler', function () {
      return require('scheduler/unstable_mock');
    });
    Scheduler = require('scheduler');
    runWithPriority = Scheduler.unstable_runWithPriority;
    ImmediatePriority = Scheduler.unstable_ImmediatePriority;
    UserBlockingPriority = Scheduler.unstable_UserBlockingPriority;
    NormalPriority = Scheduler.unstable_NormalPriority;
    LowPriority = Scheduler.unstable_LowPriority;
    IdlePriority = Scheduler.unstable_IdlePriority;
    scheduleCallback = Scheduler.unstable_scheduleCallback;
    cancelCallback = Scheduler.unstable_cancelCallback;
    wrapCallback = Scheduler.unstable_wrapCallback;
    getCurrentPriorityLevel = Scheduler.unstable_getCurrentPriorityLevel;
    shouldYield = Scheduler.unstable_shouldYield;

    var InternalTestUtils = require('internal-test-utils');

    waitForAll = InternalTestUtils.waitForAll;
    assertLog = InternalTestUtils.assertLog;
    waitFor = InternalTestUtils.waitFor;
    waitForPaint = InternalTestUtils.waitForPaint;
  });
  it('flushes work incrementally', async function () {
    scheduleCallback(NormalPriority, function () {
      return Scheduler.log('A');
    });
    scheduleCallback(NormalPriority, function () {
      return Scheduler.log('B');
    });
    scheduleCallback(NormalPriority, function () {
      return Scheduler.log('C');
    });
    scheduleCallback(NormalPriority, function () {
      return Scheduler.log('D');
    });
    await waitFor(['A', 'B']);
    await waitFor(['C']);
    await waitForAll(['D']);
  });
  it('cancels work', async function () {
    scheduleCallback(NormalPriority, function () {
      return Scheduler.log('A');
    });
    var callbackHandleB = scheduleCallback(NormalPriority, function () {
      return Scheduler.log('B');
    });
    scheduleCallback(NormalPriority, function () {
      return Scheduler.log('C');
    });
    cancelCallback(callbackHandleB);
    await waitForAll(['A', // B should have been cancelled
    'C']);
  });
  it('executes the highest priority callbacks first', async function () {
    scheduleCallback(NormalPriority, function () {
      return Scheduler.log('A');
    });
    scheduleCallback(NormalPriority, function () {
      return Scheduler.log('B');
    }); // Yield before B is flushed

    await waitFor(['A']);
    scheduleCallback(UserBlockingPriority, function () {
      return Scheduler.log('C');
    });
    scheduleCallback(UserBlockingPriority, function () {
      return Scheduler.log('D');
    }); // C and D should come first, because they are higher priority

    await waitForAll(['C', 'D', 'B']);
  });
  it('expires work', async function () {
    scheduleCallback(NormalPriority, function (didTimeout) {
      Scheduler.unstable_advanceTime(100);
      Scheduler.log("A (did timeout: " + didTimeout + ")");
    });
    scheduleCallback(UserBlockingPriority, function (didTimeout) {
      Scheduler.unstable_advanceTime(100);
      Scheduler.log("B (did timeout: " + didTimeout + ")");
    });
    scheduleCallback(UserBlockingPriority, function (didTimeout) {
      Scheduler.unstable_advanceTime(100);
      Scheduler.log("C (did timeout: " + didTimeout + ")");
    }); // Advance time, but not by enough to expire any work

    Scheduler.unstable_advanceTime(249);
    assertLog([]); // Schedule a few more callbacks

    scheduleCallback(NormalPriority, function (didTimeout) {
      Scheduler.unstable_advanceTime(100);
      Scheduler.log("D (did timeout: " + didTimeout + ")");
    });
    scheduleCallback(NormalPriority, function (didTimeout) {
      Scheduler.unstable_advanceTime(100);
      Scheduler.log("E (did timeout: " + didTimeout + ")");
    }); // Advance by just a bit more to expire the user blocking callbacks

    Scheduler.unstable_advanceTime(1);
    await waitFor(['B (did timeout: true)', 'C (did timeout: true)']); // Expire A

    Scheduler.unstable_advanceTime(4600);
    await waitFor(['A (did timeout: true)']); // Flush the rest without expiring

    await waitForAll(['D (did timeout: false)', 'E (did timeout: true)']);
  });
  it('has a default expiration of ~5 seconds', function () {
    scheduleCallback(NormalPriority, function () {
      return Scheduler.log('A');
    });
    Scheduler.unstable_advanceTime(4999);
    assertLog([]);
    Scheduler.unstable_advanceTime(1);
    Scheduler.unstable_flushExpired();
    assertLog(['A']);
  });
  it('continues working on same task after yielding', async function () {
    scheduleCallback(NormalPriority, function () {
      Scheduler.unstable_advanceTime(100);
      Scheduler.log('A');
    });
    scheduleCallback(NormalPriority, function () {
      Scheduler.unstable_advanceTime(100);
      Scheduler.log('B');
    });
    var didYield = false;
    var tasks = [['C1', 100], ['C2', 100], ['C3', 100]];

    var C = function () {
      while (tasks.length > 0) {
        var _tasks$shift = tasks.shift(),
            label = _tasks$shift[0],
            ms = _tasks$shift[1];

        Scheduler.unstable_advanceTime(ms);
        Scheduler.log(label);

        if (shouldYield()) {
          didYield = true;
          return C;
        }
      }
    };

    scheduleCallback(NormalPriority, C);
    scheduleCallback(NormalPriority, function () {
      Scheduler.unstable_advanceTime(100);
      Scheduler.log('D');
    });
    scheduleCallback(NormalPriority, function () {
      Scheduler.unstable_advanceTime(100);
      Scheduler.log('E');
    }); // Flush, then yield while in the middle of C.

    expect(didYield).toBe(false);
    await waitFor(['A', 'B', 'C1']);
    expect(didYield).toBe(true); // When we resume, we should continue working on C.

    await waitForAll(['C2', 'C3', 'D', 'E']);
  });
  it('continuation callbacks inherit the expiration of the previous callback', async function () {
    var tasks = [['A', 125], ['B', 124], ['C', 100], ['D', 100]];

    var work = function () {
      while (tasks.length > 0) {
        var _tasks$shift2 = tasks.shift(),
            label = _tasks$shift2[0],
            ms = _tasks$shift2[1];

        Scheduler.unstable_advanceTime(ms);
        Scheduler.log(label);

        if (shouldYield()) {
          return work;
        }
      }
    }; // Schedule a high priority callback


    scheduleCallback(UserBlockingPriority, work); // Flush until just before the expiration time

    await waitFor(['A', 'B']); // Advance time by just a bit more. This should expire all the remaining work.

    Scheduler.unstable_advanceTime(1);
    Scheduler.unstable_flushExpired();
    assertLog(['C', 'D']);
  });
  it('continuations are interrupted by higher priority work', async function () {
    var tasks = [['A', 100], ['B', 100], ['C', 100], ['D', 100]];

    var work = function () {
      while (tasks.length > 0) {
        var _tasks$shift3 = tasks.shift(),
            label = _tasks$shift3[0],
            ms = _tasks$shift3[1];

        Scheduler.unstable_advanceTime(ms);
        Scheduler.log(label);

        if (tasks.length > 0 && shouldYield()) {
          return work;
        }
      }
    };

    scheduleCallback(NormalPriority, work);
    await waitFor(['A']);
    scheduleCallback(UserBlockingPriority, function () {
      Scheduler.unstable_advanceTime(100);
      Scheduler.log('High pri');
    });
    await waitForAll(['High pri', 'B', 'C', 'D']);
  });
  it('continuations do not block higher priority work scheduled ' + 'inside an executing callback', async function () {
    var tasks = [['A', 100], ['B', 100], ['C', 100], ['D', 100]];

    var work = function () {
      while (tasks.length > 0) {
        var task = tasks.shift();
        var label = task[0],
            ms = task[1];
        Scheduler.unstable_advanceTime(ms);
        Scheduler.log(label);

        if (label === 'B') {
          // Schedule high pri work from inside another callback
          Scheduler.log('Schedule high pri');
          scheduleCallback(UserBlockingPriority, function () {
            Scheduler.unstable_advanceTime(100);
            Scheduler.log('High pri');
          });
        }

        if (tasks.length > 0) {
          // Return a continuation
          return work;
        }
      }
    };

    scheduleCallback(NormalPriority, work);
    await waitForAll(['A', 'B', 'Schedule high pri', // The high pri callback should fire before the continuation of the
    // lower pri work
    'High pri', // Continue low pri work
    'C', 'D']);
  });
  it('cancelling a continuation', async function () {
    var task = scheduleCallback(NormalPriority, function () {
      Scheduler.log('Yield');
      return function () {
        Scheduler.log('Continuation');
      };
    });
    await waitFor(['Yield']);
    cancelCallback(task);
    await waitForAll([]);
  });
  it('top-level immediate callbacks fire in a subsequent task', function () {
    scheduleCallback(ImmediatePriority, function () {
      return Scheduler.log('A');
    });
    scheduleCallback(ImmediatePriority, function () {
      return Scheduler.log('B');
    });
    scheduleCallback(ImmediatePriority, function () {
      return Scheduler.log('C');
    });
    scheduleCallback(ImmediatePriority, function () {
      return Scheduler.log('D');
    }); // Immediate callback hasn't fired, yet.

    assertLog([]); // They all flush immediately within the subsequent task.

    Scheduler.unstable_flushExpired();
    assertLog(['A', 'B', 'C', 'D']);
  });
  it('nested immediate callbacks are added to the queue of immediate callbacks', function () {
    scheduleCallback(ImmediatePriority, function () {
      return Scheduler.log('A');
    });
    scheduleCallback(ImmediatePriority, function () {
      Scheduler.log('B'); // This callback should go to the end of the queue

      scheduleCallback(ImmediatePriority, function () {
        return Scheduler.log('C');
      });
    });
    scheduleCallback(ImmediatePriority, function () {
      return Scheduler.log('D');
    });
    assertLog([]); // C should flush at the end

    Scheduler.unstable_flushExpired();
    assertLog(['A', 'B', 'D', 'C']);
  });
  it('wrapped callbacks have same signature as original callback', function () {
    var wrappedCallback = wrapCallback(function () {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return {
        args: args
      };
    });
    expect(wrappedCallback('a', 'b')).toEqual({
      args: ['a', 'b']
    });
  });
  it('wrapped callbacks inherit the current priority', function () {
    var wrappedCallback = runWithPriority(NormalPriority, function () {
      return wrapCallback(function () {
        Scheduler.log(getCurrentPriorityLevel());
      });
    });
    var wrappedUserBlockingCallback = runWithPriority(UserBlockingPriority, function () {
      return wrapCallback(function () {
        Scheduler.log(getCurrentPriorityLevel());
      });
    });
    wrappedCallback();
    assertLog([NormalPriority]);
    wrappedUserBlockingCallback();
    assertLog([UserBlockingPriority]);
  });
  it('wrapped callbacks inherit the current priority even when nested', function () {
    var wrappedCallback;
    var wrappedUserBlockingCallback;
    runWithPriority(NormalPriority, function () {
      wrappedCallback = wrapCallback(function () {
        Scheduler.log(getCurrentPriorityLevel());
      });
      wrappedUserBlockingCallback = runWithPriority(UserBlockingPriority, function () {
        return wrapCallback(function () {
          Scheduler.log(getCurrentPriorityLevel());
        });
      });
    });
    wrappedCallback();
    assertLog([NormalPriority]);
    wrappedUserBlockingCallback();
    assertLog([UserBlockingPriority]);
  });
  it("immediate callbacks fire even if there's an error", function () {
    scheduleCallback(ImmediatePriority, function () {
      Scheduler.log('A');
      throw new Error('Oops A');
    });
    scheduleCallback(ImmediatePriority, function () {
      Scheduler.log('B');
    });
    scheduleCallback(ImmediatePriority, function () {
      Scheduler.log('C');
      throw new Error('Oops C');
    });
    expect(function () {
      return Scheduler.unstable_flushExpired();
    }).toThrow('Oops A');
    assertLog(['A']); // B and C flush in a subsequent event. That way, the second error is not
    // swallowed.

    expect(function () {
      return Scheduler.unstable_flushExpired();
    }).toThrow('Oops C');
    assertLog(['B', 'C']);
  });
  it('multiple immediate callbacks can throw and there will be an error for each one', function () {
    scheduleCallback(ImmediatePriority, function () {
      throw new Error('First error');
    });
    scheduleCallback(ImmediatePriority, function () {
      throw new Error('Second error');
    });
    expect(function () {
      return Scheduler.unstable_flushAll();
    }).toThrow('First error'); // The next error is thrown in the subsequent event

    expect(function () {
      return Scheduler.unstable_flushAll();
    }).toThrow('Second error');
  });
  it('exposes the current priority level', function () {
    Scheduler.log(getCurrentPriorityLevel());
    runWithPriority(ImmediatePriority, function () {
      Scheduler.log(getCurrentPriorityLevel());
      runWithPriority(NormalPriority, function () {
        Scheduler.log(getCurrentPriorityLevel());
        runWithPriority(UserBlockingPriority, function () {
          Scheduler.log(getCurrentPriorityLevel());
        });
      });
      Scheduler.log(getCurrentPriorityLevel());
    });
    assertLog([NormalPriority, ImmediatePriority, NormalPriority, UserBlockingPriority, ImmediatePriority]);
  });

  if (__DEV__) {
    // Function names are minified in prod, though you could still infer the
    // priority if you have sourcemaps.
    // TODO: Feature temporarily disabled while we investigate a bug in one of
    // our minifiers.
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('adds extra function to the JS stack whose name includes the priority level', async function () {
      function inferPriorityFromCallstack() {
        try {
          throw Error();
        } catch (e) {
          var stack = e.stack;
          var lines = stack.split('\n');

          for (var i = lines.length - 1; i >= 0; i--) {
            var line = lines[i];
            var found = line.match(/scheduler_flushTaskAtPriority_([A-Za-z]+)/);

            if (found !== null) {
              var priorityStr = found[1];

              switch (priorityStr) {
                case 'Immediate':
                  return ImmediatePriority;

                case 'UserBlocking':
                  return UserBlockingPriority;

                case 'Normal':
                  return NormalPriority;

                case 'Low':
                  return LowPriority;

                case 'Idle':
                  return IdlePriority;
              }
            }
          }

          return null;
        }
      }

      scheduleCallback(ImmediatePriority, function () {
        return Scheduler.log('Immediate: ' + inferPriorityFromCallstack());
      });
      scheduleCallback(UserBlockingPriority, function () {
        return Scheduler.log('UserBlocking: ' + inferPriorityFromCallstack());
      });
      scheduleCallback(NormalPriority, function () {
        return Scheduler.log('Normal: ' + inferPriorityFromCallstack());
      });
      scheduleCallback(LowPriority, function () {
        return Scheduler.log('Low: ' + inferPriorityFromCallstack());
      });
      scheduleCallback(IdlePriority, function () {
        return Scheduler.log('Idle: ' + inferPriorityFromCallstack());
      });
      await waitForAll(['Immediate: ' + ImmediatePriority, 'UserBlocking: ' + UserBlockingPriority, 'Normal: ' + NormalPriority, 'Low: ' + LowPriority, 'Idle: ' + IdlePriority]);
    });
  }

  describe('delayed tasks', function () {
    it('schedules a delayed task', async function () {
      scheduleCallback(NormalPriority, function () {
        return Scheduler.log('A');
      }, {
        delay: 1000
      }); // Should flush nothing, because delay hasn't elapsed

      await waitForAll([]); // Advance time until right before the threshold

      Scheduler.unstable_advanceTime(999); // Still nothing

      await waitForAll([]); // Advance time past the threshold

      Scheduler.unstable_advanceTime(1); // Now it should flush like normal

      await waitForAll(['A']);
    });
    it('schedules multiple delayed tasks', async function () {
      scheduleCallback(NormalPriority, function () {
        return Scheduler.log('C');
      }, {
        delay: 300
      });
      scheduleCallback(NormalPriority, function () {
        return Scheduler.log('B');
      }, {
        delay: 200
      });
      scheduleCallback(NormalPriority, function () {
        return Scheduler.log('D');
      }, {
        delay: 400
      });
      scheduleCallback(NormalPriority, function () {
        return Scheduler.log('A');
      }, {
        delay: 100
      }); // Should flush nothing, because delay hasn't elapsed

      await waitForAll([]); // Advance some time.

      Scheduler.unstable_advanceTime(200); // Both A and B are no longer delayed. They can now flush incrementally.

      await waitFor(['A']);
      await waitForAll(['B']); // Advance the rest

      Scheduler.unstable_advanceTime(200);
      await waitForAll(['C', 'D']);
    });
    it('interleaves normal tasks and delayed tasks', async function () {
      // Schedule some high priority callbacks with a delay. When their delay
      // elapses, they will be the most important callback in the queue.
      scheduleCallback(UserBlockingPriority, function () {
        return Scheduler.log('Timer 2');
      }, {
        delay: 300
      });
      scheduleCallback(UserBlockingPriority, function () {
        return Scheduler.log('Timer 1');
      }, {
        delay: 100
      }); // Schedule some tasks at default priority.

      scheduleCallback(NormalPriority, function () {
        Scheduler.log('A');
        Scheduler.unstable_advanceTime(100);
      });
      scheduleCallback(NormalPriority, function () {
        Scheduler.log('B');
        Scheduler.unstable_advanceTime(100);
      });
      scheduleCallback(NormalPriority, function () {
        Scheduler.log('C');
        Scheduler.unstable_advanceTime(100);
      });
      scheduleCallback(NormalPriority, function () {
        Scheduler.log('D');
        Scheduler.unstable_advanceTime(100);
      }); // Flush all the work. The timers should be interleaved with the
      // other tasks.

      await waitForAll(['A', 'Timer 1', 'B', 'C', 'Timer 2', 'D']);
    });
    it('interleaves delayed tasks with time-sliced tasks', async function () {
      // Schedule some high priority callbacks with a delay. When their delay
      // elapses, they will be the most important callback in the queue.
      scheduleCallback(UserBlockingPriority, function () {
        return Scheduler.log('Timer 2');
      }, {
        delay: 300
      });
      scheduleCallback(UserBlockingPriority, function () {
        return Scheduler.log('Timer 1');
      }, {
        delay: 100
      }); // Schedule a time-sliced task at default priority.

      var tasks = [['A', 100], ['B', 100], ['C', 100], ['D', 100]];

      var work = function () {
        while (tasks.length > 0) {
          var task = tasks.shift();
          var label = task[0],
              ms = task[1];
          Scheduler.unstable_advanceTime(ms);
          Scheduler.log(label);

          if (tasks.length > 0) {
            return work;
          }
        }
      };

      scheduleCallback(NormalPriority, work); // Flush all the work. The timers should be interleaved with the
      // other tasks.

      await waitForAll(['A', 'Timer 1', 'B', 'C', 'Timer 2', 'D']);
    });
    it('cancels a delayed task', async function () {
      // Schedule several tasks with the same delay
      var options = {
        delay: 100
      };
      scheduleCallback(NormalPriority, function () {
        return Scheduler.log('A');
      }, options);
      var taskB = scheduleCallback(NormalPriority, function () {
        return Scheduler.log('B');
      }, options);
      var taskC = scheduleCallback(NormalPriority, function () {
        return Scheduler.log('C');
      }, options); // Cancel B before its delay has elapsed

      await waitForAll([]);
      cancelCallback(taskB); // Cancel C after its delay has elapsed

      Scheduler.unstable_advanceTime(500);
      cancelCallback(taskC); // Only A should flush

      await waitForAll(['A']);
    });
    it('gracefully handles scheduled tasks that are not a function', async function () {
      scheduleCallback(ImmediatePriority, null);
      await waitForAll([]);
      scheduleCallback(ImmediatePriority, undefined);
      await waitForAll([]);
      scheduleCallback(ImmediatePriority, {});
      await waitForAll([]);
      scheduleCallback(ImmediatePriority, 42);
      await waitForAll([]);
    });
    it('toFlushUntilNextPaint stops if a continuation is returned', async function () {
      scheduleCallback(NormalPriority, function () {
        Scheduler.log('Original Task');
        Scheduler.log('shouldYield: ' + shouldYield());
        Scheduler.log('Return a continuation');
        return function () {
          Scheduler.log('Continuation Task');
        };
      });
      await waitForPaint(['Original Task', // Immediately before returning a continuation, `shouldYield` returns
      // false, which means there must be time remaining in the frame.
      'shouldYield: false', 'Return a continuation' // The continuation should not flush yet.
      ]); // No time has elapsed

      expect(Scheduler.unstable_now()).toBe(0); // Continue the task

      await waitForAll(['Continuation Task']);
    });
    it("toFlushAndYield keeps flushing even if there's a continuation", async function () {
      scheduleCallback(NormalPriority, function () {
        Scheduler.log('Original Task');
        Scheduler.log('shouldYield: ' + shouldYield());
        Scheduler.log('Return a continuation');
        return function () {
          Scheduler.log('Continuation Task');
        };
      });
      await waitForAll(['Original Task', // Immediately before returning a continuation, `shouldYield` returns
      // false, which means there must be time remaining in the frame.
      'shouldYield: false', 'Return a continuation', // The continuation should flush immediately, even though the task
      // yielded a continuation.
      'Continuation Task']);
    });
  });
});