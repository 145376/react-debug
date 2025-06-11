function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { enablePostpone, enableProfilerTimer, enableComponentPerformanceTrack } from 'shared/ReactFeatureFlags';
import { resolveClientReference, resolveServerReference, preloadModule, requireModule, dispatchHint, readPartialStringChunk, readFinalStringChunk, createStringDecoder, prepareDestinationForModule, bindToConsole, rendererVersion, rendererPackageName } from './ReactFlightClientConfig';
import { createBoundServerReference, registerBoundServerReference } from './ReactFlightReplyClient';
import { readTemporaryReference } from './ReactFlightTemporaryReferences';
import { markAllTracksInOrder, logComponentRender, logDedupedComponentRender, logComponentErrored } from './ReactFlightPerformanceTrack';
import { REACT_LAZY_TYPE, REACT_ELEMENT_TYPE, REACT_POSTPONE_TYPE, ASYNC_ITERATOR, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols';
import getComponentNameFromType from 'shared/getComponentNameFromType';
import { getOwnerStackByComponentInfoInDev } from 'shared/ReactComponentInfoStack';
import { injectInternals } from './ReactFlightClientDevToolsHook';
import ReactVersion from 'shared/ReactVersion';
import isArray from 'shared/isArray';
import * as React from 'react';
// TODO: This is an unfortunate hack. We shouldn't feature detect the internals
// like this. It's just that for now we support the same build of the Flight
// client both in the RSC environment, in the SSR environments as well as the
// browser client. We should probably have a separate RSC build. This is DEV
// only though.
var ReactSharedInteralsServer = React.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
var ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE || ReactSharedInteralsServer;
var ROW_ID = 0;
var ROW_TAG = 1;
var ROW_LENGTH = 2;
var ROW_CHUNK_BY_NEWLINE = 3;
var ROW_CHUNK_BY_LENGTH = 4;
var PENDING = 'pending';
var BLOCKED = 'blocked';
var RESOLVED_MODEL = 'resolved_model';
var RESOLVED_MODULE = 'resolved_module';
var INITIALIZED = 'fulfilled';
var ERRORED = 'rejected';

// $FlowFixMe[missing-this-annot]
function ReactPromise(status, value, reason, response) {
  this.status = status;
  this.value = value;
  this.reason = reason;
  this._response = response;

  if (enableProfilerTimer && enableComponentPerformanceTrack) {
    this._children = [];
  }

  if (__DEV__) {
    this._debugInfo = null;
  }
} // We subclass Promise.prototype so that we get other methods like .catch


ReactPromise.prototype = Object.create(Promise.prototype); // TODO: This doesn't return a new Promise chain unlike the real .then

ReactPromise.prototype.then = function (this, resolve, reject) {
  var chunk = this; // If we have resolved content, we try to initialize it first which
  // might put us back into one of the other states.

  switch (chunk.status) {
    case RESOLVED_MODEL:
      initializeModelChunk(chunk);
      break;

    case RESOLVED_MODULE:
      initializeModuleChunk(chunk);
      break;
  } // The status might have changed after initialization.


  switch (chunk.status) {
    case INITIALIZED:
      resolve(chunk.value);
      break;

    case PENDING:
    case BLOCKED:
      if (resolve) {
        if (chunk.value === null) {
          chunk.value = [];
        }

        chunk.value.push(resolve);
      }

      if (reject) {
        if (chunk.reason === null) {
          chunk.reason = [];
        }

        chunk.reason.push(reject);
      }

      break;

    default:
      if (reject) {
        reject(chunk.reason);
      }

      break;
  }
};

function readChunk(chunk) {
  // If we have resolved content, we try to initialize it first which
  // might put us back into one of the other states.
  switch (chunk.status) {
    case RESOLVED_MODEL:
      initializeModelChunk(chunk);
      break;

    case RESOLVED_MODULE:
      initializeModuleChunk(chunk);
      break;
  } // The status might have changed after initialization.


  switch (chunk.status) {
    case INITIALIZED:
      return chunk.value;

    case PENDING:
    case BLOCKED:
      // eslint-disable-next-line no-throw-literal
      throw chunk;

    default:
      throw chunk.reason;
  }
}

export function getRoot(response) {
  var chunk = getChunk(response, 0);
  return chunk;
}

function createPendingChunk(response) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(PENDING, null, null, response);
}

function createBlockedChunk(response) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(BLOCKED, null, null, response);
}

function createErrorChunk(response, error) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(ERRORED, null, error, response);
}

function wakeChunk(listeners, value) {
  for (var i = 0; i < listeners.length; i++) {
    var listener = listeners[i];
    listener(value);
  }
}

function wakeChunkIfInitialized(chunk, resolveListeners, rejectListeners) {
  switch (chunk.status) {
    case INITIALIZED:
      wakeChunk(resolveListeners, chunk.value);
      break;

    case PENDING:
    case BLOCKED:
      if (chunk.value) {
        for (var i = 0; i < resolveListeners.length; i++) {
          chunk.value.push(resolveListeners[i]);
        }
      } else {
        chunk.value = resolveListeners;
      }

      if (chunk.reason) {
        if (rejectListeners) {
          for (var _i = 0; _i < rejectListeners.length; _i++) {
            chunk.reason.push(rejectListeners[_i]);
          }
        }
      } else {
        chunk.reason = rejectListeners;
      }

      break;

    case ERRORED:
      if (rejectListeners) {
        wakeChunk(rejectListeners, chunk.reason);
      }

      break;
  }
}

function triggerErrorOnChunk(chunk, error) {
  if (chunk.status !== PENDING && chunk.status !== BLOCKED) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    var streamChunk = chunk;
    var controller = streamChunk.reason; // $FlowFixMe[incompatible-call]: The error method should accept mixed.

    controller.error(error);
    return;
  }

  var listeners = chunk.reason;
  var erroredChunk = chunk;
  erroredChunk.status = ERRORED;
  erroredChunk.reason = error;

  if (listeners !== null) {
    wakeChunk(listeners, error);
  }
}

function createResolvedModelChunk(response, value) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(RESOLVED_MODEL, value, null, response);
}

function createResolvedModuleChunk(response, value) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(RESOLVED_MODULE, value, null, response);
}

function createInitializedTextChunk(response, value) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(INITIALIZED, value, null, response);
}

function createInitializedBufferChunk(response, value) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(INITIALIZED, value, null, response);
}

function createInitializedIteratorResultChunk(response, value, done) {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(INITIALIZED, {
    done: done,
    value: value
  }, null, response);
}

function createInitializedStreamChunk(response, value, controller) {
  // We use the reason field to stash the controller since we already have that
  // field. It's a bit of a hack but efficient.
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(INITIALIZED, value, controller, response);
}

function createResolvedIteratorResultChunk(response, value, done) {
  // To reuse code as much code as possible we add the wrapper element as part of the JSON.
  var iteratorResultJSON = (done ? '{"done":true,"value":' : '{"done":false,"value":') + value + '}'; // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors

  return new ReactPromise(RESOLVED_MODEL, iteratorResultJSON, null, response);
}

function resolveIteratorResultChunk(chunk, value, done) {
  // To reuse code as much code as possible we add the wrapper element as part of the JSON.
  var iteratorResultJSON = (done ? '{"done":true,"value":' : '{"done":false,"value":') + value + '}';
  resolveModelChunk(chunk, iteratorResultJSON);
}

function resolveModelChunk(chunk, value) {
  if (chunk.status !== PENDING) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    var streamChunk = chunk;
    var controller = streamChunk.reason;
    controller.enqueueModel(value);
    return;
  }

  var resolveListeners = chunk.value;
  var rejectListeners = chunk.reason;
  var resolvedChunk = chunk;
  resolvedChunk.status = RESOLVED_MODEL;
  resolvedChunk.value = value;

  if (resolveListeners !== null) {
    // This is unfortunate that we're reading this eagerly if
    // we already have listeners attached since they might no
    // longer be rendered or might not be the highest pri.
    initializeModelChunk(resolvedChunk); // The status might have changed after initialization.

    wakeChunkIfInitialized(chunk, resolveListeners, rejectListeners);
  }
}

function resolveModuleChunk(chunk, value) {
  if (chunk.status !== PENDING && chunk.status !== BLOCKED) {
    // We already resolved. We didn't expect to see this.
    return;
  }

  var resolveListeners = chunk.value;
  var rejectListeners = chunk.reason;
  var resolvedChunk = chunk;
  resolvedChunk.status = RESOLVED_MODULE;
  resolvedChunk.value = value;

  if (resolveListeners !== null) {
    initializeModuleChunk(resolvedChunk);
    wakeChunkIfInitialized(chunk, resolveListeners, rejectListeners);
  }
}

var initializingHandler = null;
var initializingChunk = null;

function initializeModelChunk(chunk) {
  var prevHandler = initializingHandler;
  var prevChunk = initializingChunk;
  initializingHandler = null;
  var resolvedModel = chunk.value; // We go to the BLOCKED state until we've fully resolved this.
  // We do this before parsing in case we try to initialize the same chunk
  // while parsing the model. Such as in a cyclic reference.

  var cyclicChunk = chunk;
  cyclicChunk.status = BLOCKED;
  cyclicChunk.value = null;
  cyclicChunk.reason = null;

  if (enableProfilerTimer && enableComponentPerformanceTrack) {
    initializingChunk = cyclicChunk;
  }

  try {
    var _value = parseModel(chunk._response, resolvedModel); // Invoke any listeners added while resolving this model. I.e. cyclic
    // references. This may or may not fully resolve the model depending on
    // if they were blocked.


    var resolveListeners = cyclicChunk.value;

    if (resolveListeners !== null) {
      cyclicChunk.value = null;
      cyclicChunk.reason = null;
      wakeChunk(resolveListeners, _value);
    }

    if (initializingHandler !== null) {
      if (initializingHandler.errored) {
        throw initializingHandler.value;
      }

      if (initializingHandler.deps > 0) {
        // We discovered new dependencies on modules that are not yet resolved.
        // We have to keep the BLOCKED state until they're resolved.
        initializingHandler.value = _value;
        initializingHandler.chunk = cyclicChunk;
        return;
      }
    }

    var initializedChunk = chunk;
    initializedChunk.status = INITIALIZED;
    initializedChunk.value = _value;
  } catch (error) {
    var erroredChunk = chunk;
    erroredChunk.status = ERRORED;
    erroredChunk.reason = error;
  } finally {
    initializingHandler = prevHandler;

    if (enableProfilerTimer && enableComponentPerformanceTrack) {
      initializingChunk = prevChunk;
    }
  }
}

