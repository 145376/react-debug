/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// This file replaces DefaultPrepareStackTrace in Edge/Node Server builds.
function prepareStackTrace(error, structuredStackTrace) {
  var name = error.name || 'Error';
  var message = error.message || '';
  var stack = name + ': ' + message;

  for (var i = 0; i < structuredStackTrace.length; i++) {
    stack += '\n    at ' + structuredStackTrace[i].toString();
  }

  return stack;
}

export default prepareStackTrace;