/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// This client file is in the shared folder because it applies to both SSR and browser contexts.
// It is the configuration of the FlightClient behavior which can run in either environment.
import ReactDOMSharedInternals from 'shared/ReactDOMSharedInternals';
import { getCrossOriginString } from './crossOriginStrings';
export function dispatchHint(code, model) {
  var dispatcher = ReactDOMSharedInternals.d;
  /* ReactDOMCurrentDispatcher */

  switch (code) {
    case 'D':
      {
        var refined = refineModel(code, model);
        var href = refined;
        dispatcher.D(
        /* prefetchDNS */
        href);
        return;
      }

    case 'C':
      {
        var _refined = refineModel(code, model);

        if (typeof _refined === 'string') {
          var _href = _refined;
          dispatcher.C(
          /* preconnect */
          _href);
        } else {
          var _href2 = _refined[0];
          var crossOrigin = _refined[1];
          dispatcher.C(
          /* preconnect */
          _href2, crossOrigin);
        }

        return;
      }

    case 'L':
      {
        var _refined2 = refineModel(code, model);

        var _href3 = _refined2[0];
        var as = _refined2[1];

        if (_refined2.length === 3) {
          var options = _refined2[2];
          dispatcher.L(
          /* preload */
          _href3, as, options);
        } else {
          dispatcher.L(
          /* preload */
          _href3, as);
        }

        return;
      }

    case 'm':
      {
        var _refined3 = refineModel(code, model);

        if (typeof _refined3 === 'string') {
          var _href4 = _refined3;
          dispatcher.m(
          /* preloadModule */
          _href4);
        } else {
          var _href5 = _refined3[0];
          var _options = _refined3[1];
          dispatcher.m(
          /* preloadModule */
          _href5, _options);
        }

        return;
      }

    case 'X':
      {
        var _refined4 = refineModel(code, model);

        if (typeof _refined4 === 'string') {
          var _href6 = _refined4;
          dispatcher.X(
          /* preinitScript */
          _href6);
        } else {
          var _href7 = _refined4[0];
          var _options2 = _refined4[1];
          dispatcher.X(
          /* preinitScript */
          _href7, _options2);
        }

        return;
      }

    case 'S':
      {
        var _refined5 = refineModel(code, model);

        if (typeof _refined5 === 'string') {
          var _href8 = _refined5;
          dispatcher.S(
          /* preinitStyle */
          _href8);
        } else {
          var _href9 = _refined5[0];
          var precedence = _refined5[1] === 0 ? undefined : _refined5[1];

          var _options3 = _refined5.length === 3 ? _refined5[2] : undefined;

          dispatcher.S(
          /* preinitStyle */
          _href9, precedence, _options3);
        }

        return;
      }

    case 'M':
      {
        var _refined6 = refineModel(code, model);

        if (typeof _refined6 === 'string') {
          var _href10 = _refined6;
          dispatcher.M(
          /* preinitModuleScript */
          _href10);
        } else {
          var _href11 = _refined6[0];
          var _options4 = _refined6[1];
          dispatcher.M(
          /* preinitModuleScript */
          _href11, _options4);
        }

        return;
      }
  }
} // Flow is having trouble refining the HintModels so we help it a bit.
// This should be compiled out in the production build.

function refineModel(code, model) {
  return model;
}

export function preinitModuleForSSR(href, nonce, crossOrigin) {
  ReactDOMSharedInternals.d
  /* ReactDOMCurrentDispatcher */
  .M(
  /* preinitModuleScript */
  href, {
    crossOrigin: getCrossOriginString(crossOrigin),
    nonce: nonce
  });
}
export function preinitScriptForSSR(href, nonce, crossOrigin) {
  ReactDOMSharedInternals.d
  /* ReactDOMCurrentDispatcher */
  .X(
  /* preinitScript */
  href, {
    crossOrigin: getCrossOriginString(crossOrigin),
    nonce: nonce
  });
}