function initializeModuleChunk(chunk) {
  try {
    var _value2 = requireModule(chunk.value);

    var initializedChunk = chunk;
    initializedChunk.status = INITIALIZED;
    initializedChunk.value = _value2;
  } catch (error) {
    var erroredChunk = chunk;
    erroredChunk.status = ERRORED;
    erroredChunk.reason = error;
  }
} // Report that any missing chunks in the model is now going to throw this
// error upon read. Also notify any pending promises.


export function reportGlobalError(response, error) {
  response._closed = true;
  response._closedReason = error;

  response._chunks.forEach(function (chunk) {
    // If this chunk was already resolved or errored, it won't
    // trigger an error but if it wasn't then we need to
    // because we won't be getting any new data to resolve it.
    if (chunk.status === PENDING) {
      triggerErrorOnChunk(chunk, error);
    }
  });

  if (enableProfilerTimer && enableComponentPerformanceTrack) {
    markAllTracksInOrder();
    flushComponentPerformance(response, getChunk(response, 0), 0, -Infinity, -Infinity);
  }
}

function nullRefGetter() {
  if (__DEV__) {
    return null;
  }
}

function getServerComponentTaskName(componentInfo) {
  return '<' + (componentInfo.name || '...') + '>';
}

function getTaskName(type) {
  if (type === REACT_FRAGMENT_TYPE) {
    return '<>';
  }

  if (typeof type === 'function') {
    // This is a function so it must have been a Client Reference that resolved to
    // a function. We use "use client" to indicate that this is the boundary into
    // the client. There should only be one for any given owner chain.
    return '"use client"';
  }

  if (typeof type === 'object' && type !== null && type.$$typeof === REACT_LAZY_TYPE) {
    if (type._init === readChunk) {
      // This is a lazy node created by Flight. It is probably a client reference.
      // We use the "use client" string to indicate that this is the boundary into
      // the client. There will only be one for any given owner chain.
      return '"use client"';
    } // We don't want to eagerly initialize the initializer in DEV mode so we can't
    // call it to extract the type so we don't know the type of this component.


    return '<...>';
  }

  try {
    var name = getComponentNameFromType(type);
    return name ? '<' + name + '>' : '<...>';
  } catch (x) {
    return '<...>';
  }
}

function createElement(response, type, key, props, owner, // DEV-only
stack, // DEV-only
validated // DEV-only
) {
  var element;

  if (__DEV__) {
    // `ref` is non-enumerable in dev
    element = {
      $$typeof: REACT_ELEMENT_TYPE,
      type: type,
      key: key,
      props: props,
      _owner: __DEV__ && owner === null ? response._debugRootOwner : owner
    };
    Object.defineProperty(element, 'ref', {
      enumerable: false,
      get: nullRefGetter
    });
  } else {
    element = {
      // This tag allows us to uniquely identify this as a React Element
      $$typeof: REACT_ELEMENT_TYPE,
      type: type,
      key: key,
      ref: null,
      props: props
    };
  }

  if (__DEV__) {
    // We don't really need to add any of these but keeping them for good measure.
    // Unfortunately, _store is enumerable in jest matchers so for equality to
    // work, I need to keep it or make _store non-enumerable in the other file.
    element._store = {};
    Object.defineProperty(element._store, 'validated', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: validated // Whether the element has already been validated on the server.

    }); // debugInfo contains Server Component debug information.

    Object.defineProperty(element, '_debugInfo', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: null
    });
    var _env = response._rootEnvironmentName;

    if (owner !== null && owner.env != null) {
      // Interestingly we don't actually have the environment name of where
      // this JSX was created if it doesn't have an owner but if it does
      // it must be the same environment as the owner. We could send it separately
      // but it seems a bit unnecessary for this edge case.
      _env = owner.env;
    }

    var normalizedStackTrace = null;

    if (owner === null && response._debugRootStack != null) {
      // We override the stack if we override the owner since the stack where the root JSX
      // was created on the server isn't very useful but where the request was made is.
      normalizedStackTrace = response._debugRootStack;
    } else if (stack !== null) {
      // We create a fake stack and then create an Error object inside of it.
      // This means that the stack trace is now normalized into the native format
      // of the browser and the stack frames will have been registered with
      // source mapping information.
      // This can unfortunately happen within a user space callstack which will
      // remain on the stack.
      normalizedStackTrace = createFakeJSXCallStackInDEV(response, stack, _env);
    }

    Object.defineProperty(element, '_debugStack', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: normalizedStackTrace
    });
    var task = null;

    if (supportsCreateTask && stack !== null) {
      var createTaskFn = console.createTask.bind(console, getTaskName(type));
      var callStack = buildFakeCallStack(response, stack, _env, createTaskFn); // This owner should ideally have already been initialized to avoid getting
      // user stack frames on the stack.

      var ownerTask = owner === null ? null : initializeFakeTask(response, owner, _env);

      if (ownerTask === null) {
        var rootTask = response._debugRootTask;

        if (rootTask != null) {
          task = rootTask.run(callStack);
        } else {
          task = callStack();
        }
      } else {
        task = ownerTask.run(callStack);
      }
    }

    Object.defineProperty(element, '_debugTask', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: task
    }); // This owner should ideally have already been initialized to avoid getting
    // user stack frames on the stack.

    if (owner !== null) {
      initializeFakeStack(response, owner);
    }
  }

  if (initializingHandler !== null) {
    var handler = initializingHandler; // We pop the stack to the previous outer handler before leaving the Element.
    // This is effectively the complete phase.

    initializingHandler = handler.parent;

    if (handler.errored) {
      // Something errored inside this Element's props. We can turn this Element
      // into a Lazy so that we can still render up until that Lazy is rendered.
      var erroredChunk = createErrorChunk(response, handler.value);

      if (__DEV__) {
        // Conceptually the error happened inside this Element but right before
        // it was rendered. We don't have a client side component to render but
        // we can add some DebugInfo to explain that this was conceptually a
        // Server side error that errored inside this element. That way any stack
        // traces will point to the nearest JSX that errored - e.g. during
        // serialization.
        var erroredComponent = {
          name: getComponentNameFromType(element.type) || '',
          owner: element._owner
        }; // $FlowFixMe[cannot-write]

        erroredComponent.debugStack = element._debugStack;

        if (supportsCreateTask) {
          // $FlowFixMe[cannot-write]
          erroredComponent.debugTask = element._debugTask;
        }

        erroredChunk._debugInfo = [erroredComponent];
      }

      return createLazyChunkWrapper(erroredChunk);
    }

    if (handler.deps > 0) {
      // We have blocked references inside this Element but we can turn this into
      // a Lazy node referencing this Element to let everything around it proceed.
      var blockedChunk = createBlockedChunk(response);
      handler.value = element;
      handler.chunk = blockedChunk;

      if (__DEV__) {
        var freeze = Object.freeze.bind(Object, element.props);
        blockedChunk.then(freeze, freeze);
      }

      return createLazyChunkWrapper(blockedChunk);
    }
  } else if (__DEV__) {
    // TODO: We should be freezing the element but currently, we might write into
    // _debugInfo later. We could move it into _store which remains mutable.
    Object.freeze(element.props);
  }

  return element;
}

function createLazyChunkWrapper(chunk) {
  var lazyType = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: chunk,
    _init: readChunk
  };

  if (__DEV__) {
    // Ensure we have a live array to track future debug info.
    var chunkDebugInfo = chunk._debugInfo || (chunk._debugInfo = []);
    lazyType._debugInfo = chunkDebugInfo;
  }

  return lazyType;
}

function getChunk(response, id) {
  var chunks = response._chunks;
  var chunk = chunks.get(id);

  if (!chunk) {
    if (response._closed) {
      // We have already errored the response and we're not going to get
      // anything more streaming in so this will immediately error.
      chunk = createErrorChunk(response, response._closedReason);
    } else {
      chunk = createPendingChunk(response);
    }

    chunks.set(id, chunk);
  }

  return chunk;
}

function waitForReference(referencedChunk, parentObject, key, response, map, path) {
  var handler;

  if (initializingHandler) {
    handler = initializingHandler;
    handler.deps++;
  } else {
    handler = initializingHandler = {
      parent: null,
      chunk: null,
      value: null,
      deps: 1,
      errored: false
    };
  }

  function fulfill(value) {
    for (var i = 1; i < path.length; i++) {
      while (value.$$typeof === REACT_LAZY_TYPE) {
        // We never expect to see a Lazy node on this path because we encode those as
        // separate models. This must mean that we have inserted an extra lazy node
        // e.g. to replace a blocked element. We must instead look for it inside.
        var chunk = value._payload;

        if (chunk === handler.chunk) {
          // This is a reference to the thing we're currently blocking. We can peak
          // inside of it to get the value.
          value = handler.value;
          continue;
        } else if (chunk.status === INITIALIZED) {
          value = chunk.value;
          continue;
        } else {
          // If we're not yet initialized we need to skip what we've already drilled
          // through and then wait for the next value to become available.
          path.splice(0, i - 1);
          chunk.then(fulfill, reject);
          return;
        }
      }

      value = value[path[i]];
    }

    var mappedValue = map(response, value, parentObject, key);
    parentObject[key] = mappedValue; // If this is the root object for a model reference, where `handler.value`
    // is a stale `null`, the resolved value can be used directly.

    if (key === '' && handler.value === null) {
      handler.value = mappedValue;
    } // If the parent object is an unparsed React element tuple, we also need to
    // update the props and owner of the parsed element object (i.e.
    // handler.value).


    if (parentObject[0] === REACT_ELEMENT_TYPE && typeof handler.value === 'object' && handler.value !== null && handler.value.$$typeof === REACT_ELEMENT_TYPE) {
      var element = handler.value;

      switch (key) {
        case '3':
          element.props = mappedValue;
          break;

        case '4':
          if (__DEV__) {
            element._owner = mappedValue;
          }

          break;
      }
    }

    handler.deps--;

    if (handler.deps === 0) {
      var _chunk = handler.chunk;

      if (_chunk === null || _chunk.status !== BLOCKED) {
        return;
      }

      var resolveListeners = _chunk.value;
      var initializedChunk = _chunk;
      initializedChunk.status = INITIALIZED;
      initializedChunk.value = handler.value;

      if (resolveListeners !== null) {
        wakeChunk(resolveListeners, handler.value);
      }
    }
  }

  function reject(error) {
    if (handler.errored) {
      // We've already errored. We could instead build up an AggregateError
      // but if there are multiple errors we just take the first one like
      // Promise.all.
      return;
    }

    var blockedValue = handler.value;
    handler.errored = true;
    handler.value = error;
    var chunk = handler.chunk;

    if (chunk === null || chunk.status !== BLOCKED) {
      return;
    }

    if (__DEV__) {
      if (typeof blockedValue === 'object' && blockedValue !== null && blockedValue.$$typeof === REACT_ELEMENT_TYPE) {
        var element = blockedValue; // Conceptually the error happened inside this Element but right before
        // it was rendered. We don't have a client side component to render but
        // we can add some DebugInfo to explain that this was conceptually a
        // Server side error that errored inside this element. That way any stack
        // traces will point to the nearest JSX that errored - e.g. during
        // serialization.

        var erroredComponent = {
          name: getComponentNameFromType(element.type) || '',
          owner: element._owner
        }; // $FlowFixMe[cannot-write]

        erroredComponent.debugStack = element._debugStack;

        if (supportsCreateTask) {
          // $FlowFixMe[cannot-write]
          erroredComponent.debugTask = element._debugTask;
        }

        var chunkDebugInfo = chunk._debugInfo || (chunk._debugInfo = []);
        chunkDebugInfo.push(erroredComponent);
      }
    }

    triggerErrorOnChunk(chunk, error);
  }

  referencedChunk.then(fulfill, reject); // Return a place holder value for now.

  return null;
}

