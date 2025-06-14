/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { emitHint, getHints, resolveRequest } from 'react-server/src/ReactFlightServer';
import ReactDOMSharedInternals from 'shared/ReactDOMSharedInternals';
var previousDispatcher = ReactDOMSharedInternals.d;
/* ReactDOMCurrentDispatcher */

ReactDOMSharedInternals.d
/* ReactDOMCurrentDispatcher */
= {
  f
  /* flushSyncWork */
  : previousDispatcher.f
  /* flushSyncWork */
  ,
  r
  /* requestFormReset */
  : previousDispatcher.r
  /* requestFormReset */
  ,
  D
  /* prefetchDNS */
  : prefetchDNS,
  C
  /* preconnect */
  : preconnect,
  L
  /* preload */
  : preload,
  m
  /* preloadModule */
  : preloadModule,
  X
  /* preinitScript */
  : preinitScript,
  S
  /* preinitStyle */
  : preinitStyle,
  M
  /* preinitModuleScript */
  : preinitModuleScript
};

function prefetchDNS(href) {
  if (typeof href === 'string' && href) {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = 'D|' + href;

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);
      emitHint(request, 'D', href);
    } else {
      previousDispatcher.D(
      /* prefetchDNS */
      href);
    }
  }
}

function preconnect(href, crossOrigin) {
  if (typeof href === 'string') {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = "C|" + (crossOrigin == null ? 'null' : crossOrigin) + "|" + href;

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);

      if (typeof crossOrigin === 'string') {
        emitHint(request, 'C', [href, crossOrigin]);
      } else {
        emitHint(request, 'C', href);
      }
    } else {
      previousDispatcher.C(
      /* preconnect */
      href, crossOrigin);
    }
  }
}

function preload(href, as, options) {
  if (typeof href === 'string') {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = 'L';

      if (as === 'image' && options) {
        key += getImagePreloadKey(href, options.imageSrcSet, options.imageSizes);
      } else {
        key += "[" + as + "]" + href;
      }

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);
      var trimmed = trimOptions(options);

      if (trimmed) {
        emitHint(request, 'L', [href, as, trimmed]);
      } else {
        emitHint(request, 'L', [href, as]);
      }
    } else {
      previousDispatcher.L(
      /* preload */
      href, as, options);
    }
  }
}

function preloadModule(href, options) {
  if (typeof href === 'string') {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = 'm|' + href;

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);
      var trimmed = trimOptions(options);

      if (trimmed) {
        return emitHint(request, 'm', [href, trimmed]);
      } else {
        return emitHint(request, 'm', href);
      }
    } else {
      previousDispatcher.m(
      /* preloadModule */
      href, options);
    }
  }
}

function preinitStyle(href, precedence, options) {
  if (typeof href === 'string') {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = 'S|' + href;

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);
      var trimmed = trimOptions(options);

      if (trimmed) {
        return emitHint(request, 'S', [href, typeof precedence === 'string' ? precedence : 0, trimmed]);
      } else if (typeof precedence === 'string') {
        return emitHint(request, 'S', [href, precedence]);
      } else {
        return emitHint(request, 'S', href);
      }
    } else {
      previousDispatcher.S(
      /* preinitStyle */
      href, precedence, options);
    }
  }
}

function preinitScript(src, options) {
  if (typeof src === 'string') {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = 'X|' + src;

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);
      var trimmed = trimOptions(options);

      if (trimmed) {
        return emitHint(request, 'X', [src, trimmed]);
      } else {
        return emitHint(request, 'X', src);
      }
    } else {
      previousDispatcher.X(
      /* preinitScript */
      src, options);
    }
  }
}

function preinitModuleScript(src, options) {
  if (typeof src === 'string') {
    var request = resolveRequest();

    if (request) {
      var hints = getHints(request);
      var key = 'M|' + src;

      if (hints.has(key)) {
        // duplicate hint
        return;
      }

      hints.add(key);
      var trimmed = trimOptions(options);

      if (trimmed) {
        return emitHint(request, 'M', [src, trimmed]);
      } else {
        return emitHint(request, 'M', src);
      }
    } else {
      previousDispatcher.M(
      /* preinitModuleScript */
      src, options);
    }
  }
} // Flight normally encodes undefined as a special character however for directive option
// arguments we don't want to send unnecessary keys and bloat the payload so we create a
// trimmed object which omits any keys with null or undefined values.
// This is only typesafe because these option objects have entirely optional fields where
// null and undefined represent the same thing as no property.


function trimOptions(options) {
  if (options == null) return null;
  var hasProperties = false;
  var trimmed = {};

  for (var key in options) {
    // $FlowFixMe[invalid-computed-prop]
    if (options[key] != null) {
      hasProperties = true;
      trimmed[key] = options[key];
    }
  }

  return hasProperties ? trimmed : null;
}

function getImagePreloadKey(href, imageSrcSet, imageSizes) {
  var uniquePart = '';

  if (typeof imageSrcSet === 'string' && imageSrcSet !== '') {
    uniquePart += '[' + imageSrcSet + ']';

    if (typeof imageSizes === 'string') {
      uniquePart += '[' + imageSizes + ']';
    }
  } else {
    uniquePart += '[][]' + href;
  }

  return "[image]" + uniquePart;
}