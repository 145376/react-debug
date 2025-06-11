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
var scheduleCallback;
var ImmediatePriority;
var UserBlockingPriority;
var NormalPriority;
describe('SchedulerNoDOM', function () {
  // Scheduler falls back to a naive implementation using setTimeout.
  // This is only meant to be used for testing purposes, like with jest's fake timer API.
  beforeEach(function () {
    jest.resetModules();
    jest.useFakeTimers();
    delete global.setImmediate;
    delete global.MessageChannel;
    jest.unmock('scheduler');
    Scheduler = require('scheduler');
    scheduleCallback = Scheduler.unstable_scheduleCallback;
    UserBlockingPriority = Scheduler.unstable_UserBlockingPriority;
    NormalPriority = Scheduler.unstable_NormalPriority;
  });
  it('runAllTimers flushes all scheduled callbacks', function () {
    var log = [];
    scheduleCallback(NormalPriority, function () {
      log.push('A');
    });
    scheduleCallback(NormalPriority, function () {
      log.push('B');
    });
    scheduleCallback(NormalPriority, function () {
      log.push('C');
    });
    expect(log).toEqual([]);
    jest.runAllTimers();
    expect(log).toEqual(['A', 'B', 'C']);
  });
  it('executes callbacks in order of priority', function () {
    var log = [];
    scheduleCallback(NormalPriority, function () {
      log.push('A');
    });
    scheduleCallback(NormalPriority, function () {
      log.push('B');
    });
    scheduleCallback(UserBlockingPriority, function () {
      log.push('C');
    });
    scheduleCallback(UserBlockingPriority, function () {
      log.push('D');
    });
    expect(log).toEqual([]);
    jest.runAllTimers();
    expect(log).toEqual(['C', 'D', 'A', 'B']);
  });
  it('handles errors', function () {
    var log = [];
    scheduleCallback(ImmediatePriority, function () {
      log.push('A');
      throw new Error('Oops A');
    });
    scheduleCallback(ImmediatePriority, function () {
      log.push('B');
    });
    scheduleCallback(ImmediatePriority, function () {
      log.push('C');
      throw new Error('Oops C');
    });
    expect(function () {
      return jest.runAllTimers();
    }).toThrow('Oops A');
    expect(log).toEqual(['A']);
    log = []; // B and C flush in a subsequent event. That way, the second error is not
    // swallowed.

    expect(function () {
      return jest.runAllTimers();
    }).toThrow('Oops C');
    expect(log).toEqual(['B', 'C']);
  });
}); // See: https://github.com/facebook/react/pull/13088

describe('does not crash non-node SSR environments', function () {
  it('if setTimeout is undefined', function () {
    jest.resetModules();
    var originalSetTimeout = global.setTimeout;

    try {
      delete global.setTimeout;
      jest.unmock('scheduler');
      expect(function () {
        require('scheduler');
      }).not.toThrow();
    } finally {
      global.setTimeout = originalSetTimeout;
    }
  });
  it('if clearTimeout is undefined', function () {
    jest.resetModules();
    var originalClearTimeout = global.clearTimeout;

    try {
      delete global.clearTimeout;
      jest.unmock('scheduler');
      expect(function () {
        require('scheduler');
      }).not.toThrow();
    } finally {
      global.clearTimeout = originalClearTimeout;
    }
  });
});