function loadServerReference(response, metaData, parentObject, key) {
  if (!response._serverReferenceConfig) {
    // In the normal case, we can't load this Server Reference in the current environment and
    // we just return a proxy to it.
    return createBoundServerReference(metaData, response._callServer, response._encodeFormAction, __DEV__ ? response._debugFindSourceMapURL : undefined);
  } // If we have a module mapping we can load the real version of this Server Reference.


  var serverReference = resolveServerReference(response._serverReferenceConfig, metaData.id);
  var promise = preloadModule(serverReference);

  if (!promise) {
    if (!metaData.bound) {
      var resolvedValue = requireModule(serverReference);
      registerBoundServerReference(resolvedValue, metaData.id, metaData.bound, response._encodeFormAction);
      return resolvedValue;
    } else {
      promise = Promise.resolve(metaData.bound);
    }
  } else if (metaData.bound) {
    promise = Promise.all([promise, metaData.bound]);
  }

  var handler;

  if (initializingHandler) {
    handler = initializingHandler;
    handler.deps++;
  } else {
    handler = initializingHandler = {
      parent: null,
      chunk: null,
      value: null,
      deps: 1,
      errored: false
    };
  }

  function fulfill() {
    var resolvedValue = requireModule(serverReference);

    if (metaData.bound) {
      // This promise is coming from us and should have initilialized by now.
      var boundArgs = metaData.bound.value.slice(0);
      boundArgs.unshift(null); // this

      resolvedValue = resolvedValue.bind.apply(resolvedValue, boundArgs);
    }

    registerBoundServerReference(resolvedValue, metaData.id, metaData.bound, response._encodeFormAction);
    parentObject[key] = resolvedValue; // If this is the root object for a model reference, where `handler.value`
    // is a stale `null`, the resolved value can be used directly.

    if (key === '' && handler.value === null) {
      handler.value = resolvedValue;
    } // If the parent object is an unparsed React element tuple, we also need to
    // update the props and owner of the parsed element object (i.e.
    // handler.value).


    if (parentObject[0] === REACT_ELEMENT_TYPE && typeof handler.value === 'object' && handler.value !== null && handler.value.$$typeof === REACT_ELEMENT_TYPE) {
      var element = handler.value;

      switch (key) {
        case '3':
          element.props = resolvedValue;
          break;

        case '4':
          if (__DEV__) {
            element._owner = resolvedValue;
          }

          break;
      }
    }

    handler.deps--;

    if (handler.deps === 0) {
      var chunk = handler.chunk;

      if (chunk === null || chunk.status !== BLOCKED) {
        return;
      }

      var resolveListeners = chunk.value;
      var initializedChunk = chunk;
      initializedChunk.status = INITIALIZED;
      initializedChunk.value = handler.value;

      if (resolveListeners !== null) {
        wakeChunk(resolveListeners, handler.value);
      }
    }
  }

  function reject(error) {
    if (handler.errored) {
      // We've already errored. We could instead build up an AggregateError
      // but if there are multiple errors we just take the first one like
      // Promise.all.
      return;
    }

    var blockedValue = handler.value;
    handler.errored = true;
    handler.value = error;
    var chunk = handler.chunk;

    if (chunk === null || chunk.status !== BLOCKED) {
      return;
    }

    if (__DEV__) {
      if (typeof blockedValue === 'object' && blockedValue !== null && blockedValue.$$typeof === REACT_ELEMENT_TYPE) {
        var element = blockedValue; // Conceptually the error happened inside this Element but right before
        // it was rendered. We don't have a client side component to render but
        // we can add some DebugInfo to explain that this was conceptually a
        // Server side error that errored inside this element. That way any stack
        // traces will point to the nearest JSX that errored - e.g. during
        // serialization.

        var erroredComponent = {
          name: getComponentNameFromType(element.type) || '',
          owner: element._owner
        }; // $FlowFixMe[cannot-write]

        erroredComponent.debugStack = element._debugStack;

        if (supportsCreateTask) {
          // $FlowFixMe[cannot-write]
          erroredComponent.debugTask = element._debugTask;
        }

        var chunkDebugInfo = chunk._debugInfo || (chunk._debugInfo = []);
        chunkDebugInfo.push(erroredComponent);
      }
    }

    triggerErrorOnChunk(chunk, error);
  }

  promise.then(fulfill, reject); // Return a place holder value for now.

  return null;
}

function getOutlinedModel(response, reference, parentObject, key, map) {
  var path = reference.split(':');
  var id = parseInt(path[0], 16);
  var chunk = getChunk(response, id);

  if (enableProfilerTimer && enableComponentPerformanceTrack) {
    if (initializingChunk !== null && isArray(initializingChunk._children)) {
      initializingChunk._children.push(chunk);
    }
  }

  switch (chunk.status) {
    case RESOLVED_MODEL:
      initializeModelChunk(chunk);
      break;

    case RESOLVED_MODULE:
      initializeModuleChunk(chunk);
      break;
  } // The status might have changed after initialization.


  switch (chunk.status) {
    case INITIALIZED:
      var _value3 = chunk.value;

      for (var i = 1; i < path.length; i++) {
        while (_value3.$$typeof === REACT_LAZY_TYPE) {
          var referencedChunk = _value3._payload;

          if (referencedChunk.status === INITIALIZED) {
            _value3 = referencedChunk.value;
          } else {
            return waitForReference(referencedChunk, parentObject, key, response, map, path.slice(i - 1));
          }
        }

        _value3 = _value3[path[i]];
      }

      var chunkValue = map(response, _value3, parentObject, key);

      if (__DEV__ && chunk._debugInfo) {
        // If we have a direct reference to an object that was rendered by a synchronous
        // server component, it might have some debug info about how it was rendered.
        // We forward this to the underlying object. This might be a React Element or
        // an Array fragment.
        // If this was a string / number return value we lose the debug info. We choose
        // that tradeoff to allow sync server components to return plain values and not
        // use them as React Nodes necessarily. We could otherwise wrap them in a Lazy.
        if (typeof chunkValue === 'object' && chunkValue !== null && (isArray(chunkValue) || typeof chunkValue[ASYNC_ITERATOR] === 'function' || chunkValue.$$typeof === REACT_ELEMENT_TYPE) && !chunkValue._debugInfo) {
          // We should maybe use a unique symbol for arrays but this is a React owned array.
          // $FlowFixMe[prop-missing]: This should be added to elements.
          Object.defineProperty(chunkValue, '_debugInfo', {
            configurable: false,
            enumerable: false,
            writable: true,
            value: chunk._debugInfo
          });
        }
      }

      return chunkValue;

    case PENDING:
    case BLOCKED:
      return waitForReference(chunk, parentObject, key, response, map, path);

    default:
      // This is an error. Instead of erroring directly, we're going to encode this on
      // an initialization handler so that we can catch it at the nearest Element.
      if (initializingHandler) {
        initializingHandler.errored = true;
        initializingHandler.value = chunk.reason;
      } else {
        initializingHandler = {
          parent: null,
          chunk: null,
          value: chunk.reason,
          deps: 0,
          errored: true
        };
      } // Placeholder


      return null;
  }
}

function createMap(response, model) {
  return new Map(model);
}

function createSet(response, model) {
  return new Set(model);
}

function createBlob(response, model) {
  return new Blob(model.slice(1), {
    type: model[0]
  });
}

function createFormData(response, model) {
  var formData = new FormData();

  for (var i = 0; i < model.length; i++) {
    formData.append(model[i][0], model[i][1]);
  }

  return formData;
}

function extractIterator(response, model) {
  // $FlowFixMe[incompatible-use]: This uses raw Symbols because we're extracting from a native array.
  return model[Symbol.iterator]();
}

function createModel(response, model) {
  return model;
}

