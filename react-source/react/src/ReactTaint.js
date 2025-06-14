/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { enableTaint } from 'shared/ReactFeatureFlags';
import getPrototypeOf from 'shared/getPrototypeOf';
import binaryToComparableString from 'shared/binaryToComparableString';
import ReactSharedInternals from './ReactSharedInternalsServer';
var TaintRegistryObjects = ReactSharedInternals.TaintRegistryObjects,
    TaintRegistryValues = ReactSharedInternals.TaintRegistryValues,
    TaintRegistryByteLengths = ReactSharedInternals.TaintRegistryByteLengths,
    TaintRegistryPendingRequests = ReactSharedInternals.TaintRegistryPendingRequests;
// This is the shared constructor of all typed arrays.
var TypedArrayConstructor = getPrototypeOf(Uint32Array.prototype).constructor;
var defaultMessage = 'A tainted value was attempted to be serialized to a Client Component or Action closure. ' + 'This would leak it to the client.';

function cleanup(entryValue) {
  var entry = TaintRegistryValues.get(entryValue);

  if (entry !== undefined) {
    TaintRegistryPendingRequests.forEach(function (requestQueue) {
      requestQueue.push(entryValue);
      entry.count++;
    });

    if (entry.count === 1) {
      TaintRegistryValues.delete(entryValue);
    } else {
      entry.count--;
    }
  }
} // If FinalizationRegistry doesn't exist, we assume that objects life forever.
// E.g. the whole VM is just the lifetime of a request.


var finalizationRegistry = typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(cleanup) : null;
export function taintUniqueValue(message, lifetime, value) {
  if (!enableTaint) {
    throw new Error('Not implemented.');
  } // eslint-disable-next-line react-internal/safe-string-coercion


  message = '' + (message || defaultMessage);

  if (lifetime === null || typeof lifetime !== 'object' && typeof lifetime !== 'function') {
    throw new Error('To taint a value, a lifetime must be defined by passing an object that holds ' + 'the value.');
  }

  var entryValue;

  if (typeof value === 'string' || typeof value === 'bigint') {
    // Use as is.
    entryValue = value;
  } else if (value instanceof TypedArrayConstructor || value instanceof DataView) {
    // For now, we just convert binary data to a string so that we can just use the native
    // hashing in the Map implementation. It doesn't really matter what form the string
    // take as long as it's the same when we look it up.
    // We're not too worried about collisions since this should be a high entropy value.
    TaintRegistryByteLengths.add(value.byteLength);
    entryValue = binaryToComparableString(value);
  } else {
    var kind = value === null ? 'null' : typeof value;

    if (kind === 'object' || kind === 'function') {
      throw new Error('taintUniqueValue cannot taint objects or functions. Try taintObjectReference instead.');
    }

    throw new Error('Cannot taint a ' + kind + ' because the value is too general and not unique enough to block globally.');
  }

  var existingEntry = TaintRegistryValues.get(entryValue);

  if (existingEntry === undefined) {
    TaintRegistryValues.set(entryValue, {
      message: message,
      count: 1
    });
  } else {
    existingEntry.count++;
  }

  if (finalizationRegistry !== null) {
    finalizationRegistry.register(lifetime, entryValue);
  }
}
export function taintObjectReference(message, object) {
  if (!enableTaint) {
    throw new Error('Not implemented.');
  } // eslint-disable-next-line react-internal/safe-string-coercion


  message = '' + (message || defaultMessage);

  if (typeof object === 'string' || typeof object === 'bigint') {
    throw new Error('Only objects or functions can be passed to taintObjectReference. Try taintUniqueValue instead.');
  }

  if (object === null || typeof object !== 'object' && typeof object !== 'function') {
    throw new Error('Only objects or functions can be passed to taintObjectReference.');
  }

  TaintRegistryObjects.set(object, message);
}