function parseModelString(response, parentObject, key, value) {
  if (value[0] === '$') {
    if (value === '$') {
      // A very common symbol.
      if (initializingHandler !== null && key === '0') {
        // We we already have an initializing handler and we're abound to enter
        // a new element, we need to shadow it because we're now in a new scope.
        // This is effectively the "begin" or "push" phase of Element parsing.
        // We'll pop later when we parse the array itself.
        initializingHandler = {
          parent: initializingHandler,
          chunk: null,
          value: null,
          deps: 0,
          errored: false
        };
      }

      return REACT_ELEMENT_TYPE;
    }

    switch (value[1]) {
      case '$':
        {
          // This was an escaped string value.
          return value.slice(1);
        }

      case 'L':
        {
          // Lazy node
          var id = parseInt(value.slice(2), 16);
          var chunk = getChunk(response, id);

          if (enableProfilerTimer && enableComponentPerformanceTrack) {
            if (initializingChunk !== null && isArray(initializingChunk._children)) {
              initializingChunk._children.push(chunk);
            }
          } // We create a React.lazy wrapper around any lazy values.
          // When passed into React, we'll know how to suspend on this.


          return createLazyChunkWrapper(chunk);
        }

      case '@':
        {
          // Promise
          if (value.length === 2) {
            // Infinite promise that never resolves.
            return new Promise(function () {});
          }

          var _id = parseInt(value.slice(2), 16);

          var _chunk2 = getChunk(response, _id);

          if (enableProfilerTimer && enableComponentPerformanceTrack) {
            if (initializingChunk !== null && isArray(initializingChunk._children)) {
              initializingChunk._children.push(_chunk2);
            }
          }

          return _chunk2;
        }

      case 'S':
        {
          // Symbol
          return Symbol.for(value.slice(2));
        }

      case 'F':
        {
          // Server Reference
          var ref = value.slice(2);
          return getOutlinedModel(response, ref, parentObject, key, loadServerReference);
        }

      case 'T':
        {
          // Temporary Reference
          var reference = '$' + value.slice(2);
          var temporaryReferences = response._tempRefs;

          if (temporaryReferences == null) {
            throw new Error('Missing a temporary reference set but the RSC response returned a temporary reference. ' + 'Pass a temporaryReference option with the set that was used with the reply.');
          }

          return readTemporaryReference(temporaryReferences, reference);
        }

      case 'Q':
        {
          // Map
          var _ref = value.slice(2);

          return getOutlinedModel(response, _ref, parentObject, key, createMap);
        }

      case 'W':
        {
          // Set
          var _ref2 = value.slice(2);

          return getOutlinedModel(response, _ref2, parentObject, key, createSet);
        }

      case 'B':
        {
          // Blob
          var _ref3 = value.slice(2);

          return getOutlinedModel(response, _ref3, parentObject, key, createBlob);
        }

      case 'K':
        {
          // FormData
          var _ref4 = value.slice(2);

          return getOutlinedModel(response, _ref4, parentObject, key, createFormData);
        }

      case 'Z':
        {
          // Error
          if (__DEV__) {
            var _ref5 = value.slice(2);

            return getOutlinedModel(response, _ref5, parentObject, key, resolveErrorDev);
          } else {
            return resolveErrorProd(response);
          }
        }

      case 'i':
        {
          // Iterator
          var _ref6 = value.slice(2);

          return getOutlinedModel(response, _ref6, parentObject, key, extractIterator);
        }

      case 'I':
        {
          // $Infinity
          return Infinity;
        }

      case '-':
        {
          // $-0 or $-Infinity
          if (value === '$-0') {
            return -0;
          } else {
            return -Infinity;
          }
        }

      case 'N':
        {
          // $NaN
          return NaN;
        }

      case 'u':
        {
          // matches "$undefined"
          // Special encoding for `undefined` which can't be serialized as JSON otherwise.
          return undefined;
        }

      case 'D':
        {
          // Date
          return new Date(Date.parse(value.slice(2)));
        }

      case 'n':
        {
          // BigInt
          return BigInt(value.slice(2));
        }

      case 'E':
        {
          if (__DEV__) {
            // In DEV mode we allow indirect eval to produce functions for logging.
            // This should not compile to eval() because then it has local scope access.
            try {
              // eslint-disable-next-line no-eval
              return (0, eval)(value.slice(2));
            } catch (x) {
              // We currently use this to express functions so we fail parsing it,
              // let's just return a blank function as a place holder.
              return function () {};
            }
          } // Fallthrough

        }

      case 'Y':
        {
          if (__DEV__) {
            // In DEV mode we encode omitted objects in logs as a getter that throws
            // so that when you try to access it on the client, you know why that
            // happened.
            Object.defineProperty(parentObject, key, {
              get: function () {
                // TODO: We should ideally throw here to indicate a difference.
                return 'This object has been omitted by React in the console log ' + 'to avoid sending too much data from the server. Try logging smaller ' + 'or more specific objects.';
              },
              enumerable: true,
              configurable: false
            });
            return null;
          } // Fallthrough

        }

      default:
        {
          // We assume that anything else is a reference ID.
          var _ref7 = value.slice(1);

          return getOutlinedModel(response, _ref7, parentObject, key, createModel);
        }
    }
  }

  return value;
}

function parseModelTuple(response, value) {
  var tuple = value;

  if (tuple[0] === REACT_ELEMENT_TYPE) {
    // TODO: Consider having React just directly accept these arrays as elements.
    // Or even change the ReactElement type to be an array.
    return createElement(response, tuple[1], tuple[2], tuple[3], __DEV__ ? tuple[4] : null, __DEV__ ? tuple[5] : null, __DEV__ ? tuple[6] : 0);
  }

  return value;
}

function missingCall() {
  throw new Error('Trying to call a function from "use server" but the callServer option ' + 'was not implemented in your router runtime.');
}

function ResponseInstance(this, bundlerConfig, serverReferenceConfig, moduleLoading, callServer, encodeFormAction, nonce, temporaryReferences, findSourceMapURL, replayConsole, environmentName) {
  var chunks = new Map();
  this._bundlerConfig = bundlerConfig;
  this._serverReferenceConfig = serverReferenceConfig;
  this._moduleLoading = moduleLoading;
  this._callServer = callServer !== undefined ? callServer : missingCall;
  this._encodeFormAction = encodeFormAction;
  this._nonce = nonce;
  this._chunks = chunks;
  this._stringDecoder = createStringDecoder();
  this._fromJSON = null;
  this._rowState = 0;
  this._rowID = 0;
  this._rowTag = 0;
  this._rowLength = 0;
  this._buffer = [];
  this._closed = false;
  this._closedReason = null;
  this._tempRefs = temporaryReferences;

  if (enableProfilerTimer && enableComponentPerformanceTrack) {
    this._timeOrigin = 0;
  }

  if (__DEV__) {
    // TODO: The Flight Client can be used in a Client Environment too and we should really support
    // getting the owner there as well, but currently the owner of ReactComponentInfo is typed as only
    // supporting other ReactComponentInfo as owners (and not Fiber or Fizz's ComponentStackNode).
    // We need to update all the callsites consuming ReactComponentInfo owners to support those.
    // In the meantime we only check ReactSharedInteralsServer since we know that in an RSC environment
    // the only owners will be ReactComponentInfo.
    var rootOwner = ReactSharedInteralsServer === undefined || ReactSharedInteralsServer.A === null ? null : ReactSharedInteralsServer.A.getOwner();
    this._debugRootOwner = rootOwner;
    this._debugRootStack = rootOwner !== null ? // TODO: Consider passing the top frame in so we can avoid internals showing up.
    new Error('react-stack-top-frame') : null;
    var rootEnv = environmentName === undefined ? 'Server' : environmentName;

    if (supportsCreateTask) {
      // Any stacks that appear on the server need to be rooted somehow on the client
      // so we create a root Task for this response which will be the root owner for any
      // elements created by the server. We use the "use server" string to indicate that
      // this is where we enter the server from the client.
      // TODO: Make this string configurable.
      this._debugRootTask = console.createTask('"use ' + rootEnv.toLowerCase() + '"');
    }

    this._debugFindSourceMapURL = findSourceMapURL;
    this._replayConsole = replayConsole;
    this._rootEnvironmentName = rootEnv;
  } // Don't inline this call because it causes closure to outline the call above.


  this._fromJSON = createFromJSONCallback(this);
}

export function createResponse(bundlerConfig, serverReferenceConfig, moduleLoading, callServer, encodeFormAction, nonce, temporaryReferences, findSourceMapURL, replayConsole, environmentName) {
  // $FlowFixMe[invalid-constructor]: the shapes are exact here but Flow doesn't like constructors
  return new ResponseInstance(bundlerConfig, serverReferenceConfig, moduleLoading, callServer, encodeFormAction, nonce, temporaryReferences, findSourceMapURL, replayConsole, environmentName);
}

function resolveModel(response, id, model) {
  var chunks = response._chunks;
  var chunk = chunks.get(id);

  if (!chunk) {
    chunks.set(id, createResolvedModelChunk(response, model));
  } else {
    resolveModelChunk(chunk, model);
  }
}

function resolveText(response, id, text) {
  var chunks = response._chunks;
  var chunk = chunks.get(id);

  if (chunk && chunk.status !== PENDING) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    var streamChunk = chunk;
    var controller = streamChunk.reason;
    controller.enqueueValue(text);
    return;
  }

  chunks.set(id, createInitializedTextChunk(response, text));
}

function resolveBuffer(response, id, buffer) {
  var chunks = response._chunks;
  var chunk = chunks.get(id);

  if (chunk && chunk.status !== PENDING) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    var streamChunk = chunk;
    var controller = streamChunk.reason;
    controller.enqueueValue(buffer);
    return;
  }

  chunks.set(id, createInitializedBufferChunk(response, buffer));
}

function resolveModule(response, id, model) {
  var chunks = response._chunks;
  var chunk = chunks.get(id);
  var clientReferenceMetadata = parseModel(response, model);
  var clientReference = resolveClientReference(response._bundlerConfig, clientReferenceMetadata);
  prepareDestinationForModule(response._moduleLoading, response._nonce, clientReferenceMetadata); // TODO: Add an option to encode modules that are lazy loaded.
  // For now we preload all modules as early as possible since it's likely
  // that we'll need them.

  var promise = preloadModule(clientReference);

  if (promise) {
    var blockedChunk;

    if (!chunk) {
      // Technically, we should just treat promise as the chunk in this
      // case. Because it'll just behave as any other promise.
      blockedChunk = createBlockedChunk(response);
      chunks.set(id, blockedChunk);
    } else {
      // This can't actually happen because we don't have any forward
      // references to modules.
      blockedChunk = chunk;
      blockedChunk.status = BLOCKED;
    }

    promise.then(function () {
      return resolveModuleChunk(blockedChunk, clientReference);
    }, function (error) {
      return triggerErrorOnChunk(blockedChunk, error);
    });
  } else {
    if (!chunk) {
      chunks.set(id, createResolvedModuleChunk(response, clientReference));
    } else {
      // This can't actually happen because we don't have any forward
      // references to modules.
      resolveModuleChunk(chunk, clientReference);
    }
  }
}

function resolveStream(response, id, stream, controller) {
  var chunks = response._chunks;
  var chunk = chunks.get(id);

  if (!chunk) {
    chunks.set(id, createInitializedStreamChunk(response, stream, controller));
    return;
  }

  if (chunk.status !== PENDING) {
    // We already resolved. We didn't expect to see this.
    return;
  }

  var resolveListeners = chunk.value;
  var resolvedChunk = chunk;
  resolvedChunk.status = INITIALIZED;
  resolvedChunk.value = stream;
  resolvedChunk.reason = controller;

  if (resolveListeners !== null) {
    wakeChunk(resolveListeners, chunk.value);
  }
}

function startReadableStream(response, id, type) {
  var controller = null;
  var stream = new ReadableStream({
    type: type,
    start: function (c) {
      controller = c;
    }
  });
  var previousBlockedChunk = null;
  var flightController = {
    enqueueValue: function (value) {
      if (previousBlockedChunk === null) {
        controller.enqueue(value);
      } else {
        // We're still waiting on a previous chunk so we can't enqueue quite yet.
        previousBlockedChunk.then(function () {
          controller.enqueue(value);
        });
      }
    },
    enqueueModel: function (json) {
      if (previousBlockedChunk === null) {
        // If we're not blocked on any other chunks, we can try to eagerly initialize
        // this as a fast-path to avoid awaiting them.
        var chunk = createResolvedModelChunk(response, json);
        initializeModelChunk(chunk);
        var initializedChunk = chunk;

        if (initializedChunk.status === INITIALIZED) {
          controller.enqueue(initializedChunk.value);
        } else {
          chunk.then(function (v) {
            return controller.enqueue(v);
          }, function (e) {
            return controller.error(e);
          });
          previousBlockedChunk = chunk;
        }
      } else {
        // We're still waiting on a previous chunk so we can't enqueue quite yet.
        var blockedChunk = previousBlockedChunk;

        var _chunk3 = createPendingChunk(response);

        _chunk3.then(function (v) {
          return controller.enqueue(v);
        }, function (e) {
          return controller.error(e);
        });

        previousBlockedChunk = _chunk3;
        blockedChunk.then(function () {
          if (previousBlockedChunk === _chunk3) {
            // We were still the last chunk so we can now clear the queue and return
            // to synchronous emitting.
            previousBlockedChunk = null;
          }

          resolveModelChunk(_chunk3, json);
        });
      }
    },
    close: function (json) {
      if (previousBlockedChunk === null) {
        controller.close();
      } else {
        var blockedChunk = previousBlockedChunk; // We shouldn't get any more enqueues after this so we can set it back to null.

        previousBlockedChunk = null;
        blockedChunk.then(function () {
          return controller.close();
        });
      }
    },
    error: function (error) {
      if (previousBlockedChunk === null) {
        // $FlowFixMe[incompatible-call]
        controller.error(error);
      } else {
        var blockedChunk = previousBlockedChunk; // We shouldn't get any more enqueues after this so we can set it back to null.

        previousBlockedChunk = null;
        blockedChunk.then(function () {
          return controller.error(error);
        });
      }
    }
  };
  resolveStream(response, id, stream, flightController);
}

function asyncIterator(this) {
  // Self referencing iterator.
  return this;
}

function createIterator(next) {
  var iterator = {
    next: next // TODO: Add return/throw as options for aborting.

  }; // TODO: The iterator could inherit the AsyncIterator prototype which is not exposed as
  // a global but exists as a prototype of an AsyncGenerator. However, it's not needed
  // to satisfy the iterable protocol.

  iterator[ASYNC_ITERATOR] = asyncIterator;
  return iterator;
}

function startAsyncIterable(response, id, iterator) {
  var buffer = [];
  var closed = false;
  var nextWriteIndex = 0;
  var flightController = {
    enqueueValue: function (value) {
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createInitializedIteratorResultChunk(response, value, false);
      } else {
        var chunk = buffer[nextWriteIndex];
        var resolveListeners = chunk.value;
        var rejectListeners = chunk.reason;
        var initializedChunk = chunk;
        initializedChunk.status = INITIALIZED;
        initializedChunk.value = {
          done: false,
          value: value
        };

        if (resolveListeners !== null) {
          wakeChunkIfInitialized(chunk, resolveListeners, rejectListeners);
        }
      }

      nextWriteIndex++;
    },
    enqueueModel: function (value) {
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createResolvedIteratorResultChunk(response, value, false);
      } else {
        resolveIteratorResultChunk(buffer[nextWriteIndex], value, false);
      }

      nextWriteIndex++;
    },
    close: function (value) {
      closed = true;

      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createResolvedIteratorResultChunk(response, value, true);
      } else {
        resolveIteratorResultChunk(buffer[nextWriteIndex], value, true);
      }

      nextWriteIndex++;

      while (nextWriteIndex < buffer.length) {
        // In generators, any extra reads from the iterator have the value undefined.
        resolveIteratorResultChunk(buffer[nextWriteIndex++], '"$undefined"', true);
      }
    },
    error: function (error) {
      closed = true;

      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createPendingChunk(response);
      }

      while (nextWriteIndex < buffer.length) {
        triggerErrorOnChunk(buffer[nextWriteIndex++], error);
      }
    }
  };

  var iterable = _defineProperty({}, ASYNC_ITERATOR, function () {
    var nextReadIndex = 0;
    return createIterator(function (arg) {
      if (arg !== undefined) {
        throw new Error('Values cannot be passed to next() of AsyncIterables passed to Client Components.');
      }

      if (nextReadIndex === buffer.length) {
        if (closed) {
          // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
          return new ReactPromise(INITIALIZED, {
            done: true,
            value: undefined
          }, null, response);
        }

        buffer[nextReadIndex] = createPendingChunk(response);
      }

      return buffer[nextReadIndex++];
    });
  }); // TODO: If it's a single shot iterator we can optimize memory by cleaning up the buffer after
  // reading through the end, but currently we favor code size over this optimization.


  resolveStream(response, id, iterator ? iterable[ASYNC_ITERATOR]() : iterable, flightController);
}

function stopStream(response, id, row) {
  var chunks = response._chunks;
  var chunk = chunks.get(id);

  if (!chunk || chunk.status !== INITIALIZED) {
    // We didn't expect not to have an existing stream;
    return;
  }

  var streamChunk = chunk;
  var controller = streamChunk.reason;
  controller.close(row === '' ? '"$undefined"' : row);
}

function resolveErrorProd(response) {
  if (__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('resolveErrorProd should never be called in development mode. Use resolveErrorDev instead. This is a bug in React.');
  }

  var error = new Error('An error occurred in the Server Components render. The specific message is omitted in production' + ' builds to avoid leaking sensitive details. A digest property is included on this error instance which' + ' may provide additional details about the nature of the error.');
  error.stack = 'Error: ' + error.message;
  return error;
}

function resolveErrorDev(response, errorInfo) {
  var name = errorInfo.name;
  var message = errorInfo.message;
  var stack = errorInfo.stack;
  var env = errorInfo.env;

  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('resolveErrorDev should never be called in production mode. Use resolveErrorProd instead. This is a bug in React.');
  }

  var error;
  var callStack = buildFakeCallStack(response, stack, env, // $FlowFixMe[incompatible-use]
  Error.bind(null, message || 'An error occurred in the Server Components render but no message was provided'));
  var rootTask = getRootTask(response, env);

  if (rootTask != null) {
    error = rootTask.run(callStack);
  } else {
    error = callStack();
  }

  error.name = name;
  error.environmentName = env;
  return error;
}

function resolvePostponeProd(response, id) {
  if (__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('resolvePostponeProd should never be called in development mode. Use resolvePostponeDev instead. This is a bug in React.');
  }

  var error = new Error('A Server Component was postponed. The reason is omitted in production' + ' builds to avoid leaking sensitive details.');
  var postponeInstance = error;
  postponeInstance.$$typeof = REACT_POSTPONE_TYPE;
  postponeInstance.stack = 'Error: ' + error.message;
  var chunks = response._chunks;
  var chunk = chunks.get(id);

  if (!chunk) {
    chunks.set(id, createErrorChunk(response, postponeInstance));
  } else {
    triggerErrorOnChunk(chunk, postponeInstance);
  }
}

function resolvePostponeDev(response, id, reason, stack, env) {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('resolvePostponeDev should never be called in production mode. Use resolvePostponeProd instead. This is a bug in React.');
  }

  var postponeInstance;
  var callStack = buildFakeCallStack(response, stack, env, // $FlowFixMe[incompatible-use]
  Error.bind(null, reason || ''));
  var rootTask = response._debugRootTask;

  if (rootTask != null) {
    postponeInstance = rootTask.run(callStack);
  } else {
    postponeInstance = callStack();
  }

  postponeInstance.$$typeof = REACT_POSTPONE_TYPE;
  var chunks = response._chunks;
  var chunk = chunks.get(id);

  if (!chunk) {
    chunks.set(id, createErrorChunk(response, postponeInstance));
  } else {
    triggerErrorOnChunk(chunk, postponeInstance);
  }
}

function resolveHint(response, code, model) {
  var hintModel = parseModel(response, model);
  dispatchHint(code, hintModel);
}

var supportsCreateTask = __DEV__ && !!console.createTask;
var fakeFunctionCache = __DEV__ ? new Map() : null;
var fakeFunctionIdx = 0;

function createFakeFunction(name, filename, sourceMap, line, col, enclosingLine, enclosingCol, environmentName) {
  // This creates a fake copy of a Server Module. It represents a module that has already
  // executed on the server but we re-execute a blank copy for its stack frames on the client.
  var comment = '/* This module was rendered by a Server Component. Turn on Source Maps to see the server source. */';

  if (!name) {
    // An eval:ed function with no name gets the name "eval". We give it something more descriptive.
    name = '<anonymous>';
  }

  var encodedName = JSON.stringify(name); // We generate code where the call is at the line and column of the server executed code.
  // This allows us to use the original source map as the source map of this fake file to
  // point to the original source.

  var code; // Normalize line/col to zero based.

  if (enclosingLine < 1) {
    enclosingLine = 0;
  } else {
    enclosingLine--;
  }

  if (enclosingCol < 1) {
    enclosingCol = 0;
  } else {
    enclosingCol--;
  }

  if (line < 1) {
    line = 0;
  } else {
    line--;
  }

  if (col < 1) {
    col = 0;
  } else {
    col--;
  }

  if (line < enclosingLine || line === enclosingLine && col < enclosingCol) {
    // Protection against invalid enclosing information. Should not happen.
    enclosingLine = 0;
    enclosingCol = 0;
  }

  if (line < 1) {
    // Fit everything on the first line.
    var minCol = encodedName.length + 3;
    var enclosingColDistance = enclosingCol - minCol;

    if (enclosingColDistance < 0) {
      enclosingColDistance = 0;
    }

    var colDistance = col - enclosingColDistance - minCol - 3;

    if (colDistance < 0) {
      colDistance = 0;
    }

    code = '({' + encodedName + ':' + ' '.repeat(enclosingColDistance) + '_=>' + ' '.repeat(colDistance) + '_()})';
  } else if (enclosingLine < 1) {
    // Fit just the enclosing function on the first line.
    var _minCol = encodedName.length + 3;

    var _enclosingColDistance = enclosingCol - _minCol;

    if (_enclosingColDistance < 0) {
      _enclosingColDistance = 0;
    }

    code = '({' + encodedName + ':' + ' '.repeat(_enclosingColDistance) + '_=>' + '\n'.repeat(line - enclosingLine) + ' '.repeat(col) + '_()})';
  } else if (enclosingLine === line) {
    // Fit the enclosing function and callsite on same line.
    var _colDistance = col - enclosingCol - 3;

    if (_colDistance < 0) {
      _colDistance = 0;
    }

    code = '\n'.repeat(enclosingLine - 1) + '({' + encodedName + ':\n' + ' '.repeat(enclosingCol) + '_=>' + ' '.repeat(_colDistance) + '_()})';
  } else {
    // This is the ideal because we can always encode any position.
    code = '\n'.repeat(enclosingLine - 1) + '({' + encodedName + ':\n' + ' '.repeat(enclosingCol) + '_=>' + '\n'.repeat(line - enclosingLine) + ' '.repeat(col) + '_()})';
  }

  if (enclosingLine < 1) {
    // If the function starts at the first line, we append the comment after.
    code = code + '\n' + comment;
  } else {
    // Otherwise we prepend the comment on the first line.
    code = comment + code;
  }

  if (filename.startsWith('/')) {
    // If the filename starts with `/` we assume that it is a file system file
    // rather than relative to the current host. Since on the server fully qualified
    // stack traces use the file path.
    // TODO: What does this look like on Windows?
    filename = 'file://' + filename;
  }

  if (sourceMap) {
    // We use the prefix rsc://React/ to separate these from other files listed in
    // the Chrome DevTools. We need a "host name" and not just a protocol because
    // otherwise the group name becomes the root folder. Ideally we don't want to
    // show these at all but there's two reasons to assign a fake URL.
    // 1) A printed stack trace string needs a unique URL to be able to source map it.
    // 2) If source maps are disabled or fails, you should at least be able to tell
    //    which file it was.
    code += '\n//# sourceURL=rsc://React/' + encodeURIComponent(environmentName) + '/' + encodeURI(filename) + '?' + fakeFunctionIdx++;
    code += '\n//# sourceMappingURL=' + sourceMap;
  } else if (filename) {
    code += '\n//# sourceURL=' + encodeURI(filename);
  } else {
    code += '\n//# sourceURL=<anonymous>';
  }

  var fn;

  try {
    // eslint-disable-next-line no-eval
    fn = (0, eval)(code)[name];
  } catch (x) {
    // If eval fails, such as if in an environment that doesn't support it,
    // we fallback to creating a function here. It'll still have the right
    // name but it'll lose line/column number and file name.
    fn = function (_) {
      return _();
    };
  }

  return fn;
}

function buildFakeCallStack(response, stack, environmentName, innerCall) {
  var callStack = innerCall;

  for (var i = 0; i < stack.length; i++) {
    var frame = stack[i];
    var frameKey = frame.join('-') + '-' + environmentName;
    var fn = fakeFunctionCache.get(frameKey);

    if (fn === undefined) {
      var name = frame[0],
          filename = frame[1],
          line = frame[2],
          col = frame[3],
          enclosingLine = frame[4],
          enclosingCol = frame[5];
      var findSourceMapURL = response._debugFindSourceMapURL;
      var sourceMap = findSourceMapURL ? findSourceMapURL(filename, environmentName) : null;
      fn = createFakeFunction(name, filename, sourceMap, line, col, enclosingLine, enclosingCol, environmentName); // TODO: This cache should technically live on the response since the _debugFindSourceMapURL
      // function is an input and can vary by response.

      fakeFunctionCache.set(frameKey, fn);
    }

    callStack = fn.bind(null, callStack);
  }

  return callStack;
}

function getRootTask(response, childEnvironmentName) {
  var rootTask = response._debugRootTask;

  if (!rootTask) {
    return null;
  }

  if (response._rootEnvironmentName !== childEnvironmentName) {
    // If the root most owner component is itself in a different environment than the requested
    // environment then we create an extra task to indicate that we're transitioning into it.
    // Like if one environment just requests another environment.
    var createTaskFn = console.createTask.bind(console, '"use ' + childEnvironmentName.toLowerCase() + '"');
    return rootTask.run(createTaskFn);
  }

  return rootTask;
}

function initializeFakeTask(response, debugInfo, childEnvironmentName) {
  if (!supportsCreateTask) {
    return null;
  }

  var componentInfo = debugInfo; // Refined

  if (debugInfo.stack == null) {
    // If this is an error, we should've really already initialized the task.
    // If it's null, we can't initialize a task.
    return null;
  }

  var stack = debugInfo.stack;
  var env = componentInfo.env == null ? response._rootEnvironmentName : componentInfo.env;

  if (env !== childEnvironmentName) {
    // This is the boundary between two environments so we'll annotate the task name.
    // That is unusual so we don't cache it.
    var ownerTask = componentInfo.owner == null ? null : initializeFakeTask(response, componentInfo.owner, env);
    return buildFakeTask(response, ownerTask, stack, '"use ' + childEnvironmentName.toLowerCase() + '"', env);
  } else {
    var cachedEntry = componentInfo.debugTask;

    if (cachedEntry !== undefined) {
      return cachedEntry;
    }

    var _ownerTask = componentInfo.owner == null ? null : initializeFakeTask(response, componentInfo.owner, env); // $FlowFixMe[cannot-write]: We consider this part of initialization.


    return componentInfo.debugTask = buildFakeTask(response, _ownerTask, stack, getServerComponentTaskName(componentInfo), env);
  }
}

function buildFakeTask(response, ownerTask, stack, taskName, env) {
  var createTaskFn = console.createTask.bind(console, taskName);
  var callStack = buildFakeCallStack(response, stack, env, createTaskFn);

  if (ownerTask === null) {
    var rootTask = getRootTask(response, env);

    if (rootTask != null) {
      return rootTask.run(callStack);
    } else {
      return callStack();
    }
  } else {
    return ownerTask.run(callStack);
  }
}

var createFakeJSXCallStack = {
  'react-stack-bottom-frame': function (response, stack, environmentName) {
    var callStackForError = buildFakeCallStack(response, stack, environmentName, fakeJSXCallSite);
    return callStackForError();
  }
};
var createFakeJSXCallStackInDEV = __DEV__ ? // We use this technique to trick minifiers to preserve the function name.
createFakeJSXCallStack['react-stack-bottom-frame'].bind(createFakeJSXCallStack) : null;
/** @noinline */

function fakeJSXCallSite() {
  // This extra call frame represents the JSX creation function. We always pop this frame
  // off before presenting so it needs to be part of the stack.
  return new Error('react-stack-top-frame');
}

function initializeFakeStack(response, debugInfo) {
  var cachedEntry = debugInfo.debugStack;

  if (cachedEntry !== undefined) {
    return;
  }

  if (debugInfo.stack != null) {
    var _stack = debugInfo.stack;

    var _env2 = debugInfo.env == null ? '' : debugInfo.env; // $FlowFixMe[cannot-write]


    debugInfo.debugStack = createFakeJSXCallStackInDEV(response, _stack, _env2);
  }

  if (debugInfo.owner != null) {
    // Initialize any owners not yet initialized.
    initializeFakeStack(response, debugInfo.owner);
  }
}

function resolveDebugInfo(response, id, debugInfo) {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('resolveDebugInfo should never be called in production mode. This is a bug in React.');
  } // We eagerly initialize the fake task because this resolving happens outside any
  // render phase so we're not inside a user space stack at this point. If we waited
  // to initialize it when we need it, we might be inside user code.


  var env = debugInfo.env === undefined ? response._rootEnvironmentName : debugInfo.env;

  if (debugInfo.stack !== undefined) {
    var componentInfoOrAsyncInfo = // $FlowFixMe[incompatible-type]
    debugInfo;
    initializeFakeTask(response, componentInfoOrAsyncInfo, env);
  }

  if (debugInfo.owner === null && response._debugRootOwner != null) {
    // $FlowFixMe[prop-missing] By narrowing `owner` to `null`, we narrowed `debugInfo` to `ReactComponentInfo`
    var componentInfo = debugInfo; // $FlowFixMe[cannot-write]

    componentInfo.owner = response._debugRootOwner; // We override the stack if we override the owner since the stack where the root JSX
    // was created on the server isn't very useful but where the request was made is.
    // $FlowFixMe[cannot-write]

    componentInfo.debugStack = response._debugRootStack;
  } else if (debugInfo.stack !== undefined) {
    var _componentInfoOrAsyncInfo = // $FlowFixMe[incompatible-type]
    debugInfo;
    initializeFakeStack(response, _componentInfoOrAsyncInfo);
  }

  if (enableProfilerTimer && enableComponentPerformanceTrack) {
    if (typeof debugInfo.time === 'number') {
      // Adjust the time to the current environment's time space.
      // Since this might be a deduped object, we clone it to avoid
      // applying the adjustment twice.
      debugInfo = {
        time: debugInfo.time + response._timeOrigin
      };
    }
  }

  var chunk = getChunk(response, id);
  var chunkDebugInfo = chunk._debugInfo || (chunk._debugInfo = []);
  chunkDebugInfo.push(debugInfo);
}

var currentOwnerInDEV = null;

function getCurrentStackInDEV() {
  if (__DEV__) {
    var _owner = currentOwnerInDEV;

    if (_owner === null) {
      return '';
    }

    return getOwnerStackByComponentInfoInDev(_owner);
  }

  return '';
}

var replayConsoleWithCallStack = {
  'react-stack-bottom-frame': function (response, methodName, stackTrace, owner, env, args) {
    // There really shouldn't be anything else on the stack atm.
    var prevStack = ReactSharedInternals.getCurrentStack;
    ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
    currentOwnerInDEV = owner === null ? response._debugRootOwner : owner;

    try {
      var callStack = buildFakeCallStack(response, stackTrace, env, bindToConsole(methodName, args, env));

      if (owner != null) {
        var task = initializeFakeTask(response, owner, env);
        initializeFakeStack(response, owner);

        if (task !== null) {
          task.run(callStack);
          return;
        }
      }

      var rootTask = getRootTask(response, env);

      if (rootTask != null) {
        rootTask.run(callStack);
        return;
      }

      callStack();
    } finally {
      currentOwnerInDEV = null;
      ReactSharedInternals.getCurrentStack = prevStack;
    }
  }
};
var replayConsoleWithCallStackInDEV = __DEV__ ? // We use this technique to trick minifiers to preserve the function name.
replayConsoleWithCallStack['react-stack-bottom-frame'].bind(replayConsoleWithCallStack) : null;

function resolveConsoleEntry(response, value) {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('resolveConsoleEntry should never be called in production mode. This is a bug in React.');
  }

  if (!response._replayConsole) {
    return;
  }

  var payload = parseModel(response, value);
  var methodName = payload[0];
  var stackTrace = payload[1];
  var owner = payload[2];
  var env = payload[3];
  var args = payload.slice(4);
  replayConsoleWithCallStackInDEV(response, methodName, stackTrace, owner, env, args);
}

function mergeBuffer(buffer, lastChunk) {
  var l = buffer.length; // Count the bytes we'll need

  var byteLength = lastChunk.length;

  for (var i = 0; i < l; i++) {
    byteLength += buffer[i].byteLength;
  } // Allocate enough contiguous space


  var result = new Uint8Array(byteLength);
  var offset = 0; // Copy all the buffers into it.

  for (var _i2 = 0; _i2 < l; _i2++) {
    var chunk = buffer[_i2];
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  result.set(lastChunk, offset);
  return result;
}

function resolveTypedArray(response, id, buffer, lastChunk, constructor, bytesPerElement) {
  // If the view fits into one original buffer, we just reuse that buffer instead of
  // copying it out to a separate copy. This means that it's not always possible to
  // transfer these values to other threads without copying first since they may
  // share array buffer. For this to work, it must also have bytes aligned to a
  // multiple of a size of the type.
  var chunk = buffer.length === 0 && lastChunk.byteOffset % bytesPerElement === 0 ? lastChunk : mergeBuffer(buffer, lastChunk); // TODO: The transfer protocol of RSC is little-endian. If the client isn't little-endian
  // we should convert it instead. In practice big endian isn't really Web compatible so it's
  // somewhat safe to assume that browsers aren't going to run it, but maybe there's some SSR
  // server that's affected.

  var view = new constructor(chunk.buffer, chunk.byteOffset, chunk.byteLength / bytesPerElement);
  resolveBuffer(response, id, view);
}

function flushComponentPerformance(response, root, trackIdx, // Next available track
trackTime, // The time after which it is available,
parentEndTime) {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('flushComponentPerformance should never be called in production mode. This is a bug in React.');
  } // Write performance.measure() entries for Server Components in tree order.
  // This must be done at the end to collect the end time from the whole tree.


  if (!isArray(root._children)) {
    // We have already written this chunk. If this was a cycle, then this will
    // be -Infinity and it won't contribute to the parent end time.
    // If this was already emitted by another sibling then we reused the same
    // chunk in two places. We should extend the current end time as if it was
    // rendered as part of this tree.
    var previousResult = root._children;
    var previousEndTime = previousResult.endTime;

    if (parentEndTime > -Infinity && parentEndTime < previousEndTime && previousResult.component !== null) {
      // Log a placeholder for the deduped value under this child starting
      // from the end of the self time of the parent and spanning until the
      // the deduped end.
      logDedupedComponentRender(previousResult.component, trackIdx, parentEndTime, previousEndTime);
    } // Since we didn't bump the track this time, we just return the same track.


    previousResult.track = trackIdx;
    return previousResult;
  }

  var children = root._children;

  if (root.status === RESOLVED_MODEL) {
    // If the model is not initialized by now, do that now so we can find its
    // children. This part is a little sketchy since it significantly changes
    // the performance characteristics of the app by profiling.
    initializeModelChunk(root);
  } // First find the start time of the first component to know if it was running
  // in parallel with the previous.


  var debugInfo = root._debugInfo;

  if (debugInfo) {
    for (var i = 1; i < debugInfo.length; i++) {
      var info = debugInfo[i];

      if (typeof info.name === 'string') {
        // $FlowFixMe: Refined.
        var startTimeInfo = debugInfo[i - 1];

        if (typeof startTimeInfo.time === 'number') {
          var startTime = startTimeInfo.time;

          if (startTime < trackTime) {
            // The start time of this component is before the end time of the previous
            // component on this track so we need to bump the next one to a parallel track.
            trackIdx++;
          }

          trackTime = startTime;
          break;
        }
      }
    }

    for (var _i3 = debugInfo.length - 1; _i3 >= 0; _i3--) {
      var _info = debugInfo[_i3];

      if (typeof _info.time === 'number') {
        if (_info.time > parentEndTime) {
          parentEndTime = _info.time;
        }
      }
    }
  }

  var result = {
    track: trackIdx,
    endTime: -Infinity,
    component: null
  };
  root._children = result;
  var childrenEndTime = -Infinity;
  var childTrackIdx = trackIdx;
  var childTrackTime = trackTime;

  for (var _i4 = 0; _i4 < children.length; _i4++) {
    var childResult = flushComponentPerformance(response, children[_i4], childTrackIdx, childTrackTime, parentEndTime);

    if (childResult.component !== null) {
      result.component = childResult.component;
    }

    childTrackIdx = childResult.track;
    var childEndTime = childResult.endTime;
    childTrackTime = childEndTime;

    if (childEndTime > childrenEndTime) {
      childrenEndTime = childEndTime;
    }
  }

  if (debugInfo) {
    var endTime = 0;
    var isLastComponent = true;

    for (var _i5 = debugInfo.length - 1; _i5 >= 0; _i5--) {
      var _info2 = debugInfo[_i5];

      if (typeof _info2.time === 'number') {
        endTime = _info2.time;

        if (endTime > childrenEndTime) {
          childrenEndTime = endTime;
        }
      }

      if (typeof _info2.name === 'string' && _i5 > 0) {
        // $FlowFixMe: Refined.
        var componentInfo = _info2;
        var _startTimeInfo = debugInfo[_i5 - 1];

        if (typeof _startTimeInfo.time === 'number') {
          var _startTime = _startTimeInfo.time;

          if (isLastComponent && root.status === ERRORED && root.reason !== response._closedReason) {
            // If this is the last component to render before this chunk rejected, then conceptually
            // this component errored. If this was a cancellation then it wasn't this component that
            // errored.
            logComponentErrored(componentInfo, trackIdx, _startTime, endTime, childrenEndTime, response._rootEnvironmentName, root.reason);
          } else {
            logComponentRender(componentInfo, trackIdx, _startTime, endTime, childrenEndTime, response._rootEnvironmentName);
          } // Track the root most component of the result for deduping logging.


          result.component = componentInfo;
        }

        isLastComponent = false;
      }
    }
  }

  result.endTime = childrenEndTime;
  return result;
}

function processFullBinaryRow(response, id, tag, buffer, chunk) {
  switch (tag) {
    case 65
    /* "A" */
    :
      // We must always clone to extract it into a separate buffer instead of just a view.
      resolveBuffer(response, id, mergeBuffer(buffer, chunk).buffer);
      return;

    case 79
    /* "O" */
    :
      resolveTypedArray(response, id, buffer, chunk, Int8Array, 1);
      return;

    case 111
    /* "o" */
    :
      resolveBuffer(response, id, buffer.length === 0 ? chunk : mergeBuffer(buffer, chunk));
      return;

    case 85
    /* "U" */
    :
      resolveTypedArray(response, id, buffer, chunk, Uint8ClampedArray, 1);
      return;

    case 83
    /* "S" */
    :
      resolveTypedArray(response, id, buffer, chunk, Int16Array, 2);
      return;

    case 115
    /* "s" */
    :
      resolveTypedArray(response, id, buffer, chunk, Uint16Array, 2);
      return;

    case 76
    /* "L" */
    :
      resolveTypedArray(response, id, buffer, chunk, Int32Array, 4);
      return;

    case 108
    /* "l" */
    :
      resolveTypedArray(response, id, buffer, chunk, Uint32Array, 4);
      return;

    case 71
    /* "G" */
    :
      resolveTypedArray(response, id, buffer, chunk, Float32Array, 4);
      return;

    case 103
    /* "g" */
    :
      resolveTypedArray(response, id, buffer, chunk, Float64Array, 8);
      return;

    case 77
    /* "M" */
    :
      resolveTypedArray(response, id, buffer, chunk, BigInt64Array, 8);
      return;

    case 109
    /* "m" */
    :
      resolveTypedArray(response, id, buffer, chunk, BigUint64Array, 8);
      return;

    case 86
    /* "V" */
    :
      resolveTypedArray(response, id, buffer, chunk, DataView, 1);
      return;
  }

  var stringDecoder = response._stringDecoder;
  var row = '';

  for (var i = 0; i < buffer.length; i++) {
    row += readPartialStringChunk(stringDecoder, buffer[i]);
  }

  row += readFinalStringChunk(stringDecoder, chunk);
  processFullStringRow(response, id, tag, row);
}

function processFullStringRow(response, id, tag, row) {
  switch (tag) {
    case 73
    /* "I" */
    :
      {
        resolveModule(response, id, row);
        return;
      }

    case 72
    /* "H" */
    :
      {
        var code = row[0];
        resolveHint(response, code, row.slice(1));
        return;
      }

    case 69
    /* "E" */
    :
      {
        var errorInfo = JSON.parse(row);

        var _error;

        if (__DEV__) {
          _error = resolveErrorDev(response, errorInfo);
        } else {
          _error = resolveErrorProd(response);
        }

        _error.digest = errorInfo.digest;
        var errorWithDigest = _error;
        var chunks = response._chunks;
        var chunk = chunks.get(id);

        if (!chunk) {
          chunks.set(id, createErrorChunk(response, errorWithDigest));
        } else {
          triggerErrorOnChunk(chunk, errorWithDigest);
        }

        return;
      }

    case 84
    /* "T" */
    :
      {
        resolveText(response, id, row);
        return;
      }

    case 78
    /* "N" */
    :
      {
        if (enableProfilerTimer && enableComponentPerformanceTrack) {
          // Track the time origin for future debug info. We track it relative
          // to the current environment's time space.
          var timeOrigin = +row;
          response._timeOrigin = timeOrigin - // $FlowFixMe[prop-missing]
          performance.timeOrigin;
          return;
        } // Fallthrough to share the error with Debug and Console entries.

      }

    case 68
    /* "D" */
    :
      {
        if (__DEV__) {
          var _chunk4 = createResolvedModelChunk(response, row);

          initializeModelChunk(_chunk4);
          var initializedChunk = _chunk4;

          if (initializedChunk.status === INITIALIZED) {
            resolveDebugInfo(response, id, initializedChunk.value);
          } else {
            // TODO: This is not going to resolve in the right order if there's more than one.
            _chunk4.then(function (v) {
              return resolveDebugInfo(response, id, v);
            }, function (e) {// Ignore debug info errors for now. Unnecessary noise.
            });
          }

          return;
        } // Fallthrough to share the error with Console entries.

      }

    case 87
    /* "W" */
    :
      {
        if (__DEV__) {
          resolveConsoleEntry(response, row);
          return;
        }

        throw new Error('Failed to read a RSC payload created by a development version of React ' + 'on the server while using a production version on the client. Always use ' + 'matching versions on the server and the client.');
      }

    case 82
    /* "R" */
    :
      {
        startReadableStream(response, id, undefined);
        return;
      }
    // Fallthrough

    case 114
    /* "r" */
    :
      {
        startReadableStream(response, id, 'bytes');
        return;
      }
    // Fallthrough

    case 88
    /* "X" */
    :
      {
        startAsyncIterable(response, id, false);
        return;
      }
    // Fallthrough

    case 120
    /* "x" */
    :
      {
        startAsyncIterable(response, id, true);
        return;
      }
    // Fallthrough

    case 67
    /* "C" */
    :
      {
        stopStream(response, id, row);
        return;
      }
    // Fallthrough

    case 80
    /* "P" */
    :
      {
        if (enablePostpone) {
          if (__DEV__) {
            var postponeInfo = JSON.parse(row);
            resolvePostponeDev(response, id, postponeInfo.reason, postponeInfo.stack, postponeInfo.env);
          } else {
            resolvePostponeProd(response, id);
          }

          return;
        }
      }
    // Fallthrough

    default:
      /* """ "{" "[" "t" "f" "n" "0" - "9" */
      {
        // We assume anything else is JSON.
        resolveModel(response, id, row);
        return;
      }
  }
}

export function processBinaryChunk(response, chunk) {
  var i = 0;
  var rowState = response._rowState;
  var rowID = response._rowID;
  var rowTag = response._rowTag;
  var rowLength = response._rowLength;
  var buffer = response._buffer;
  var chunkLength = chunk.length;

  while (i < chunkLength) {
    var lastIdx = -1;

    switch (rowState) {
      case ROW_ID:
        {
          var byte = chunk[i++];

          if (byte === 58
          /* ":" */
          ) {
            // Finished the rowID, next we'll parse the tag.
            rowState = ROW_TAG;
          } else {
            rowID = rowID << 4 | (byte > 96 ? byte - 87 : byte - 48);
          }

          continue;
        }

      case ROW_TAG:
        {
          var resolvedRowTag = chunk[i];

          if (resolvedRowTag === 84
          /* "T" */
          || resolvedRowTag === 65
          /* "A" */
          || resolvedRowTag === 79
          /* "O" */
          || resolvedRowTag === 111
          /* "o" */
          || resolvedRowTag === 85
          /* "U" */
          || resolvedRowTag === 83
          /* "S" */
          || resolvedRowTag === 115
          /* "s" */
          || resolvedRowTag === 76
          /* "L" */
          || resolvedRowTag === 108
          /* "l" */
          || resolvedRowTag === 71
          /* "G" */
          || resolvedRowTag === 103
          /* "g" */
          || resolvedRowTag === 77
          /* "M" */
          || resolvedRowTag === 109
          /* "m" */
          || resolvedRowTag === 86
          /* "V" */
          ) {
            rowTag = resolvedRowTag;
            rowState = ROW_LENGTH;
            i++;
          } else if (resolvedRowTag > 64 && resolvedRowTag < 91
          /* "A"-"Z" */
          || resolvedRowTag === 35
          /* "#" */
          || resolvedRowTag === 114
          /* "r" */
          || resolvedRowTag === 120
          /* "x" */
          ) {
            rowTag = resolvedRowTag;
            rowState = ROW_CHUNK_BY_NEWLINE;
            i++;
          } else {
            rowTag = 0;
            rowState = ROW_CHUNK_BY_NEWLINE; // This was an unknown tag so it was probably part of the data.
          }

          continue;
        }

      case ROW_LENGTH:
        {
          var _byte = chunk[i++];

          if (_byte === 44
          /* "," */
          ) {
            // Finished the rowLength, next we'll buffer up to that length.
            rowState = ROW_CHUNK_BY_LENGTH;
          } else {
            rowLength = rowLength << 4 | (_byte > 96 ? _byte - 87 : _byte - 48);
          }

          continue;
        }

      case ROW_CHUNK_BY_NEWLINE:
        {
          // We're looking for a newline
          lastIdx = chunk.indexOf(10
          /* "\n" */
          , i);
          break;
        }

      case ROW_CHUNK_BY_LENGTH:
        {
          // We're looking for the remaining byte length
          lastIdx = i + rowLength;

          if (lastIdx > chunk.length) {
            lastIdx = -1;
          }

          break;
        }
    }

    var offset = chunk.byteOffset + i;

    if (lastIdx > -1) {
      // We found the last chunk of the row
      var length = lastIdx - i;
      var lastChunk = new Uint8Array(chunk.buffer, offset, length);
      processFullBinaryRow(response, rowID, rowTag, buffer, lastChunk); // Reset state machine for a new row

      i = lastIdx;

      if (rowState === ROW_CHUNK_BY_NEWLINE) {
        // If we're trailing by a newline we need to skip it.
        i++;
      }

      rowState = ROW_ID;
      rowTag = 0;
      rowID = 0;
      rowLength = 0;
      buffer.length = 0;
    } else {
      // The rest of this row is in a future chunk. We stash the rest of the
      // current chunk until we can process the full row.
      var _length = chunk.byteLength - i;

      var remainingSlice = new Uint8Array(chunk.buffer, offset, _length);
      buffer.push(remainingSlice); // Update how many bytes we're still waiting for. If we're looking for
      // a newline, this doesn't hurt since we'll just ignore it.

      rowLength -= remainingSlice.byteLength;
      break;
    }
  }

  response._rowState = rowState;
  response._rowID = rowID;
  response._rowTag = rowTag;
  response._rowLength = rowLength;
}
export function processStringChunk(response, chunk) {
  // This is a fork of processBinaryChunk that takes a string as input.
  // This can't be just any binary chunk coverted to a string. It needs to be
  // in the same offsets given from the Flight Server. E.g. if it's shifted by
  // one byte then it won't line up to the UCS-2 encoding. It also needs to
  // be valid Unicode. Also binary chunks cannot use this even if they're
  // value Unicode. Large strings are encoded as binary and cannot be passed
  // here. Basically, only if Flight Server gave you this string as a chunk,
  // you can use it here.
  var i = 0;
  var rowState = response._rowState;
  var rowID = response._rowID;
  var rowTag = response._rowTag;
  var rowLength = response._rowLength;
  var buffer = response._buffer;
  var chunkLength = chunk.length;

  while (i < chunkLength) {
    var lastIdx = -1;

    switch (rowState) {
      case ROW_ID:
        {
          var byte = chunk.charCodeAt(i++);

          if (byte === 58
          /* ":" */
          ) {
            // Finished the rowID, next we'll parse the tag.
            rowState = ROW_TAG;
          } else {
            rowID = rowID << 4 | (byte > 96 ? byte - 87 : byte - 48);
          }

          continue;
        }

      case ROW_TAG:
        {
          var resolvedRowTag = chunk.charCodeAt(i);

          if (resolvedRowTag === 84
          /* "T" */
          || resolvedRowTag === 65
          /* "A" */
          || resolvedRowTag === 79
          /* "O" */
          || resolvedRowTag === 111
          /* "o" */
          || resolvedRowTag === 85
          /* "U" */
          || resolvedRowTag === 83
          /* "S" */
          || resolvedRowTag === 115
          /* "s" */
          || resolvedRowTag === 76
          /* "L" */
          || resolvedRowTag === 108
          /* "l" */
          || resolvedRowTag === 71
          /* "G" */
          || resolvedRowTag === 103
          /* "g" */
          || resolvedRowTag === 77
          /* "M" */
          || resolvedRowTag === 109
          /* "m" */
          || resolvedRowTag === 86
          /* "V" */
          ) {
            rowTag = resolvedRowTag;
            rowState = ROW_LENGTH;
            i++;
          } else if (resolvedRowTag > 64 && resolvedRowTag < 91
          /* "A"-"Z" */
          || resolvedRowTag === 114
          /* "r" */
          || resolvedRowTag === 120
          /* "x" */
          ) {
            rowTag = resolvedRowTag;
            rowState = ROW_CHUNK_BY_NEWLINE;
            i++;
          } else {
            rowTag = 0;
            rowState = ROW_CHUNK_BY_NEWLINE; // This was an unknown tag so it was probably part of the data.
          }

          continue;
        }

      case ROW_LENGTH:
        {
          var _byte2 = chunk.charCodeAt(i++);

          if (_byte2 === 44
          /* "," */
          ) {
            // Finished the rowLength, next we'll buffer up to that length.
            rowState = ROW_CHUNK_BY_LENGTH;
          } else {
            rowLength = rowLength << 4 | (_byte2 > 96 ? _byte2 - 87 : _byte2 - 48);
          }

          continue;
        }

      case ROW_CHUNK_BY_NEWLINE:
        {
          // We're looking for a newline
          lastIdx = chunk.indexOf('\n', i);
          break;
        }

      case ROW_CHUNK_BY_LENGTH:
        {
          if (rowTag !== 84) {
            throw new Error('Binary RSC chunks cannot be encoded as strings. ' + 'This is a bug in the wiring of the React streams.');
          } // For a large string by length, we don't know how many unicode characters
          // we are looking for but we can assume that the raw string will be its own
          // chunk. We add extra validation that the length is at least within the
          // possible byte range it could possibly be to catch mistakes.


          if (rowLength < chunk.length || chunk.length > rowLength * 3) {
            throw new Error('String chunks need to be passed in their original shape. ' + 'Not split into smaller string chunks. ' + 'This is a bug in the wiring of the React streams.');
          }

          lastIdx = chunk.length;
          break;
        }
    }

    if (lastIdx > -1) {
      // We found the last chunk of the row
      if (buffer.length > 0) {
        // If we had a buffer already, it means that this chunk was split up into
        // binary chunks preceeding it.
        throw new Error('String chunks need to be passed in their original shape. ' + 'Not split into smaller string chunks. ' + 'This is a bug in the wiring of the React streams.');
      }

      var lastChunk = chunk.slice(i, lastIdx);
      processFullStringRow(response, rowID, rowTag, lastChunk); // Reset state machine for a new row

      i = lastIdx;

      if (rowState === ROW_CHUNK_BY_NEWLINE) {
        // If we're trailing by a newline we need to skip it.
        i++;
      }

      rowState = ROW_ID;
      rowTag = 0;
      rowID = 0;
      rowLength = 0;
      buffer.length = 0;
    } else if (chunk.length !== i) {
      // The rest of this row is in a future chunk. We only support passing the
      // string from chunks in their entirety. Not split up into smaller string chunks.
      // We could support this by buffering them but we shouldn't need to for
      // this use case.
      throw new Error('String chunks need to be passed in their original shape. ' + 'Not split into smaller string chunks. ' + 'This is a bug in the wiring of the React streams.');
    }
  }

  response._rowState = rowState;
  response._rowID = rowID;
  response._rowTag = rowTag;
  response._rowLength = rowLength;
}

function parseModel(response, json) {
  return JSON.parse(json, response._fromJSON);
}

function createFromJSONCallback(response) {
  // $FlowFixMe[missing-this-annot]
  return function (key, value) {
    if (typeof value === 'string') {
      // We can't use .bind here because we need the "this" value.
      return parseModelString(response, this, key, value);
    }

    if (typeof value === 'object' && value !== null) {
      return parseModelTuple(response, value);
    }

    return value;
  };
}

export function close(response) {
  // In case there are any remaining unresolved chunks, they won't
  // be resolved now. So we need to issue an error to those.
  // Ideally we should be able to early bail out if we kept a
  // ref count of pending chunks.
  reportGlobalError(response, new Error('Connection closed.'));
}

function getCurrentOwnerInDEV() {
  return currentOwnerInDEV;
}

export function injectIntoDevTools() {
  var internals = {
    bundleType: __DEV__ ? 1 : 0,
    // Might add PROFILE later.
    version: rendererVersion,
    rendererPackageName: rendererPackageName,
    currentDispatcherRef: ReactSharedInternals,
    // Enables DevTools to detect reconciler version rather than renderer version
    // which may not match for third party renderers.
    reconcilerVersion: ReactVersion,
    getCurrentComponentInfo: getCurrentOwnerInDEV
  };
  return injectInternals(internals);
}