/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { checkHtmlStringCoercion, checkCSSPropertyStringCoercion, checkAttributeStringCoercion, checkOptionStringCoercion } from 'shared/CheckStringCoercion';
import { Children } from 'react';
import { enableFizzExternalRuntime, enableSrcObject, enableFizzBlockingRender, enableViewTransition } from 'shared/ReactFeatureFlags';
import { writeChunk, writeChunkAndReturn, stringToChunk, stringToPrecomputedChunk, readAsDataURL } from 'react-server/src/ReactServerStreamConfig';
import { resolveRequest, getResumableState, getRenderState, flushResources } from 'react-server/src/ReactFizzServer';
import isAttributeNameSafe from '../shared/isAttributeNameSafe';
import isUnitlessNumber from '../shared/isUnitlessNumber';
import getAttributeAlias from '../shared/getAttributeAlias';
import { checkControlledValueProps } from '../shared/ReactControlledValuePropTypes';
import { validateProperties as validateARIAProperties } from '../shared/ReactDOMInvalidARIAHook';
import { validateProperties as validateInputProperties } from '../shared/ReactDOMNullInputValuePropHook';
import { validateProperties as validateUnknownProperties } from '../shared/ReactDOMUnknownPropertyHook';
import warnValidStyle from '../shared/warnValidStyle';
import { getCrossOriginString } from '../shared/crossOriginStrings';
import escapeTextForBrowser from './escapeTextForBrowser';
import hyphenateStyleName from '../shared/hyphenateStyleName';
import hasOwnProperty from 'shared/hasOwnProperty';
import sanitizeURL from '../shared/sanitizeURL';
import isArray from 'shared/isArray';
import { clientRenderBoundary as clientRenderFunction, completeBoundary as completeBoundaryFunction, completeBoundaryUpgradeToViewTransitions as upgradeToViewTransitionsInstruction, completeBoundaryWithStyles as styleInsertionFunction, completeSegment as completeSegmentFunction, formReplaying as formReplayingRuntime, markShellTime } from './fizz-instruction-set/ReactDOMFizzInstructionSetInlineCodeStrings';
import { getValueDescriptorExpectingObjectForWarning } from '../shared/ReactDOMResourceValidation';
import { NotPending } from '../shared/ReactDOMFormActions';
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
}; // We make every property of the descriptor optional because it is not a contract that
// the headers provided by onHeaders has any particular header types.

// Used to distinguish these contexts from ones used in other renderers.
// E.g. this can be used to distinguish legacy renderers from this modern one.
export var isPrimaryRenderer = true;
export var supportsClientAPIs = true;
var ScriptStreamingFormat = 0;
var DataStreamingFormat = 1;
var NothingSent
/*                      */
= 0;
var SentCompleteSegmentFunction
/*      */
= 1;
var SentCompleteBoundaryFunction
/*     */
= 2;
var SentClientRenderFunction
/*         */
= 4;
var SentStyleInsertionFunction
/*       */
= 8;
var SentFormReplayingRuntime
/*         */
= 16;
var SentCompletedShellId
/*             */
= 32;
var SentMarkShellTime
/*                */
= 64;
var NeedUpgradeToViewTransitions
/*     */
= 128;
var SentUpgradeToViewTransitions
/*     */
= 256; // Per request, global state that is not contextual to the rendering subtree.
// This cannot be resumed and therefore should only contain things that are
// temporary working state or are never used in the prerender pass.
// Credentials here are things that affect whether a browser will make a request
// as well as things that affect which connection the browser will use for that request.
// We want these to be aligned across preloads and resources because otherwise the preload
// will be wasted.
// We investigated whether referrerPolicy should be included here but from experimentation
// it seems that browsers do not treat this as part of the http cache key and does not affect
// which connection is used.

var EXISTS = null; // This constant is to mark preloads that have no unique credentials
// to convey. It should never be checked by identity and we should not
// assume Preload values in ResumableState equal this value because they
// will have come from some parsed input.

var PRELOAD_NO_CREDS = [];

if (__DEV__) {
  Object.freeze(PRELOAD_NO_CREDS);
} // Per response, global state that is not contextual to the rendering subtree.
// This is resumable and therefore should be serializable.


var currentlyFlushingRenderState = null;
var dataElementQuotedEnd = stringToPrecomputedChunk('"></template>');
var startInlineScript = stringToPrecomputedChunk('<script');
var endInlineScript = stringToPrecomputedChunk('</script>');
var startScriptSrc = stringToPrecomputedChunk('<script src="');
var startModuleSrc = stringToPrecomputedChunk('<script type="module" src="');
var scriptNonce = stringToPrecomputedChunk(' nonce="');
var scriptIntegirty = stringToPrecomputedChunk(' integrity="');
var scriptCrossOrigin = stringToPrecomputedChunk(' crossorigin="');
var endAsyncScript = stringToPrecomputedChunk(' async=""></script>');
var startInlineStyle = stringToPrecomputedChunk('<style');
/**
 * This escaping function is designed to work with with inline scripts where the entire
 * contents are escaped. Because we know we are escaping the entire script we can avoid for instance
 * escaping html comment string sequences that are valid javascript as well because
 * if there are no sebsequent <script sequences the html parser will never enter
 * script data double escaped state (see: https://www.w3.org/TR/html53/syntax.html#script-data-double-escaped-state)
 *
 * While untrusted script content should be made safe before using this api it will
 * ensure that the script cannot be early terminated or never terminated state
 */

function escapeEntireInlineScriptContent(scriptText) {
  if (__DEV__) {
    checkHtmlStringCoercion(scriptText);
  }

  return ('' + scriptText).replace(scriptRegex, scriptReplacer);
}

var scriptRegex = /(<\/|<)(s)(cript)/gi;

var scriptReplacer = function (match, prefix, s, suffix) {
  return "" + prefix + (s === 's' ? "\\u0073" : "\\u0053") + suffix;
};

var importMapScriptStart = stringToPrecomputedChunk('<script type="importmap">');
var importMapScriptEnd = stringToPrecomputedChunk('</script>'); // Since we store headers as strings we deal with their length in utf16 code units
// rather than visual characters or the utf8 encoding that is used for most binary
// serialization. Some common HTTP servers only allow for headers to be 4kB in length.
// We choose a default length that is likely to be well under this already limited length however
// pathological cases may still cause the utf-8 encoding of the headers to approach this limit.
// It should also be noted that this maximum is a soft maximum. we have not reached the limit we will
// allow one more header to be captured which means in practice if the limit is approached it will be exceeded

var DEFAULT_HEADERS_CAPACITY_IN_UTF16_CODE_UNITS = 2000;
var didWarnForNewBooleanPropsWithEmptyValue;

if (__DEV__) {
  didWarnForNewBooleanPropsWithEmptyValue = {};
} // Allows us to keep track of what we've already written so we can refer back to it.
// if passed externalRuntimeConfig and the enableFizzExternalRuntime feature flag
// is set, the server will send instructions via data attributes (instead of inline scripts)


export function createRenderState(resumableState, nonce, externalRuntimeConfig, importMap, onHeaders, maxHeadersLength) {
  var nonceScript = typeof nonce === 'string' ? nonce : nonce && nonce.script;
  var inlineScriptWithNonce = nonceScript === undefined ? startInlineScript : stringToPrecomputedChunk('<script nonce="' + escapeTextForBrowser(nonceScript) + '"');
  var nonceStyle = typeof nonce === 'string' ? undefined : nonce && nonce.style;
  var inlineStyleWithNonce = nonceStyle === undefined ? startInlineStyle : stringToPrecomputedChunk('<style nonce="' + escapeTextForBrowser(nonceStyle) + '"');
  var idPrefix = resumableState.idPrefix;
  var bootstrapChunks = [];
  var externalRuntimeScript = null;
  var bootstrapScriptContent = resumableState.bootstrapScriptContent,
      bootstrapScripts = resumableState.bootstrapScripts,
      bootstrapModules = resumableState.bootstrapModules;

  if (bootstrapScriptContent !== undefined) {
    bootstrapChunks.push(inlineScriptWithNonce);
    pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
    bootstrapChunks.push(endOfStartTag, stringToChunk(escapeEntireInlineScriptContent(bootstrapScriptContent)), endInlineScript);
  }

  if (enableFizzExternalRuntime) {
    if (externalRuntimeConfig !== undefined) {
      if (typeof externalRuntimeConfig === 'string') {
        externalRuntimeScript = {
          src: externalRuntimeConfig,
          chunks: []
        };
        pushScriptImpl(externalRuntimeScript.chunks, {
          src: externalRuntimeConfig,
          async: true,
          integrity: undefined,
          nonce: nonceScript
        });
      } else {
        externalRuntimeScript = {
          src: externalRuntimeConfig.src,
          chunks: []
        };
        pushScriptImpl(externalRuntimeScript.chunks, {
          src: externalRuntimeConfig.src,
          async: true,
          integrity: externalRuntimeConfig.integrity,
          nonce: nonceScript
        });
      }
    }
  }

  var importMapChunks = [];

  if (importMap !== undefined) {
    var map = importMap;
    importMapChunks.push(importMapScriptStart);
    importMapChunks.push(stringToChunk(escapeEntireInlineScriptContent(JSON.stringify(map))));
    importMapChunks.push(importMapScriptEnd);
  }

  if (__DEV__) {
    if (onHeaders && typeof maxHeadersLength === 'number') {
      if (maxHeadersLength <= 0) {
        console.error('React expected a positive non-zero `maxHeadersLength` option but found %s instead. When using the `onHeaders` option you may supply an optional `maxHeadersLength` option as well however, when setting this value to zero or less no headers will be captured.', maxHeadersLength === 0 ? 'zero' : maxHeadersLength);
      }
    }
  }

  var headers = onHeaders ? {
    preconnects: '',
    fontPreloads: '',
    highImagePreloads: '',
    remainingCapacity: // We seed the remainingCapacity with 2 extra bytes because when we decrement the capacity
    // we always assume we are inserting an interstitial ", " however the first header does not actually
    // consume these two extra bytes.
    2 + (typeof maxHeadersLength === 'number' ? maxHeadersLength : DEFAULT_HEADERS_CAPACITY_IN_UTF16_CODE_UNITS)
  } : null;
  var renderState = {
    placeholderPrefix: stringToPrecomputedChunk(idPrefix + 'P:'),
    segmentPrefix: stringToPrecomputedChunk(idPrefix + 'S:'),
    boundaryPrefix: stringToPrecomputedChunk(idPrefix + 'B:'),
    startInlineScript: inlineScriptWithNonce,
    startInlineStyle: inlineStyleWithNonce,
    preamble: createPreambleState(),
    externalRuntimeScript: externalRuntimeScript,
    bootstrapChunks: bootstrapChunks,
    importMapChunks: importMapChunks,
    onHeaders: onHeaders,
    headers: headers,
    resets: {
      font: {},
      dns: {},
      connect: {
        default: {},
        anonymous: {},
        credentials: {}
      },
      image: {},
      style: {}
    },
    charsetChunks: [],
    viewportChunks: [],
    hoistableChunks: [],
    // cleared on flush
    preconnects: new Set(),
    fontPreloads: new Set(),
    highImagePreloads: new Set(),
    // usedImagePreloads: new Set(),
    styles: new Map(),
    bootstrapScripts: new Set(),
    scripts: new Set(),
    bulkPreloads: new Set(),
    preloads: {
      images: new Map(),
      stylesheets: new Map(),
      scripts: new Map(),
      moduleScripts: new Map()
    },
    nonce: {
      script: nonceScript,
      style: nonceStyle
    },
    // like a module global for currently rendering boundary
    hoistableState: null,
    stylesToHoist: false
  };

  if (bootstrapScripts !== undefined) {
    for (var i = 0; i < bootstrapScripts.length; i++) {
      var scriptConfig = bootstrapScripts[i];
      var src = void 0,
          crossOrigin = void 0,
          integrity = void 0;
      var props = {
        rel: 'preload',
        as: 'script',
        fetchPriority: 'low',
        nonce: nonce
      };

      if (typeof scriptConfig === 'string') {
        props.href = src = scriptConfig;
      } else {
        props.href = src = scriptConfig.src;
        props.integrity = integrity = typeof scriptConfig.integrity === 'string' ? scriptConfig.integrity : undefined;
        props.crossOrigin = crossOrigin = typeof scriptConfig === 'string' || scriptConfig.crossOrigin == null ? undefined : scriptConfig.crossOrigin === 'use-credentials' ? 'use-credentials' : '';
      }

      preloadBootstrapScriptOrModule(resumableState, renderState, src, props);
      bootstrapChunks.push(startScriptSrc, stringToChunk(escapeTextForBrowser(src)), attributeEnd);

      if (nonceScript) {
        bootstrapChunks.push(scriptNonce, stringToChunk(escapeTextForBrowser(nonceScript)), attributeEnd);
      }

      if (typeof integrity === 'string') {
        bootstrapChunks.push(scriptIntegirty, stringToChunk(escapeTextForBrowser(integrity)), attributeEnd);
      }

      if (typeof crossOrigin === 'string') {
        bootstrapChunks.push(scriptCrossOrigin, stringToChunk(escapeTextForBrowser(crossOrigin)), attributeEnd);
      }

      pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
      bootstrapChunks.push(endAsyncScript);
    }
  }

  if (bootstrapModules !== undefined) {
    for (var _i = 0; _i < bootstrapModules.length; _i++) {
      var _scriptConfig = bootstrapModules[_i];

      var _src = void 0,
          _crossOrigin = void 0,
          _integrity = void 0;

      var _props = {
        rel: 'modulepreload',
        fetchPriority: 'low',
        nonce: nonceScript
      };

      if (typeof _scriptConfig === 'string') {
        _props.href = _src = _scriptConfig;
      } else {
        _props.href = _src = _scriptConfig.src;
        _props.integrity = _integrity = typeof _scriptConfig.integrity === 'string' ? _scriptConfig.integrity : undefined;
        _props.crossOrigin = _crossOrigin = typeof _scriptConfig === 'string' || _scriptConfig.crossOrigin == null ? undefined : _scriptConfig.crossOrigin === 'use-credentials' ? 'use-credentials' : '';
      }

      preloadBootstrapScriptOrModule(resumableState, renderState, _src, _props);
      bootstrapChunks.push(startModuleSrc, stringToChunk(escapeTextForBrowser(_src)), attributeEnd);

      if (nonceScript) {
        bootstrapChunks.push(scriptNonce, stringToChunk(escapeTextForBrowser(nonceScript)), attributeEnd);
      }

      if (typeof _integrity === 'string') {
        bootstrapChunks.push(scriptIntegirty, stringToChunk(escapeTextForBrowser(_integrity)), attributeEnd);
      }

      if (typeof _crossOrigin === 'string') {
        bootstrapChunks.push(scriptCrossOrigin, stringToChunk(escapeTextForBrowser(_crossOrigin)), attributeEnd);
      }

      pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
      bootstrapChunks.push(endAsyncScript);
    }
  }

  return renderState;
}
export function resumeRenderState(resumableState, nonce) {
  return createRenderState(resumableState, nonce, undefined, undefined, undefined, undefined);
}
export function createResumableState(identifierPrefix, externalRuntimeConfig, bootstrapScriptContent, bootstrapScripts, bootstrapModules) {
  var idPrefix = identifierPrefix === undefined ? '' : identifierPrefix;
  var streamingFormat = ScriptStreamingFormat;

  if (enableFizzExternalRuntime) {
    if (externalRuntimeConfig !== undefined) {
      streamingFormat = DataStreamingFormat;
    }
  }

  return {
    idPrefix: idPrefix,
    nextFormID: 0,
    streamingFormat: streamingFormat,
    bootstrapScriptContent: bootstrapScriptContent,
    bootstrapScripts: bootstrapScripts,
    bootstrapModules: bootstrapModules,
    instructions: NothingSent,
    hasBody: false,
    hasHtml: false,
    // @TODO add bootstrap script to implicit preloads
    // persistent
    unknownResources: {},
    dnsResources: {},
    connectResources: {
      default: {},
      anonymous: {},
      credentials: {}
    },
    imageResources: {},
    styleResources: {},
    scriptResources: {},
    moduleUnknownResources: {},
    moduleScriptResources: {}
  };
}
export function resetResumableState(resumableState, renderState) {
  // Resets the resumable state based on what didn't manage to fully flush in the render state.
  // This currently assumes nothing was flushed.
  resumableState.nextFormID = 0;
  resumableState.hasBody = false;
  resumableState.hasHtml = false;
  resumableState.unknownResources = {
    font: renderState.resets.font
  };
  resumableState.dnsResources = renderState.resets.dns;
  resumableState.connectResources = renderState.resets.connect;
  resumableState.imageResources = renderState.resets.image;
  resumableState.styleResources = renderState.resets.style;
  resumableState.scriptResources = {};
  resumableState.moduleUnknownResources = {};
  resumableState.moduleScriptResources = {};
  resumableState.instructions = NothingSent; // Nothing was flushed so no instructions could've flushed.
}
export function completeResumableState(resumableState) {
  // This function is called when we have completed a prerender and there is a shell.
  resumableState.bootstrapScriptContent = undefined;
  resumableState.bootstrapScripts = undefined;
  resumableState.bootstrapModules = undefined;
}
export function createPreambleState() {
  return {
    htmlChunks: null,
    headChunks: null,
    bodyChunks: null
  };
} // Constants for the insertion mode we're currently writing in. We don't encode all HTML5 insertion
// modes. We only include the variants as they matter for the sake of our purposes.
// We don't actually provide the namespace therefore we use constants instead of the string.

export var ROOT_HTML_MODE = 0; // Used for the root most element tag.
// We have a less than HTML_HTML_MODE check elsewhere. If you add more cases here, make sure it
// still makes sense

var HTML_HTML_MODE = 1; // Used for the <html> if it is at the top level.

var HTML_MODE = 2;
var HTML_HEAD_MODE = 3;
var SVG_MODE = 4;
var MATHML_MODE = 5;
var HTML_TABLE_MODE = 6;
var HTML_TABLE_BODY_MODE = 7;
var HTML_TABLE_ROW_MODE = 8;
var HTML_COLGROUP_MODE = 9; // We have a greater than HTML_TABLE_MODE check elsewhere. If you add more cases here, make sure it
// still makes sense

var NO_SCOPE =
/*         */
0;
var NOSCRIPT_SCOPE =
/*   */
1;
var PICTURE_SCOPE =
/*    */
2;
var FALLBACK_SCOPE =
/*   */
4;
var EXIT_SCOPE =
/*       */
8; // A direct Instance below a Suspense fallback is the only thing that can "exit"

var ENTER_SCOPE =
/*      */
16; // A direct Instance below Suspense content is the only thing that can "enter"

var UPDATE_SCOPE =
/*     */
32; // Inside a scope that applies "update" ViewTransitions if anything mutates here.
// Everything not listed here are tracked for the whole subtree as opposed to just
// until the next Instance.

var SUBTREE_SCOPE = ~(ENTER_SCOPE | EXIT_SCOPE); // Lets us keep track of contextual state and pick it back up after suspending.

function createFormatContext(insertionMode, selectedValue, tagScope, viewTransition) {
  return {
    insertionMode: insertionMode,
    selectedValue: selectedValue,
    tagScope: tagScope,
    viewTransition: viewTransition
  };
}

export function canHavePreamble(formatContext) {
  return formatContext.insertionMode < HTML_MODE;
}
export function createRootFormatContext(namespaceURI) {
  var insertionMode = namespaceURI === 'http://www.w3.org/2000/svg' ? SVG_MODE : namespaceURI === 'http://www.w3.org/1998/Math/MathML' ? MATHML_MODE : ROOT_HTML_MODE;
  return createFormatContext(insertionMode, null, NO_SCOPE, null);
}
export function getChildFormatContext(parentContext, type, props) {
  var subtreeScope = parentContext.tagScope & SUBTREE_SCOPE;

  switch (type) {
    case 'noscript':
      return createFormatContext(HTML_MODE, null, subtreeScope | NOSCRIPT_SCOPE, null);

    case 'select':
      return createFormatContext(HTML_MODE, props.value != null ? props.value : props.defaultValue, subtreeScope, null);

    case 'svg':
      return createFormatContext(SVG_MODE, null, subtreeScope, null);

    case 'picture':
      return createFormatContext(HTML_MODE, null, subtreeScope | PICTURE_SCOPE, null);

    case 'math':
      return createFormatContext(MATHML_MODE, null, subtreeScope, null);

    case 'foreignObject':
      return createFormatContext(HTML_MODE, null, subtreeScope, null);
    // Table parents are special in that their children can only be created at all if they're
    // wrapped in a table parent. So we need to encode that we're entering this mode.

    case 'table':
      return createFormatContext(HTML_TABLE_MODE, null, subtreeScope, null);

    case 'thead':
    case 'tbody':
    case 'tfoot':
      return createFormatContext(HTML_TABLE_BODY_MODE, null, subtreeScope, null);

    case 'colgroup':
      return createFormatContext(HTML_COLGROUP_MODE, null, subtreeScope, null);

    case 'tr':
      return createFormatContext(HTML_TABLE_ROW_MODE, null, subtreeScope, null);

    case 'head':
      if (parentContext.insertionMode < HTML_MODE) {
        // We are either at the root or inside the <html> tag and can enter
        // the <head> scope
        return createFormatContext(HTML_HEAD_MODE, null, subtreeScope, null);
      }

      break;

    case 'html':
      if (parentContext.insertionMode === ROOT_HTML_MODE) {
        return createFormatContext(HTML_HTML_MODE, null, subtreeScope, null);
      }

      break;
  }

  if (parentContext.insertionMode >= HTML_TABLE_MODE) {
    // Whatever tag this was, it wasn't a table parent or other special parent, so we must have
    // entered plain HTML again.
    return createFormatContext(HTML_MODE, null, subtreeScope, null);
  }

  if (parentContext.insertionMode < HTML_MODE) {
    return createFormatContext(HTML_MODE, null, subtreeScope, null);
  }

  if (enableViewTransition) {
    if (parentContext.viewTransition !== null) {
      // If we're inside a view transition, regardless what element we were in, it consumes
      // the view transition context.
      return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, subtreeScope, null);
    }
  }

  if (parentContext.tagScope !== subtreeScope) {
    return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, subtreeScope, null);
  }

  return parentContext;
}

function getSuspenseViewTransition(parentViewTransition) {
  if (parentViewTransition === null) {
    return null;
  } // If a ViewTransition wraps a Suspense boundary it applies to the children Instances
  // in both the fallback and the content.
  // Since we only have a representation of ViewTransitions on the Instances themselves
  // we cannot model the parent ViewTransition activating "enter", "exit" or "share"
  // since those would be ambiguous with the Suspense boundary changing states and
  // affecting the same Instances.
  // We also can't model an "update" when that update is fallback nodes swapping for
  // content nodes. However, we can model is as a "share" from the fallback nodes to
  // the content nodes using the same name. We just have to assign the same name that
  // we would've used (the parent ViewTransition name or auto-assign one).


  var viewTransition = {
    update: parentViewTransition.update,
    // For deep updates.
    enter: 'none',
    exit: 'none',
    share: parentViewTransition.update,
    // For exit or enter of reveals.
    name: parentViewTransition.autoName,
    autoName: parentViewTransition.autoName,
    // TOOD: If we have more than just this Suspense boundary as a child of the ViewTransition
    // then the parent needs to isolate the names so that they don't conflict.
    nameIdx: 0
  };
  return viewTransition;
}

export function getSuspenseFallbackFormatContext(resumableState, parentContext) {
  if (parentContext.tagScope & UPDATE_SCOPE) {
    // If we're rendering a Suspense in fallback mode and that is inside a ViewTransition,
    // which hasn't disabled updates, then revealing it might animate the parent so we need
    // the ViewTransition instructions.
    resumableState.instructions |= NeedUpgradeToViewTransitions;
  }

  return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, parentContext.tagScope | FALLBACK_SCOPE | EXIT_SCOPE, getSuspenseViewTransition(parentContext.viewTransition));
}
export function getSuspenseContentFormatContext(resumableState, parentContext) {
  return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, parentContext.tagScope | ENTER_SCOPE, getSuspenseViewTransition(parentContext.viewTransition));
}
export function getViewTransitionFormatContext(resumableState, parentContext, update, enter, exit, share, name, autoName // name or an autogenerated unique name
) {
  // We're entering a <ViewTransition>. Normalize props.
  if (update == null) {
    update = 'auto';
  }

  if (enter == null) {
    enter = 'auto';
  }

  if (exit == null) {
    exit = 'auto';
  }

  if (name == null) {
    var parentViewTransition = parentContext.viewTransition;

    if (parentViewTransition !== null) {
      // If we have multiple nested ViewTransition and the parent has a "share"
      // but the child doesn't, then the parent ViewTransition can still activate
      // a share scenario so we reuse the name and share from the parent.
      name = parentViewTransition.name;
      share = parentViewTransition.share;
    } else {
      name = 'auto';
      share = 'none'; // share is only relevant if there's an explicit name
    }
  } else {
    if (share == null) {
      share = 'auto';
    }

    if (parentContext.tagScope & FALLBACK_SCOPE) {
      // If we have an explicit name and share is not disabled, and we're inside
      // a fallback, then that fallback might pair with content and so we might need
      // the ViewTransition instructions to animate between them.
      resumableState.instructions |= NeedUpgradeToViewTransitions;
    }
  }

  if (!(parentContext.tagScope & EXIT_SCOPE)) {
    exit = 'none'; // exit is only relevant for the first ViewTransition inside fallback
  } else {
    resumableState.instructions |= NeedUpgradeToViewTransitions;
  }

  if (!(parentContext.tagScope & ENTER_SCOPE)) {
    enter = 'none'; // enter is only relevant for the first ViewTransition inside content
  } else {
    resumableState.instructions |= NeedUpgradeToViewTransitions;
  }

  var viewTransition = {
    update: update,
    enter: enter,
    exit: exit,
    share: share,
    name: name,
    autoName: autoName,
    nameIdx: 0
  };
  var subtreeScope = parentContext.tagScope & SUBTREE_SCOPE;

  if (update !== 'none') {
    subtreeScope |= UPDATE_SCOPE;
  } else {
    subtreeScope &= ~UPDATE_SCOPE;
  }

  return createFormatContext(parentContext.insertionMode, parentContext.selectedValue, subtreeScope, viewTransition);
}
export function isPreambleContext(formatContext) {
  return formatContext.insertionMode === HTML_HEAD_MODE;
}
export function makeId(resumableState, treeId, localId) {
  var idPrefix = resumableState.idPrefix;
  var id = "\xAB" + idPrefix + 'R' + treeId; // Unless this is the first id at this level, append a number at the end
  // that represents the position of this useId hook among all the useId
  // hooks for this fiber.

  if (localId > 0) {
    id += 'H' + localId.toString(32);
  }

  return id + "\xBB";
}

function encodeHTMLTextNode(text) {
  return escapeTextForBrowser(text);
}

var textSeparator = stringToPrecomputedChunk('<!-- -->');
export function pushTextInstance(target, text, renderState, textEmbedded) {
  if (text === '') {
    // Empty text doesn't have a DOM node representation and the hydration is aware of this.
    return textEmbedded;
  }

  if (textEmbedded) {
    target.push(textSeparator);
  }

  target.push(stringToChunk(encodeHTMLTextNode(text)));
  return true;
} // Called when Fizz is done with a Segment. Currently the only purpose is to conditionally
// emit a text separator when we don't know for sure it is safe to omit

export function pushSegmentFinale(target, renderState, lastPushedText, textEmbedded) {
  if (lastPushedText && textEmbedded) {
    target.push(textSeparator);
  }
}

function pushViewTransitionAttributes(target, formatContext) {
  if (!enableViewTransition) {
    return;
  }

  var viewTransition = formatContext.viewTransition;

  if (viewTransition === null) {
    return;
  }

  if (viewTransition.name !== 'auto') {
    pushStringAttribute(target, 'vt-name', viewTransition.nameIdx === 0 ? viewTransition.name : viewTransition.name + '_' + viewTransition.nameIdx); // Increment the index in case we have multiple children to the same ViewTransition.
    // Because this is a side-effect in render, we should ideally call pushViewTransitionAttributes
    // after we've suspended (like forms do), so that we don't increment each attempt.
    // TODO: Make this deterministic.

    viewTransition.nameIdx++;
  }

  pushStringAttribute(target, 'vt-update', viewTransition.update);

  if (viewTransition.enter !== 'none') {
    pushStringAttribute(target, 'vt-enter', viewTransition.enter);
  }

  if (viewTransition.exit !== 'none') {
    pushStringAttribute(target, 'vt-exit', viewTransition.exit);
  }

  if (viewTransition.share !== 'none') {
    pushStringAttribute(target, 'vt-share', viewTransition.share);
  }
}

var styleNameCache = new Map();

function processStyleName(styleName) {
  var chunk = styleNameCache.get(styleName);

  if (chunk !== undefined) {
    return chunk;
  }

  var result = stringToPrecomputedChunk(escapeTextForBrowser(hyphenateStyleName(styleName)));
  styleNameCache.set(styleName, result);
  return result;
}

var styleAttributeStart = stringToPrecomputedChunk(' style="');
var styleAssign = stringToPrecomputedChunk(':');
var styleSeparator = stringToPrecomputedChunk(';');

function pushStyleAttribute(target, style) {
  if (typeof style !== 'object') {
    throw new Error('The `style` prop expects a mapping from style properties to values, ' + "not a string. For example, style={{marginRight: spacing + 'em'}} when " + 'using JSX.');
  }

  var isFirst = true;

  for (var styleName in style) {
    if (!hasOwnProperty.call(style, styleName)) {
      continue;
    } // If you provide unsafe user data here they can inject arbitrary CSS
    // which may be problematic (I couldn't repro this):
    // https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
    // http://www.thespanner.co.uk/2007/11/26/ultimate-xss-css-injection/
    // This is not an XSS hole but instead a potential CSS injection issue
    // which has lead to a greater discussion about how we're going to
    // trust URLs moving forward. See #2115901


    var styleValue = style[styleName];

    if (styleValue == null || typeof styleValue === 'boolean' || styleValue === '') {
      // TODO: We used to set empty string as a style with an empty value. Does that ever make sense?
      continue;
    }

    var nameChunk = void 0;
    var valueChunk = void 0;
    var isCustomProperty = styleName.indexOf('--') === 0;

    if (isCustomProperty) {
      nameChunk = stringToChunk(escapeTextForBrowser(styleName));

      if (__DEV__) {
        checkCSSPropertyStringCoercion(styleValue, styleName);
      }

      valueChunk = stringToChunk(escapeTextForBrowser(('' + styleValue).trim()));
    } else {
      if (__DEV__) {
        warnValidStyle(styleName, styleValue);
      }

      nameChunk = processStyleName(styleName);

      if (typeof styleValue === 'number') {
        if (styleValue !== 0 && !isUnitlessNumber(styleName)) {
          valueChunk = stringToChunk(styleValue + 'px'); // Presumes implicit 'px' suffix for unitless numbers
        } else {
          valueChunk = stringToChunk('' + styleValue);
        }
      } else {
        if (__DEV__) {
          checkCSSPropertyStringCoercion(styleValue, styleName);
        }

        valueChunk = stringToChunk(escapeTextForBrowser(('' + styleValue).trim()));
      }
    }

    if (isFirst) {
      isFirst = false; // If it's first, we don't need any separators prefixed.

      target.push(styleAttributeStart, nameChunk, styleAssign, valueChunk);
    } else {
      target.push(styleSeparator, nameChunk, styleAssign, valueChunk);
    }
  }

  if (!isFirst) {
    target.push(attributeEnd);
  }
}

var attributeSeparator = stringToPrecomputedChunk(' ');
var attributeAssign = stringToPrecomputedChunk('="');
var attributeEnd = stringToPrecomputedChunk('"');
var attributeEmptyString = stringToPrecomputedChunk('=""');

function pushBooleanAttribute(target, name, value // not null or undefined
) {
  if (value && typeof value !== 'function' && typeof value !== 'symbol') {
    target.push(attributeSeparator, stringToChunk(name), attributeEmptyString);
  }
}

function pushStringAttribute(target, name, value // not null or undefined
) {
  if (typeof value !== 'function' && typeof value !== 'symbol' && typeof value !== 'boolean') {
    target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
  }
}

function makeFormFieldPrefix(resumableState) {
  // TODO: Make this deterministic.
  var id = resumableState.nextFormID++;
  return resumableState.idPrefix + id;
} // Since this will likely be repeated a lot in the HTML, we use a more concise message
// than on the client and hopefully it's googleable.


var actionJavaScriptURL = stringToPrecomputedChunk(escapeTextForBrowser( // eslint-disable-next-line no-script-url
"javascript:throw new Error('React form unexpectedly submitted.')"));
var startHiddenInputChunk = stringToPrecomputedChunk('<input type="hidden"');

function pushAdditionalFormField(this, value, key) {
  var target = this;
  target.push(startHiddenInputChunk);
  validateAdditionalFormField(value, key);
  pushStringAttribute(target, 'name', key);
  pushStringAttribute(target, 'value', value);
  target.push(endOfStartTagSelfClosing);
}

function pushAdditionalFormFields(target, formData) {
  if (formData != null) {
    // $FlowFixMe[prop-missing]: FormData has forEach.
    formData.forEach(pushAdditionalFormField, target);
  }
}

function validateAdditionalFormField(value, key) {
  if (typeof value !== 'string') {
    throw new Error('File/Blob fields are not yet supported in progressive forms. ' + 'Will fallback to client hydration.');
  }
}

function validateAdditionalFormFields(formData) {
  if (formData != null) {
    // $FlowFixMe[prop-missing]: FormData has forEach.
    formData.forEach(validateAdditionalFormField);
  }

  return formData;
}

function getCustomFormFields(resumableState, formAction) {
  var customAction = formAction.$$FORM_ACTION;

  if (typeof customAction === 'function') {
    var prefix = makeFormFieldPrefix(resumableState);

    try {
      var customFields = formAction.$$FORM_ACTION(prefix);

      if (customFields) {
        validateAdditionalFormFields(customFields.data);
      }

      return customFields;
    } catch (x) {
      if (typeof x === 'object' && x !== null && typeof x.then === 'function') {
        // Rethrow suspense.
        throw x;
      } // If we fail to encode the form action for progressive enhancement for some reason,
      // fallback to trying replaying on the client instead of failing the page. It might
      // work there.


      if (__DEV__) {
        // TODO: Should this be some kind of recoverable error?
        console.error('Failed to serialize an action for progressive enhancement:\n%s', x);
      }
    }
  }

  return null;
}

function pushFormActionAttribute(target, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name) {
  var formData = null;

  if (typeof formAction === 'function') {
    // Function form actions cannot control the form properties
    if (__DEV__) {
      if (name !== null && !didWarnFormActionName) {
        didWarnFormActionName = true;
        console.error('Cannot specify a "name" prop for a button that specifies a function as a formAction. ' + 'React needs it to encode which action should be invoked. It will get overridden.');
      }

      if ((formEncType !== null || formMethod !== null) && !didWarnFormActionMethod) {
        didWarnFormActionMethod = true;
        console.error('Cannot specify a formEncType or formMethod for a button that specifies a ' + 'function as a formAction. React provides those automatically. They will get overridden.');
      }

      if (formTarget !== null && !didWarnFormActionTarget) {
        didWarnFormActionTarget = true;
        console.error('Cannot specify a formTarget for a button that specifies a function as a formAction. ' + 'The function will always be executed in the same window.');
      }
    }

    var customFields = getCustomFormFields(resumableState, formAction);

    if (customFields !== null) {
      // This action has a custom progressive enhancement form that can submit the form
      // back to the server if it's invoked before hydration. Such as a Server Action.
      name = customFields.name;
      formAction = customFields.action || '';
      formEncType = customFields.encType;
      formMethod = customFields.method;
      formTarget = customFields.target;
      formData = customFields.data;
    } else {
      // Set a javascript URL that doesn't do anything. We don't expect this to be invoked
      // because we'll preventDefault in the Fizz runtime, but it can happen if a form is
      // manually submitted or if someone calls stopPropagation before React gets the event.
      // If CSP is used to block javascript: URLs that's fine too. It just won't show this
      // error message but the URL will be logged.
      target.push(attributeSeparator, stringToChunk('formAction'), attributeAssign, actionJavaScriptURL, attributeEnd);
      name = null;
      formAction = null;
      formEncType = null;
      formMethod = null;
      formTarget = null;
      injectFormReplayingRuntime(resumableState, renderState);
    }
  }

  if (name != null) {
    pushAttribute(target, 'name', name);
  }

  if (formAction != null) {
    pushAttribute(target, 'formAction', formAction);
  }

  if (formEncType != null) {
    pushAttribute(target, 'formEncType', formEncType);
  }

  if (formMethod != null) {
    pushAttribute(target, 'formMethod', formMethod);
  }

  if (formTarget != null) {
    pushAttribute(target, 'formTarget', formTarget);
  }

  return formData;
}

var blobCache = null;

function pushSrcObjectAttribute(target, blob) {
  // Throwing a Promise style suspense read of the Blob content.
  if (blobCache === null) {
    blobCache = new WeakMap();
  }

  var suspenseCache = blobCache;
  var thenable = suspenseCache.get(blob);

  if (thenable === undefined) {
    thenable = readAsDataURL(blob);
    thenable.then(function (result) {
      thenable.status = 'fulfilled';
      thenable.value = result;
    }, function (error) {
      thenable.status = 'rejected';
      thenable.reason = error;
    });
    suspenseCache.set(blob, thenable);
  }

  if (thenable.status === 'rejected') {
    throw thenable.reason;
  } else if (thenable.status !== 'fulfilled') {
    throw thenable;
  }

  var url = thenable.value;
  target.push(attributeSeparator, stringToChunk('src'), attributeAssign, stringToChunk(escapeTextForBrowser(url)), attributeEnd);
}

function pushAttribute(target, name, value // not null or undefined
) {
  switch (name) {
    // These are very common props and therefore are in the beginning of the switch.
    // TODO: aria-label is a very common prop but allows booleans so is not like the others
    // but should ideally go in this list too.
    case 'className':
      {
        pushStringAttribute(target, 'class', value);
        break;
      }

    case 'tabIndex':
      {
        pushStringAttribute(target, 'tabindex', value);
        break;
      }

    case 'dir':
    case 'role':
    case 'viewBox':
    case 'width':
    case 'height':
      {
        pushStringAttribute(target, name, value);
        break;
      }

    case 'style':
      {
        pushStyleAttribute(target, value);
        return;
      }

    case 'src':
      {
        if (enableSrcObject && typeof value === 'object' && value !== null) {
          if (typeof Blob === 'function' && value instanceof Blob) {
            pushSrcObjectAttribute(target, value);
            return;
          }
        } // Fallthrough to general urls

      }

    case 'href':
      {
        if (value === '') {
          if (__DEV__) {
            if (name === 'src') {
              console.error('An empty string ("") was passed to the %s attribute. ' + 'This may cause the browser to download the whole page again over the network. ' + 'To fix this, either do not render the element at all ' + 'or pass null to %s instead of an empty string.', name, name);
            } else {
              console.error('An empty string ("") was passed to the %s attribute. ' + 'To fix this, either do not render the element at all ' + 'or pass null to %s instead of an empty string.', name, name);
            }
          }

          return;
        }
      }
    // Fall through to the last case which shouldn't remove empty strings.

    case 'action':
    case 'formAction':
      {
        // TODO: Consider only special casing these for each tag.
        if (value == null || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'boolean') {
          return;
        }

        if (__DEV__) {
          checkAttributeStringCoercion(value, name);
        }

        var sanitizedValue = sanitizeURL('' + value);
        target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(sanitizedValue)), attributeEnd);
        return;
      }

    case 'defaultValue':
    case 'defaultChecked': // These shouldn't be set as attributes on generic HTML elements.

    case 'innerHTML': // Must use dangerouslySetInnerHTML instead.

    case 'suppressContentEditableWarning':
    case 'suppressHydrationWarning':
    case 'ref':
      // Ignored. These are built-in to React on the client.
      return;

    case 'autoFocus':
    case 'multiple':
    case 'muted':
      {
        pushBooleanAttribute(target, name.toLowerCase(), value);
        return;
      }

    case 'xlinkHref':
      {
        if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'boolean') {
          return;
        }

        if (__DEV__) {
          checkAttributeStringCoercion(value, name);
        }

        var _sanitizedValue = sanitizeURL('' + value);

        target.push(attributeSeparator, stringToChunk('xlink:href'), attributeAssign, stringToChunk(escapeTextForBrowser(_sanitizedValue)), attributeEnd);
        return;
      }

    case 'contentEditable':
    case 'spellCheck':
    case 'draggable':
    case 'value':
    case 'autoReverse':
    case 'externalResourcesRequired':
    case 'focusable':
    case 'preserveAlpha':
      {
        // Booleanish String
        // These are "enumerated" attributes that accept "true" and "false".
        // In React, we let users pass `true` and `false` even though technically
        // these aren't boolean attributes (they are coerced to strings).
        if (typeof value !== 'function' && typeof value !== 'symbol') {
          target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
        }

        return;
      }

    case 'inert':
      {
        if (__DEV__) {
          if (value === '' && !didWarnForNewBooleanPropsWithEmptyValue[name]) {
            didWarnForNewBooleanPropsWithEmptyValue[name] = true;
            console.error('Received an empty string for a boolean attribute `%s`. ' + 'This will treat the attribute as if it were false. ' + 'Either pass `false` to silence this warning, or ' + 'pass `true` if you used an empty string in earlier versions of React to indicate this attribute is true.', name);
          }
        }
      }
    // Fallthrough for boolean props that don't have a warning for empty strings.

    case 'allowFullScreen':
    case 'async':
    case 'autoPlay':
    case 'controls':
    case 'default':
    case 'defer':
    case 'disabled':
    case 'disablePictureInPicture':
    case 'disableRemotePlayback':
    case 'formNoValidate':
    case 'hidden':
    case 'loop':
    case 'noModule':
    case 'noValidate':
    case 'open':
    case 'playsInline':
    case 'readOnly':
    case 'required':
    case 'reversed':
    case 'scoped':
    case 'seamless':
    case 'itemScope':
      {
        // Boolean
        if (value && typeof value !== 'function' && typeof value !== 'symbol') {
          target.push(attributeSeparator, stringToChunk(name), attributeEmptyString);
        }

        return;
      }

    case 'capture':
    case 'download':
      {
        // Overloaded Boolean
        if (value === true) {
          target.push(attributeSeparator, stringToChunk(name), attributeEmptyString);
        } else if (value === false) {// Ignored
        } else if (typeof value !== 'function' && typeof value !== 'symbol') {
          target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
        }

        return;
      }

    case 'cols':
    case 'rows':
    case 'size':
    case 'span':
      {
        // These are HTML attributes that must be positive numbers.
        if (typeof value !== 'function' && typeof value !== 'symbol' && !isNaN(value) && value >= 1) {
          target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
        }

        return;
      }

    case 'rowSpan':
    case 'start':
      {
        // These are HTML attributes that must be numbers.
        if (typeof value !== 'function' && typeof value !== 'symbol' && !isNaN(value)) {
          target.push(attributeSeparator, stringToChunk(name), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
        }

        return;
      }

    case 'xlinkActuate':
      pushStringAttribute(target, 'xlink:actuate', value);
      return;

    case 'xlinkArcrole':
      pushStringAttribute(target, 'xlink:arcrole', value);
      return;

    case 'xlinkRole':
      pushStringAttribute(target, 'xlink:role', value);
      return;

    case 'xlinkShow':
      pushStringAttribute(target, 'xlink:show', value);
      return;

    case 'xlinkTitle':
      pushStringAttribute(target, 'xlink:title', value);
      return;

    case 'xlinkType':
      pushStringAttribute(target, 'xlink:type', value);
      return;

    case 'xmlBase':
      pushStringAttribute(target, 'xml:base', value);
      return;

    case 'xmlLang':
      pushStringAttribute(target, 'xml:lang', value);
      return;

    case 'xmlSpace':
      pushStringAttribute(target, 'xml:space', value);
      return;

    default:
      if ( // shouldIgnoreAttribute
      // We have already filtered out null/undefined and reserved words.
      name.length > 2 && (name[0] === 'o' || name[0] === 'O') && (name[1] === 'n' || name[1] === 'N')) {
        return;
      }

      var attributeName = getAttributeAlias(name);

      if (isAttributeNameSafe(attributeName)) {
        // shouldRemoveAttribute
        switch (typeof value) {
          case 'function':
          case 'symbol':
            return;

          case 'boolean':
            {
              var prefix = attributeName.toLowerCase().slice(0, 5);

              if (prefix !== 'data-' && prefix !== 'aria-') {
                return;
              }
            }
        }

        target.push(attributeSeparator, stringToChunk(attributeName), attributeAssign, stringToChunk(escapeTextForBrowser(value)), attributeEnd);
      }

  }
}

var endOfStartTag = stringToPrecomputedChunk('>');
var endOfStartTagSelfClosing = stringToPrecomputedChunk('/>');

function pushInnerHTML(target, innerHTML, children) {
  if (innerHTML != null) {
    if (children != null) {
      throw new Error('Can only set one of `children` or `props.dangerouslySetInnerHTML`.');
    }

    if (typeof innerHTML !== 'object' || !('__html' in innerHTML)) {
      throw new Error('`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' + 'Please visit https://react.dev/link/dangerously-set-inner-html ' + 'for more information.');
    }

    var html = innerHTML.__html;

    if (html !== null && html !== undefined) {
      if (__DEV__) {
        checkHtmlStringCoercion(html);
      }

      target.push(stringToChunk('' + html));
    }
  }
} // TODO: Move these to RenderState so that we warn for every request.
// It would help debugging in stateful servers (e.g. service worker).


var didWarnDefaultInputValue = false;
var didWarnDefaultChecked = false;
var didWarnDefaultSelectValue = false;
var didWarnDefaultTextareaValue = false;
var didWarnInvalidOptionChildren = false;
var didWarnInvalidOptionInnerHTML = false;
var didWarnSelectedSetOnOption = false;
var didWarnFormActionType = false;
var didWarnFormActionName = false;
var didWarnFormActionTarget = false;
var didWarnFormActionMethod = false;

function checkSelectProp(props, propName) {
  if (__DEV__) {
    var value = props[propName];

    if (value != null) {
      var array = isArray(value);

      if (props.multiple && !array) {
        console.error('The `%s` prop supplied to <select> must be an array if ' + '`multiple` is true.', propName);
      } else if (!props.multiple && array) {
        console.error('The `%s` prop supplied to <select> must be a scalar ' + 'value if `multiple` is false.', propName);
      }
    }
  }
}

function pushStartAnchor(target, props, formatContext) {
  target.push(startChunkForTag('a'));
  var children = null;
  var innerHTML = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;

        case 'href':
          if (propValue === '') {
            // Empty `href` is special on anchors so we're short-circuiting here.
            // On other tags it should trigger a warning
            pushStringAttribute(target, 'href', '');
          } else {
            pushAttribute(target, propKey, propValue);
          }

          break;

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);

  if (typeof children === 'string') {
    // Special case children as a string to avoid the unnecessary comment.
    // TODO: Remove this special case after the general optimization is in place.
    target.push(stringToChunk(encodeHTMLTextNode(children)));
    return null;
  }

  return children;
}

function pushStartObject(target, props, formatContext) {
  target.push(startChunkForTag('object'));
  var children = null;
  var innerHTML = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;

        case 'data':
          {
            if (__DEV__) {
              checkAttributeStringCoercion(propValue, 'data');
            }

            var sanitizedValue = sanitizeURL('' + propValue);

            if (sanitizedValue === '') {
              if (__DEV__) {
                console.error('An empty string ("") was passed to the %s attribute. ' + 'To fix this, either do not render the element at all ' + 'or pass null to %s instead of an empty string.', propKey, propKey);
              }

              break;
            }

            target.push(attributeSeparator, stringToChunk('data'), attributeAssign, stringToChunk(escapeTextForBrowser(sanitizedValue)), attributeEnd);
            break;
          }

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);

  if (typeof children === 'string') {
    // Special case children as a string to avoid the unnecessary comment.
    // TODO: Remove this special case after the general optimization is in place.
    target.push(stringToChunk(encodeHTMLTextNode(children)));
    return null;
  }

  return children;
}

function pushStartSelect(target, props, formatContext) {
  if (__DEV__) {
    checkControlledValueProps('select', props);
    checkSelectProp(props, 'value');
    checkSelectProp(props, 'defaultValue');

    if (props.value !== undefined && props.defaultValue !== undefined && !didWarnDefaultSelectValue) {
      console.error('Select elements must be either controlled or uncontrolled ' + '(specify either the value prop, or the defaultValue prop, but not ' + 'both). Decide between using a controlled or uncontrolled select ' + 'element and remove one of these props. More info: ' + 'https://react.dev/link/controlled-components');
      didWarnDefaultSelectValue = true;
    }
  }

  target.push(startChunkForTag('select'));
  var children = null;
  var innerHTML = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          // TODO: This doesn't really make sense for select since it can't use the controlled
          // value in the innerHTML.
          innerHTML = propValue;
          break;

        case 'defaultValue':
        case 'value':
          // These are set on the Context instead and applied to the nested options.
          break;

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);
  return children;
}

function flattenOptionChildren(children) {
  var content = ''; // Flatten children and warn if they aren't strings or numbers;
  // invalid types are ignored.

  Children.forEach(children, function (child) {
    if (child == null) {
      return;
    }

    content += child;

    if (__DEV__) {
      if (!didWarnInvalidOptionChildren && typeof child !== 'string' && typeof child !== 'number' && typeof child !== 'bigint') {
        didWarnInvalidOptionChildren = true;
        console.error('Cannot infer the option value of complex children. ' + 'Pass a `value` prop or use a plain string as children to <option>.');
      }
    }
  });
  return content;
}

var selectedMarkerAttribute = stringToPrecomputedChunk(' selected=""');

function pushStartOption(target, props, formatContext) {
  var selectedValue = formatContext.selectedValue;
  target.push(startChunkForTag('option'));
  var children = null;
  var value = null;
  var selected = null;
  var innerHTML = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'selected':
          // ignore
          selected = propValue;

          if (__DEV__) {
            // TODO: Remove support for `selected` in <option>.
            if (!didWarnSelectedSetOnOption) {
              console.error('Use the `defaultValue` or `value` props on <select> instead of ' + 'setting `selected` on <option>.');
              didWarnSelectedSetOnOption = true;
            }
          }

          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;

        case 'value':
          value = propValue;
        // We intentionally fallthrough to also set the attribute on the node.

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  if (selectedValue != null) {
    var stringValue;

    if (value !== null) {
      if (__DEV__) {
        checkAttributeStringCoercion(value, 'value');
      }

      stringValue = '' + value;
    } else {
      if (__DEV__) {
        if (innerHTML !== null) {
          if (!didWarnInvalidOptionInnerHTML) {
            didWarnInvalidOptionInnerHTML = true;
            console.error('Pass a `value` prop if you set dangerouslyInnerHTML so React knows ' + 'which value should be selected.');
          }
        }
      }

      stringValue = flattenOptionChildren(children);
    }

    if (isArray(selectedValue)) {
      // multiple
      for (var i = 0; i < selectedValue.length; i++) {
        if (__DEV__) {
          checkAttributeStringCoercion(selectedValue[i], 'value');
        }

        var v = '' + selectedValue[i];

        if (v === stringValue) {
          target.push(selectedMarkerAttribute);
          break;
        }
      }
    } else {
      if (__DEV__) {
        checkAttributeStringCoercion(selectedValue, 'select.value');
      }

      if ('' + selectedValue === stringValue) {
        target.push(selectedMarkerAttribute);
      }
    }
  } else if (selected) {
    target.push(selectedMarkerAttribute);
  } // Options never participate as ViewTransitions.


  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);
  return children;
}

var formReplayingRuntimeScript = stringToPrecomputedChunk(formReplayingRuntime);

function injectFormReplayingRuntime(resumableState, renderState) {
  // If we haven't sent it yet, inject the runtime that tracks submitted JS actions
  // for later replaying by Fiber. If we use an external runtime, we don't need
  // to emit anything. It's always used.
  if ((resumableState.instructions & SentFormReplayingRuntime) === NothingSent && (!enableFizzExternalRuntime || !renderState.externalRuntimeScript)) {
    resumableState.instructions |= SentFormReplayingRuntime;
    var preamble = renderState.preamble;
    var bootstrapChunks = renderState.bootstrapChunks;

    if ((preamble.htmlChunks || preamble.headChunks) && bootstrapChunks.length === 0) {
      // If we rendered the whole document, then we emitted a rel="expect" that needs a
      // matching target. If we haven't emitted that yet, we need to include it in this
      // script tag.
      bootstrapChunks.push(renderState.startInlineScript);
      pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
      bootstrapChunks.push(endOfStartTag, formReplayingRuntimeScript, endInlineScript);
    } else {
      // Otherwise we added to the beginning of the scripts. This will mean that it
      // appears before the shell ID unfortunately.
      bootstrapChunks.unshift(renderState.startInlineScript, endOfStartTag, formReplayingRuntimeScript, endInlineScript);
    }
  }
}

var formStateMarkerIsMatching = stringToPrecomputedChunk('<!--F!-->');
var formStateMarkerIsNotMatching = stringToPrecomputedChunk('<!--F-->');
export function pushFormStateMarkerIsMatching(target) {
  target.push(formStateMarkerIsMatching);
}
export function pushFormStateMarkerIsNotMatching(target) {
  target.push(formStateMarkerIsNotMatching);
}

function pushStartForm(target, props, resumableState, renderState, formatContext) {
  target.push(startChunkForTag('form'));
  var children = null;
  var innerHTML = null;
  var formAction = null;
  var formEncType = null;
  var formMethod = null;
  var formTarget = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;

        case 'action':
          formAction = propValue;
          break;

        case 'encType':
          formEncType = propValue;
          break;

        case 'method':
          formMethod = propValue;
          break;

        case 'target':
          formTarget = propValue;
          break;

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  var formData = null;
  var formActionName = null;

  if (typeof formAction === 'function') {
    // Function form actions cannot control the form properties
    if (__DEV__) {
      if ((formEncType !== null || formMethod !== null) && !didWarnFormActionMethod) {
        didWarnFormActionMethod = true;
        console.error('Cannot specify a encType or method for a form that specifies a ' + 'function as the action. React provides those automatically. ' + 'They will get overridden.');
      }

      if (formTarget !== null && !didWarnFormActionTarget) {
        didWarnFormActionTarget = true;
        console.error('Cannot specify a target for a form that specifies a function as the action. ' + 'The function will always be executed in the same window.');
      }
    }

    var customFields = getCustomFormFields(resumableState, formAction);

    if (customFields !== null) {
      // This action has a custom progressive enhancement form that can submit the form
      // back to the server if it's invoked before hydration. Such as a Server Action.
      formAction = customFields.action || '';
      formEncType = customFields.encType;
      formMethod = customFields.method;
      formTarget = customFields.target;
      formData = customFields.data;
      formActionName = customFields.name;
    } else {
      // Set a javascript URL that doesn't do anything. We don't expect this to be invoked
      // because we'll preventDefault in the Fizz runtime, but it can happen if a form is
      // manually submitted or if someone calls stopPropagation before React gets the event.
      // If CSP is used to block javascript: URLs that's fine too. It just won't show this
      // error message but the URL will be logged.
      target.push(attributeSeparator, stringToChunk('action'), attributeAssign, actionJavaScriptURL, attributeEnd);
      formAction = null;
      formEncType = null;
      formMethod = null;
      formTarget = null;
      injectFormReplayingRuntime(resumableState, renderState);
    }
  }

  if (formAction != null) {
    pushAttribute(target, 'action', formAction);
  }

  if (formEncType != null) {
    pushAttribute(target, 'encType', formEncType);
  }

  if (formMethod != null) {
    pushAttribute(target, 'method', formMethod);
  }

  if (formTarget != null) {
    pushAttribute(target, 'target', formTarget);
  }

  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTag);

  if (formActionName !== null) {
    target.push(startHiddenInputChunk);
    pushStringAttribute(target, 'name', formActionName);
    target.push(endOfStartTagSelfClosing);
    pushAdditionalFormFields(target, formData);
  }

  pushInnerHTML(target, innerHTML, children);

  if (typeof children === 'string') {
    // Special case children as a string to avoid the unnecessary comment.
    // TODO: Remove this special case after the general optimization is in place.
    target.push(stringToChunk(encodeHTMLTextNode(children)));
    return null;
  }

  return children;
}

function pushInput(target, props, resumableState, renderState, formatContext) {
  if (__DEV__) {
    checkControlledValueProps('input', props);
  }

  target.push(startChunkForTag('input'));
  var name = null;
  var formAction = null;
  var formEncType = null;
  var formMethod = null;
  var formTarget = null;
  var value = null;
  var defaultValue = null;
  var checked = null;
  var defaultChecked = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
        case 'dangerouslySetInnerHTML':
          throw new Error('input' + " is a self-closing tag and must neither have `children` nor " + 'use `dangerouslySetInnerHTML`.');

        case 'name':
          name = propValue;
          break;

        case 'formAction':
          formAction = propValue;
          break;

        case 'formEncType':
          formEncType = propValue;
          break;

        case 'formMethod':
          formMethod = propValue;
          break;

        case 'formTarget':
          formTarget = propValue;
          break;

        case 'defaultChecked':
          defaultChecked = propValue;
          break;

        case 'defaultValue':
          defaultValue = propValue;
          break;

        case 'checked':
          checked = propValue;
          break;

        case 'value':
          value = propValue;
          break;

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  if (__DEV__) {
    if (formAction !== null && props.type !== 'image' && props.type !== 'submit' && !didWarnFormActionType) {
      didWarnFormActionType = true;
      console.error('An input can only specify a formAction along with type="submit" or type="image".');
    }
  }

  var formData = pushFormActionAttribute(target, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name);

  if (__DEV__) {
    if (checked !== null && defaultChecked !== null && !didWarnDefaultChecked) {
      console.error('%s contains an input of type %s with both checked and defaultChecked props. ' + 'Input elements must be either controlled or uncontrolled ' + '(specify either the checked prop, or the defaultChecked prop, but not ' + 'both). Decide between using a controlled or uncontrolled input ' + 'element and remove one of these props. More info: ' + 'https://react.dev/link/controlled-components', 'A component', props.type);
      didWarnDefaultChecked = true;
    }

    if (value !== null && defaultValue !== null && !didWarnDefaultInputValue) {
      console.error('%s contains an input of type %s with both value and defaultValue props. ' + 'Input elements must be either controlled or uncontrolled ' + '(specify either the value prop, or the defaultValue prop, but not ' + 'both). Decide between using a controlled or uncontrolled input ' + 'element and remove one of these props. More info: ' + 'https://react.dev/link/controlled-components', 'A component', props.type);
      didWarnDefaultInputValue = true;
    }
  }

  if (checked !== null) {
    pushBooleanAttribute(target, 'checked', checked);
  } else if (defaultChecked !== null) {
    pushBooleanAttribute(target, 'checked', defaultChecked);
  }

  if (value !== null) {
    pushAttribute(target, 'value', value);
  } else if (defaultValue !== null) {
    pushAttribute(target, 'value', defaultValue);
  }

  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTagSelfClosing); // We place any additional hidden form fields after the input.

  pushAdditionalFormFields(target, formData);
  return null;
}

function pushStartButton(target, props, resumableState, renderState, formatContext) {
  target.push(startChunkForTag('button'));
  var children = null;
  var innerHTML = null;
  var name = null;
  var formAction = null;
  var formEncType = null;
  var formMethod = null;
  var formTarget = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;

        case 'name':
          name = propValue;
          break;

        case 'formAction':
          formAction = propValue;
          break;

        case 'formEncType':
          formEncType = propValue;
          break;

        case 'formMethod':
          formMethod = propValue;
          break;

        case 'formTarget':
          formTarget = propValue;
          break;

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  if (__DEV__) {
    if (formAction !== null && props.type != null && props.type !== 'submit' && !didWarnFormActionType) {
      didWarnFormActionType = true;
      console.error('A button can only specify a formAction along with type="submit" or no type.');
    }
  }

  var formData = pushFormActionAttribute(target, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name);
  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTag); // We place any additional hidden form fields we need to include inside the button itself.

  pushAdditionalFormFields(target, formData);
  pushInnerHTML(target, innerHTML, children);

  if (typeof children === 'string') {
    // Special case children as a string to avoid the unnecessary comment.
    // TODO: Remove this special case after the general optimization is in place.
    target.push(stringToChunk(encodeHTMLTextNode(children)));
    return null;
  }

  return children;
}

function pushStartTextArea(target, props, formatContext) {
  if (__DEV__) {
    checkControlledValueProps('textarea', props);

    if (props.value !== undefined && props.defaultValue !== undefined && !didWarnDefaultTextareaValue) {
      console.error('Textarea elements must be either controlled or uncontrolled ' + '(specify either the value prop, or the defaultValue prop, but not ' + 'both). Decide between using a controlled or uncontrolled textarea ' + 'and remove one of these props. More info: ' + 'https://react.dev/link/controlled-components');
      didWarnDefaultTextareaValue = true;
    }
  }

  target.push(startChunkForTag('textarea'));
  var value = null;
  var defaultValue = null;
  var children = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'value':
          value = propValue;
          break;

        case 'defaultValue':
          defaultValue = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          throw new Error('`dangerouslySetInnerHTML` does not make sense on <textarea>.');

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  if (value === null && defaultValue !== null) {
    value = defaultValue;
  }

  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTag); // TODO (yungsters): Remove support for children content in <textarea>.

  if (children != null) {
    if (__DEV__) {
      console.error('Use the `defaultValue` or `value` props instead of setting ' + 'children on <textarea>.');
    }

    if (value != null) {
      throw new Error('If you supply `defaultValue` on a <textarea>, do not pass children.');
    }

    if (isArray(children)) {
      if (children.length > 1) {
        throw new Error('<textarea> can only have at most one child.');
      } // TODO: remove the coercion and the DEV check below because it will
      // always be overwritten by the coercion several lines below it. #22309


      if (__DEV__) {
        checkHtmlStringCoercion(children[0]);
      }

      value = '' + children[0];
    }

    if (__DEV__) {
      checkHtmlStringCoercion(children);
    }

    value = '' + children;
  }

  if (typeof value === 'string' && value[0] === '\n') {
    // text/html ignores the first character in these tags if it's a newline
    // Prefer to break application/xml over text/html (for now) by adding
    // a newline specifically to get eaten by the parser. (Alternately for
    // textareas, replacing "^\n" with "\r\n" doesn't get eaten, and the first
    // \r is normalized out by HTMLTextAreaElement#value.)
    // See: <http://www.w3.org/TR/html-polyglot/#newlines-in-textarea-and-pre>
    // See: <http://www.w3.org/TR/html5/syntax.html#element-restrictions>
    // See: <http://www.w3.org/TR/html5/syntax.html#newlines>
    // See: Parsing of "textarea" "listing" and "pre" elements
    //  from <http://www.w3.org/TR/html5/syntax.html#parsing-main-inbody>
    target.push(leadingNewline);
  } // ToString and push directly instead of recurse over children.
  // We don't really support complex children in the value anyway.
  // This also currently avoids a trailing comment node which breaks textarea.


  if (value !== null) {
    if (__DEV__) {
      checkAttributeStringCoercion(value, 'value');
    }

    target.push(stringToChunk(encodeHTMLTextNode('' + value)));
  }

  return null;
}

function pushMeta(target, props, renderState, textEmbedded, formatContext) {
  var noscriptTagInScope = formatContext.tagScope & NOSCRIPT_SCOPE;
  var isFallback = formatContext.tagScope & FALLBACK_SCOPE;

  if (formatContext.insertionMode === SVG_MODE || noscriptTagInScope || props.itemProp != null) {
    return pushSelfClosing(target, props, 'meta', formatContext);
  } else {
    if (textEmbedded) {
      // This link follows text but we aren't writing a tag. while not as efficient as possible we need
      // to be safe and assume text will follow by inserting a textSeparator
      target.push(textSeparator);
    }

    if (isFallback) {
      // Hoistable Elements for fallbacks are simply omitted. we don't want to emit them early
      // because they are likely superceded by primary content and we want to avoid needing to clean
      // them up when the primary content is ready. They are never hydrated on the client anyway because
      // boundaries in fallback are awaited or client render, in either case there is never hydration
      return null;
    } else if (typeof props.charSet === 'string') {
      // "charset" Should really be config and not picked up from tags however since this is
      // the only way to embed the tag today we flush it on a special queue on the Request so it
      // can go before everything else. Like viewport this means that the tag will escape it's
      // parent container.
      return pushSelfClosing(renderState.charsetChunks, props, 'meta', formatContext);
    } else if (props.name === 'viewport') {
      // "viewport" is flushed on the Request so it can go earlier that Float resources that
      // might be affected by it. This means it can escape the boundary it is rendered within.
      // This is a pragmatic solution to viewport being incredibly sensitive to document order
      // without requiring all hoistables to be flushed too early.
      return pushSelfClosing(renderState.viewportChunks, props, 'meta', formatContext);
    } else {
      return pushSelfClosing(renderState.hoistableChunks, props, 'meta', formatContext);
    }
  }
}

function pushLink(target, props, resumableState, renderState, hoistableState, textEmbedded, formatContext) {
  var noscriptTagInScope = formatContext.tagScope & NOSCRIPT_SCOPE;
  var isFallback = formatContext.tagScope & FALLBACK_SCOPE;
  var rel = props.rel;
  var href = props.href;
  var precedence = props.precedence;

  if (formatContext.insertionMode === SVG_MODE || noscriptTagInScope || props.itemProp != null || typeof rel !== 'string' || typeof href !== 'string' || href === '') {
    if (__DEV__) {
      if (rel === 'stylesheet' && typeof props.precedence === 'string') {
        if (typeof href !== 'string' || !href) {
          console.error('React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and expected the `href` prop to be a non-empty string but ecountered %s instead. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop ensure there is a non-empty string `href` prop as well, otherwise remove the `precedence` prop.', getValueDescriptorExpectingObjectForWarning(href));
        }
      }
    }

    pushLinkImpl(target, props);
    return null;
  }

  if (props.rel === 'stylesheet') {
    // This <link> may hoistable as a Stylesheet Resource, otherwise it will emit in place
    var _key = getResourceKey(href);

    if (typeof precedence !== 'string' || props.disabled != null || props.onLoad || props.onError) {
      // This stylesheet is either not opted into Resource semantics or has conflicting properties which
      // disqualify it for such. We can still create a preload resource to help it load faster on the
      // client
      if (__DEV__) {
        if (typeof precedence === 'string') {
          if (props.disabled != null) {
            console.error('React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and a `disabled` prop. The presence of the `disabled` prop indicates an intent to manage the stylesheet active state from your from your Component code and React will not hoist or deduplicate this stylesheet. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop remove the `disabled` prop, otherwise remove the `precedence` prop.');
          } else if (props.onLoad || props.onError) {
            var propDescription = props.onLoad && props.onError ? '`onLoad` and `onError` props' : props.onLoad ? '`onLoad` prop' : '`onError` prop';
            console.error('React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and %s. The presence of loading and error handlers indicates an intent to manage the stylesheet loading state from your from your Component code and React will not hoist or deduplicate this stylesheet. If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` prop remove the %s, otherwise remove the `precedence` prop.', propDescription, propDescription);
          }
        }
      }

      return pushLinkImpl(target, props);
    } else {
      // This stylesheet refers to a Resource and we create a new one if necessary
      var styleQueue = renderState.styles.get(precedence);
      var hasKey = resumableState.styleResources.hasOwnProperty(_key);
      var resourceState = hasKey ? resumableState.styleResources[_key] : undefined;

      if (resourceState !== EXISTS) {
        // We are going to create this resource now so it is marked as Exists
        resumableState.styleResources[_key] = EXISTS; // If this is the first time we've encountered this precedence we need
        // to create a StyleQueue

        if (!styleQueue) {
          styleQueue = {
            precedence: stringToChunk(escapeTextForBrowser(precedence)),
            rules: [],
            hrefs: [],
            sheets: new Map()
          };
          renderState.styles.set(precedence, styleQueue);
        }

        var resource = {
          state: PENDING,
          props: stylesheetPropsFromRawProps(props)
        };

        if (resourceState) {
          // When resourceState is truty it is a Preload state. We cast it for clarity
          var preloadState = resourceState;

          if (preloadState.length === 2) {
            adoptPreloadCredentials(resource.props, preloadState);
          }

          var preloadResource = renderState.preloads.stylesheets.get(_key);

          if (preloadResource && preloadResource.length > 0) {
            // The Preload for this resource was created in this render pass and has not flushed yet so
            // we need to clear it to avoid it flushing.
            preloadResource.length = 0;
          } else {
            // Either the preload resource from this render already flushed in this render pass
            // or the preload flushed in a prior pass (prerender). In either case we need to mark
            // this resource as already having been preloaded.
            resource.state = PRELOADED;
          }
        } else {// We don't need to check whether a preloadResource exists in the renderState
          // because if it did exist then the resourceState would also exist and we would
          // have hit the primary if condition above.
        } // We add the newly created resource to our StyleQueue and if necessary
        // track the resource with the currently rendering boundary


        styleQueue.sheets.set(_key, resource);

        if (hoistableState) {
          hoistableState.stylesheets.add(resource);
        }
      } else {
        // We need to track whether this boundary should wait on this resource or not.
        // Typically this resource should always exist since we either had it or just created
        // it. However, it's possible when you resume that the style has already been emitted
        // and then it wouldn't be recreated in the RenderState and there's no need to track
        // it again since we should've hoisted it to the shell already.
        if (styleQueue) {
          var _resource = styleQueue.sheets.get(_key);

          if (_resource) {
            if (hoistableState) {
              hoistableState.stylesheets.add(_resource);
            }
          }
        }
      }

      if (textEmbedded) {
        // This link follows text but we aren't writing a tag. while not as efficient as possible we need
        // to be safe and assume text will follow by inserting a textSeparator
        target.push(textSeparator);
      }

      return null;
    }
  } else if (props.onLoad || props.onError) {
    // When using load handlers we cannot hoist and need to emit links in place
    return pushLinkImpl(target, props);
  } else {
    // We can hoist this link so we may need to emit a text separator.
    // @TODO refactor text separators so we don't have to defensively add
    // them when we don't end up emitting a tag as a result of pushStartInstance
    if (textEmbedded) {
      // This link follows text but we aren't writing a tag. while not as efficient as possible we need
      // to be safe and assume text will follow by inserting a textSeparator
      target.push(textSeparator);
    }

    if (isFallback) {
      // Hoistable Elements for fallbacks are simply omitted. we don't want to emit them early
      // because they are likely superceded by primary content and we want to avoid needing to clean
      // them up when the primary content is ready. They are never hydrated on the client anyway because
      // boundaries in fallback are awaited or client render, in either case there is never hydration
      return null;
    } else {
      return pushLinkImpl(renderState.hoistableChunks, props);
    }
  }
}

function pushLinkImpl(target, props) {
  target.push(startChunkForTag('link'));

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
        case 'dangerouslySetInnerHTML':
          throw new Error('link' + " is a self-closing tag and must neither have `children` nor " + 'use `dangerouslySetInnerHTML`.');

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  } // Link never participate as a ViewTransition


  target.push(endOfStartTagSelfClosing);
  return null;
}

function pushStyle(target, props, resumableState, renderState, hoistableState, textEmbedded, formatContext) {
  var noscriptTagInScope = formatContext.tagScope & NOSCRIPT_SCOPE;

  if (__DEV__) {
    if (hasOwnProperty.call(props, 'children')) {
      var children = props.children;
      var child = Array.isArray(children) ? children.length < 2 ? children[0] : null : children;

      if (typeof child === 'function' || typeof child === 'symbol' || Array.isArray(child)) {
        var childType = typeof child === 'function' ? 'a Function' : typeof child === 'symbol' ? 'a Sybmol' : 'an Array';
        console.error('React expect children of <style> tags to be a string, number, or object with a `toString` method but found %s instead. ' + 'In browsers style Elements can only have `Text` Nodes as children.', childType);
      }
    }
  }

  var precedence = props.precedence;
  var href = props.href;
  var nonce = props.nonce;

  if (formatContext.insertionMode === SVG_MODE || noscriptTagInScope || props.itemProp != null || typeof precedence !== 'string' || typeof href !== 'string' || href === '') {
    // This style tag is not able to be turned into a Style Resource
    return pushStyleImpl(target, props);
  }

  if (__DEV__) {
    if (href.includes(' ')) {
      console.error('React expected the `href` prop for a <style> tag opting into hoisting semantics using the `precedence` prop to not have any spaces but ecountered spaces instead. using spaces in this prop will cause hydration of this style to fail on the client. The href for the <style> where this ocurred is "%s".', href);
    }
  }

  var key = getResourceKey(href);
  var styleQueue = renderState.styles.get(precedence);
  var hasKey = resumableState.styleResources.hasOwnProperty(key);
  var resourceState = hasKey ? resumableState.styleResources[key] : undefined;

  if (resourceState !== EXISTS) {
    // We are going to create this resource now so it is marked as Exists
    resumableState.styleResources[key] = EXISTS;

    if (__DEV__) {
      if (resourceState) {
        console.error('React encountered a hoistable style tag for the same href as a preload: "%s". When using a style tag to inline styles you should not also preload it as a stylsheet.', href);
      }
    }

    if (!styleQueue) {
      // This is the first time we've encountered this precedence we need
      // to create a StyleQueue.
      styleQueue = {
        precedence: stringToChunk(escapeTextForBrowser(precedence)),
        rules: [],
        hrefs: [],
        sheets: new Map()
      };
      renderState.styles.set(precedence, styleQueue);
    }

    var nonceStyle = renderState.nonce.style;

    if (!nonceStyle || nonceStyle === nonce) {
      if (__DEV__) {
        if (!nonceStyle && nonce) {
          console.error('React encountered a style tag with `precedence` "%s" and `nonce` "%s". When React manages style rules using `precedence` it will only include a nonce attributes if you also provide the same style nonce value as a render option.', precedence, nonce);
        }
      }

      styleQueue.hrefs.push(stringToChunk(escapeTextForBrowser(href)));
      pushStyleContents(styleQueue.rules, props);
    } else if (__DEV__) {
      console.error('React encountered a style tag with `precedence` "%s" and `nonce` "%s". When React manages style rules using `precedence` it will only include rules if the nonce matches the style nonce "%s" that was included with this render.', precedence, nonce, nonceStyle);
    }
  }

  if (styleQueue) {
    // We need to track whether this boundary should wait on this resource or not.
    // Typically this resource should always exist since we either had it or just created
    // it. However, it's possible when you resume that the style has already been emitted
    // and then it wouldn't be recreated in the RenderState and there's no need to track
    // it again since we should've hoisted it to the shell already.
    if (hoistableState) {
      hoistableState.styles.add(styleQueue);
    }
  }

  if (textEmbedded) {
    // This link follows text but we aren't writing a tag. while not as efficient as possible we need
    // to be safe and assume text will follow by inserting a textSeparator
    target.push(textSeparator);
  }
}
/**
 * This escaping function is designed to work with style tag textContent only.
 *
 * While untrusted style content should be made safe before using this api it will
 * ensure that the style cannot be early terminated or never terminated state
 */


function escapeStyleTextContent(styleText) {
  if (__DEV__) {
    checkHtmlStringCoercion(styleText);
  }

  return ('' + styleText).replace(styleRegex, styleReplacer);
}

var styleRegex = /(<\/|<)(s)(tyle)/gi;

var styleReplacer = function (match, prefix, s, suffix) {
  return "" + prefix + (s === 's' ? '\\73 ' : '\\53 ') + suffix;
};

function pushStyleImpl(target, props) {
  target.push(startChunkForTag('style'));
  var children = null;
  var innerHTML = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  } // Style never participate as a ViewTransition.


  target.push(endOfStartTag);
  var child = Array.isArray(children) ? children.length < 2 ? children[0] : null : children;

  if (typeof child !== 'function' && typeof child !== 'symbol' && child !== null && child !== undefined) {
    target.push(stringToChunk(escapeStyleTextContent(child)));
  }

  pushInnerHTML(target, innerHTML, children);
  target.push(endChunkForTag('style'));
  return null;
}

function pushStyleContents(target, props) {
  var children = null;
  var innerHTML = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;
      }
    }
  }

  var child = Array.isArray(children) ? children.length < 2 ? children[0] : null : children;

  if (typeof child !== 'function' && typeof child !== 'symbol' && child !== null && child !== undefined) {
    target.push(stringToChunk(escapeStyleTextContent(child)));
  }

  pushInnerHTML(target, innerHTML, children);
  return;
}

function pushImg(target, props, resumableState, renderState, formatContext) {
  var pictureOrNoScriptTagInScope = formatContext.tagScope & (PICTURE_SCOPE | NOSCRIPT_SCOPE);
  var src = props.src,
      srcSet = props.srcSet;

  if (props.loading !== 'lazy' && (src || srcSet) && (typeof src === 'string' || src == null) && (typeof srcSet === 'string' || srcSet == null) && props.fetchPriority !== 'low' && !pictureOrNoScriptTagInScope && // We exclude data URIs in src and srcSet since these should not be preloaded
  !(typeof src === 'string' && src[4] === ':' && (src[0] === 'd' || src[0] === 'D') && (src[1] === 'a' || src[1] === 'A') && (src[2] === 't' || src[2] === 'T') && (src[3] === 'a' || src[3] === 'A')) && !(typeof srcSet === 'string' && srcSet[4] === ':' && (srcSet[0] === 'd' || srcSet[0] === 'D') && (srcSet[1] === 'a' || srcSet[1] === 'A') && (srcSet[2] === 't' || srcSet[2] === 'T') && (srcSet[3] === 'a' || srcSet[3] === 'A'))) {
    // We have a suspensey image and ought to preload it to optimize the loading of display blocking
    // resumableState.
    var sizes = typeof props.sizes === 'string' ? props.sizes : undefined;

    var _key2 = getImageResourceKey(src, srcSet, sizes);

    var promotablePreloads = renderState.preloads.images;
    var resource = promotablePreloads.get(_key2);

    if (resource) {
      // We consider whether this preload can be promoted to higher priority flushing queue.
      // The only time a resource will exist here is if it was created during this render
      // and was not already in the high priority queue.
      if (props.fetchPriority === 'high' || renderState.highImagePreloads.size < 10) {
        // Delete the resource from the map since we are promoting it and don't want to
        // reenter this branch in a second pass for duplicate img hrefs.
        promotablePreloads.delete(_key2); // $FlowFixMe - Flow should understand that this is a Resource if the condition was true

        renderState.highImagePreloads.add(resource);
      }
    } else if (!resumableState.imageResources.hasOwnProperty(_key2)) {
      // We must construct a new preload resource
      resumableState.imageResources[_key2] = PRELOAD_NO_CREDS;
      var crossOrigin = getCrossOriginString(props.crossOrigin);
      var _headers = renderState.headers;
      var header;

      if (_headers && _headers.remainingCapacity > 0 && // browsers today don't support preloading responsive images from link headers so we bail out
      // if the img has srcset defined
      typeof props.srcSet !== 'string' && ( // this is a hueristic similar to capping element preloads to 10 unless explicitly
      // fetchPriority="high". We use length here which means it will fit fewer images when
      // the urls are long and more when short. arguably byte size is a better hueristic because
      // it directly translates to how much we send down before content is actually seen.
      // We could unify the counts and also make it so the total is tracked regardless of
      // flushing output but since the headers are likely to be go earlier than content
      // they don't really conflict so for now I've kept them separate
      props.fetchPriority === 'high' || _headers.highImagePreloads.length < 500) && ( // We manually construct the options for the preload only from strings. We don't want to pollute
      // the params list with arbitrary props and if we copied everything over as it we might get
      // coercion errors. We have checks for this in Dev but it seems safer to just only accept values
      // that are strings
      header = getPreloadAsHeader(src, 'image', {
        imageSrcSet: props.srcSet,
        imageSizes: props.sizes,
        crossOrigin: crossOrigin,
        integrity: props.integrity,
        nonce: props.nonce,
        type: props.type,
        fetchPriority: props.fetchPriority,
        referrerPolicy: props.refererPolicy
      }), // We always consume the header length since once we find one header that doesn't fit
      // we assume all the rest won't as well. This is to avoid getting into a situation
      // where we have a very small remaining capacity but no headers will ever fit and we end
      // up constantly trying to see if the next resource might make it. In the future we can
      // make this behavior different between render and prerender since in the latter case
      // we are less sensitive to the current requests runtime per and more sensitive to maximizing
      // headers.
      (_headers.remainingCapacity -= header.length + 2) >= 0)) {
        // If we postpone in the shell we will still emit this preload so we track
        // it to make sure we don't reset it.
        renderState.resets.image[_key2] = PRELOAD_NO_CREDS;

        if (_headers.highImagePreloads) {
          _headers.highImagePreloads += ', ';
        } // $FlowFixMe[unsafe-addition]: we assign header during the if condition


        _headers.highImagePreloads += header;
      } else {
        resource = [];
        pushLinkImpl(resource, {
          rel: 'preload',
          as: 'image',
          // There is a bug in Safari where imageSrcSet is not respected on preload links
          // so we omit the href here if we have imageSrcSet b/c safari will load the wrong image.
          // This harms older browers that do not support imageSrcSet by making their preloads not work
          // but this population is shrinking fast and is already small so we accept this tradeoff.
          href: srcSet ? undefined : src,
          imageSrcSet: srcSet,
          imageSizes: sizes,
          crossOrigin: crossOrigin,
          integrity: props.integrity,
          type: props.type,
          fetchPriority: props.fetchPriority,
          referrerPolicy: props.referrerPolicy
        });

        if (props.fetchPriority === 'high' || renderState.highImagePreloads.size < 10) {
          renderState.highImagePreloads.add(resource);
        } else {
          renderState.bulkPreloads.add(resource); // We can bump the priority up if the same img is rendered later
          // with fetchPriority="high"

          promotablePreloads.set(_key2, resource);
        }
      }
    }
  }

  return pushSelfClosing(target, props, 'img', formatContext);
}

function pushSelfClosing(target, props, tag, formatContext) {
  target.push(startChunkForTag(tag));

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
        case 'dangerouslySetInnerHTML':
          throw new Error(tag + " is a self-closing tag and must neither have `children` nor " + 'use `dangerouslySetInnerHTML`.');

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTagSelfClosing);
  return null;
}

function pushStartMenuItem(target, props, formatContext) {
  target.push(startChunkForTag('menuitem'));

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
        case 'dangerouslySetInnerHTML':
          throw new Error('menuitems cannot have `children` nor `dangerouslySetInnerHTML`.');

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTag);
  return null;
}

function pushTitle(target, props, renderState, formatContext) {
  var noscriptTagInScope = formatContext.tagScope & NOSCRIPT_SCOPE;
  var isFallback = formatContext.tagScope & FALLBACK_SCOPE;

  if (__DEV__) {
    if (hasOwnProperty.call(props, 'children')) {
      var children = props.children;
      var child = Array.isArray(children) ? children.length < 2 ? children[0] : null : children;

      if (Array.isArray(children) && children.length > 1) {
        console.error('React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an Array with length %s instead.' + ' Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert `children` of <title> tags to a single string value' + ' which is why Arrays of length greater than 1 are not supported. When using JSX it can be common to combine text nodes and value nodes.' + ' For example: <title>hello {nameOfUser}</title>. While not immediately apparent, `children` in this case is an Array with length 2. If your `children` prop' + ' is using this form try rewriting it using a template string: <title>{`hello ${nameOfUser}`}</title>.', children.length);
      } else if (typeof child === 'function' || typeof child === 'symbol') {
        var childType = typeof child === 'function' ? 'a Function' : 'a Sybmol';
        console.error('React expect children of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found %s instead.' + ' Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title>' + ' tags to a single string value.', childType);
      } else if (child && child.toString === {}.toString) {
        if (child.$$typeof != null) {
          console.error('React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an object that appears to be' + ' a React element which never implements a suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text content and React expects to' + ' be able to convert children of <title> tags to a single string value which is why rendering React elements is not supported. If the `children` of <title> is' + ' a React Component try moving the <title> tag into that component. If the `children` of <title> is some HTML markup change it to be Text only to be valid HTML.');
        } else {
          console.error('React expects the `children` prop of <title> tags to be a string, number, bigint, or object with a novel `toString` method but found an object that does not implement' + ' a suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text content and React expects to be able to convert children of <title> tags' + ' to a single string value. Using the default `toString` method available on every object is almost certainly an error. Consider whether the `children` of this <title>' + ' is an object in error and change it to a string or number value if so. Otherwise implement a `toString` method that React can use to produce a valid <title>.');
        }
      }
    }
  }

  if (formatContext.insertionMode !== SVG_MODE && !noscriptTagInScope && props.itemProp == null) {
    if (isFallback) {
      // Hoistable Elements for fallbacks are simply omitted. we don't want to emit them early
      // because they are likely superceded by primary content and we want to avoid needing to clean
      // them up when the primary content is ready. They are never hydrated on the client anyway because
      // boundaries in fallback are awaited or client render, in either case there is never hydration
      return null;
    } else {
      pushTitleImpl(renderState.hoistableChunks, props);
    }
  } else {
    return pushTitleImpl(target, props);
  }
}

function pushTitleImpl(target, props) {
  target.push(startChunkForTag('title'));
  var children = null;
  var innerHTML = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  } // Title never participate as a ViewTransition


  target.push(endOfStartTag);
  var child = Array.isArray(children) ? children.length < 2 ? children[0] : null : children;

  if (typeof child !== 'function' && typeof child !== 'symbol' && child !== null && child !== undefined) {
    // eslint-disable-next-line react-internal/safe-string-coercion
    target.push(stringToChunk(escapeTextForBrowser('' + child)));
  }

  pushInnerHTML(target, innerHTML, children);
  target.push(endChunkForTag('title'));
  return null;
} // These are used by the client if we clear a boundary and we find these, then we
// also clear the singleton as well.


var headPreambleContributionChunk = stringToPrecomputedChunk('<!--head-->');
var bodyPreambleContributionChunk = stringToPrecomputedChunk('<!--body-->');
var htmlPreambleContributionChunk = stringToPrecomputedChunk('<!--html-->');

function pushStartHead(target, props, renderState, preambleState, formatContext) {
  if (formatContext.insertionMode < HTML_MODE) {
    // This <head> is the Document.head and should be part of the preamble
    var preamble = preambleState || renderState.preamble;

    if (preamble.headChunks) {
      throw new Error("The " + '`<head>`' + " tag may only be rendered once.");
    } // Insert a marker in the body where the contribution to the head was in case we need to clear it.


    if (preambleState !== null) {
      target.push(headPreambleContributionChunk);
    }

    preamble.headChunks = [];
    return pushStartSingletonElement(preamble.headChunks, props, 'head', formatContext);
  } else {
    // This <head> is deep and is likely just an error. we emit it inline though.
    // Validation should warn that this tag is the the wrong spot.
    return pushStartGenericElement(target, props, 'head', formatContext);
  }
}

function pushStartBody(target, props, renderState, preambleState, formatContext) {
  if (formatContext.insertionMode < HTML_MODE) {
    // This <body> is the Document.body
    var preamble = preambleState || renderState.preamble;

    if (preamble.bodyChunks) {
      throw new Error("The " + '`<body>`' + " tag may only be rendered once.");
    } // Insert a marker in the body where the contribution to the body tag was in case we need to clear it.


    if (preambleState !== null) {
      target.push(bodyPreambleContributionChunk);
    }

    preamble.bodyChunks = [];
    return pushStartSingletonElement(preamble.bodyChunks, props, 'body', formatContext);
  } else {
    // This <head> is deep and is likely just an error. we emit it inline though.
    // Validation should warn that this tag is the the wrong spot.
    return pushStartGenericElement(target, props, 'body', formatContext);
  }
}

function pushStartHtml(target, props, renderState, preambleState, formatContext) {
  if (formatContext.insertionMode === ROOT_HTML_MODE) {
    // This <html> is the Document.documentElement
    var preamble = preambleState || renderState.preamble;

    if (preamble.htmlChunks) {
      throw new Error("The " + '`<html>`' + " tag may only be rendered once.");
    } // Insert a marker in the body where the contribution to the head was in case we need to clear it.


    if (preambleState !== null) {
      target.push(htmlPreambleContributionChunk);
    }

    preamble.htmlChunks = [DOCTYPE];
    return pushStartSingletonElement(preamble.htmlChunks, props, 'html', formatContext);
  } else {
    // This <html> is deep and is likely just an error. we emit it inline though.
    // Validation should warn that this tag is the the wrong spot.
    return pushStartGenericElement(target, props, 'html', formatContext);
  }
}

function pushScript(target, props, resumableState, renderState, textEmbedded, formatContext) {
  var noscriptTagInScope = formatContext.tagScope & NOSCRIPT_SCOPE;
  var asyncProp = props.async;

  if (typeof props.src !== 'string' || !props.src || !(asyncProp && typeof asyncProp !== 'function' && typeof asyncProp !== 'symbol') || props.onLoad || props.onError || formatContext.insertionMode === SVG_MODE || noscriptTagInScope || props.itemProp != null) {
    // This script will not be a resource, we bailout early and emit it in place.
    return pushScriptImpl(target, props);
  }

  var src = props.src;
  var key = getResourceKey(src); // We can make this <script> into a ScriptResource

  var resources, preloads;

  if (props.type === 'module') {
    resources = resumableState.moduleScriptResources;
    preloads = renderState.preloads.moduleScripts;
  } else {
    resources = resumableState.scriptResources;
    preloads = renderState.preloads.scripts;
  }

  var hasKey = resources.hasOwnProperty(key);
  var resourceState = hasKey ? resources[key] : undefined;

  if (resourceState !== EXISTS) {
    // We are going to create this resource now so it is marked as Exists
    resources[key] = EXISTS;
    var scriptProps = props;

    if (resourceState) {
      // When resourceState is truty it is a Preload state. We cast it for clarity
      var preloadState = resourceState;

      if (preloadState.length === 2) {
        scriptProps = Object.assign({}, props);
        adoptPreloadCredentials(scriptProps, preloadState);
      }

      var preloadResource = preloads.get(key);

      if (preloadResource) {
        // the preload resource exists was created in this render. Now that we have
        // a script resource which will emit earlier than a preload would if it
        // hasn't already flushed we prevent it from flushing by zeroing the length
        preloadResource.length = 0;
      }
    }

    var resource = []; // Add to the script flushing queue

    renderState.scripts.add(resource); // encode the tag as Chunks

    pushScriptImpl(resource, scriptProps);
  }

  if (textEmbedded) {
    // This script follows text but we aren't writing a tag. while not as efficient as possible we need
    // to be safe and assume text will follow by inserting a textSeparator
    target.push(textSeparator);
  }

  return null;
}

function pushScriptImpl(target, props) {
  target.push(startChunkForTag('script'));
  var children = null;
  var innerHTML = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  } // Scripts never participate as a ViewTransition


  target.push(endOfStartTag);

  if (__DEV__) {
    if (children != null && typeof children !== 'string') {
      var descriptiveStatement = typeof children === 'number' ? 'a number for children' : Array.isArray(children) ? 'an array for children' : 'something unexpected for children';
      console.error('A script element was rendered with %s. If script element has children it must be a single string.' + ' Consider using dangerouslySetInnerHTML or passing a plain string as children.', descriptiveStatement);
    }
  }

  pushInnerHTML(target, innerHTML, children);

  if (typeof children === 'string') {
    target.push(stringToChunk(escapeEntireInlineScriptContent(children)));
  }

  target.push(endChunkForTag('script'));
  return null;
} // This is a fork of pushStartGenericElement because we don't ever want to do
// the children as strign optimization on that path when rendering singletons.
// When we eliminate that special path we can delete this fork and unify it again


function pushStartSingletonElement(target, props, tag, formatContext) {
  target.push(startChunkForTag(tag));
  var children = null;
  var innerHTML = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);
  return children;
}

function pushStartGenericElement(target, props, tag, formatContext) {
  target.push(startChunkForTag(tag));
  var children = null;
  var innerHTML = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);

  if (typeof children === 'string') {
    // Special case children as a string to avoid the unnecessary comment.
    // TODO: Remove this special case after the general optimization is in place.
    target.push(stringToChunk(encodeHTMLTextNode(children)));
    return null;
  }

  return children;
}

function pushStartCustomElement(target, props, tag, formatContext) {
  target.push(startChunkForTag(tag));
  var children = null;
  var innerHTML = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      var attributeName = propKey;

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;

        case 'style':
          pushStyleAttribute(target, propValue);
          break;

        case 'suppressContentEditableWarning':
        case 'suppressHydrationWarning':
        case 'ref':
          // Ignored. These are built-in to React on the client.
          break;

        case 'className':
          // className gets rendered as class on the client, so it should be
          // rendered as class on the server.
          attributeName = 'class';
        // intentional fallthrough

        default:
          if (isAttributeNameSafe(propKey) && typeof propValue !== 'function' && typeof propValue !== 'symbol') {
            if (propValue === false) {
              continue;
            } else if (propValue === true) {
              propValue = '';
            } else if (typeof propValue === 'object') {
              continue;
            }

            target.push(attributeSeparator, stringToChunk(attributeName), attributeAssign, stringToChunk(escapeTextForBrowser(propValue)), attributeEnd);
          }

          break;
      }
    }
  } // TODO: ViewTransition attributes gets observed by the Custom Element which is a bit sketchy.


  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);
  return children;
}

var leadingNewline = stringToPrecomputedChunk('\n');

function pushStartPreformattedElement(target, props, tag, formatContext) {
  target.push(startChunkForTag(tag));
  var children = null;
  var innerHTML = null;

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'children':
          children = propValue;
          break;

        case 'dangerouslySetInnerHTML':
          innerHTML = propValue;
          break;

        default:
          pushAttribute(target, propKey, propValue);
          break;
      }
    }
  }

  pushViewTransitionAttributes(target, formatContext);
  target.push(endOfStartTag); // text/html ignores the first character in these tags if it's a newline
  // Prefer to break application/xml over text/html (for now) by adding
  // a newline specifically to get eaten by the parser. (Alternately for
  // textareas, replacing "^\n" with "\r\n" doesn't get eaten, and the first
  // \r is normalized out by HTMLTextAreaElement#value.)
  // See: <http://www.w3.org/TR/html-polyglot/#newlines-in-textarea-and-pre>
  // See: <http://www.w3.org/TR/html5/syntax.html#element-restrictions>
  // See: <http://www.w3.org/TR/html5/syntax.html#newlines>
  // See: Parsing of "textarea" "listing" and "pre" elements
  //  from <http://www.w3.org/TR/html5/syntax.html#parsing-main-inbody>
  // TODO: This doesn't deal with the case where the child is an array
  // or component that returns a string.

  if (innerHTML != null) {
    if (children != null) {
      throw new Error('Can only set one of `children` or `props.dangerouslySetInnerHTML`.');
    }

    if (typeof innerHTML !== 'object' || !('__html' in innerHTML)) {
      throw new Error('`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' + 'Please visit https://react.dev/link/dangerously-set-inner-html ' + 'for more information.');
    }

    var html = innerHTML.__html;

    if (html !== null && html !== undefined) {
      if (typeof html === 'string' && html.length > 0 && html[0] === '\n') {
        target.push(leadingNewline, stringToChunk(html));
      } else {
        if (__DEV__) {
          checkHtmlStringCoercion(html);
        }

        target.push(stringToChunk('' + html));
      }
    }
  }

  if (typeof children === 'string' && children[0] === '\n') {
    target.push(leadingNewline);
  }

  return children;
} // We accept any tag to be rendered but since this gets injected into arbitrary
// HTML, we want to make sure that it's a safe tag.
// http://www.w3.org/TR/REC-xml/#NT-Name


var VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/; // Simplified subset

var validatedTagCache = new Map();

function startChunkForTag(tag) {
  var tagStartChunk = validatedTagCache.get(tag);

  if (tagStartChunk === undefined) {
    if (!VALID_TAG_REGEX.test(tag)) {
      throw new Error("Invalid tag: " + tag);
    }

    tagStartChunk = stringToPrecomputedChunk('<' + tag);
    validatedTagCache.set(tag, tagStartChunk);
  }

  return tagStartChunk;
}

export var doctypeChunk = stringToPrecomputedChunk('<!DOCTYPE html>');
import { doctypeChunk as DOCTYPE } from 'react-server/src/ReactFizzConfig';
export function pushStartInstance(target, type, props, resumableState, renderState, preambleState, hoistableState, formatContext, textEmbedded) {
  if (__DEV__) {
    validateARIAProperties(type, props);
    validateInputProperties(type, props);
    validateUnknownProperties(type, props, null);

    if (!props.suppressContentEditableWarning && props.contentEditable && props.children != null) {
      console.error('A component is `contentEditable` and contains `children` managed by ' + 'React. It is now your responsibility to guarantee that none of ' + 'those nodes are unexpectedly modified or duplicated. This is ' + 'probably not intentional.');
    }

    if (formatContext.insertionMode !== SVG_MODE && formatContext.insertionMode !== MATHML_MODE) {
      if (type.indexOf('-') === -1 && type.toLowerCase() !== type) {
        console.error('<%s /> is using incorrect casing. ' + 'Use PascalCase for React components, ' + 'or lowercase for HTML elements.', type);
      }
    }
  }

  switch (type) {
    case 'div':
    case 'span':
    case 'svg':
    case 'path':
      // Fast track very common tags
      break;

    case 'a':
      return pushStartAnchor(target, props, formatContext);

    case 'g':
    case 'p':
    case 'li':
      // Fast track very common tags
      break;
    // Special tags

    case 'select':
      return pushStartSelect(target, props, formatContext);

    case 'option':
      return pushStartOption(target, props, formatContext);

    case 'textarea':
      return pushStartTextArea(target, props, formatContext);

    case 'input':
      return pushInput(target, props, resumableState, renderState, formatContext);

    case 'button':
      return pushStartButton(target, props, resumableState, renderState, formatContext);

    case 'form':
      return pushStartForm(target, props, resumableState, renderState, formatContext);

    case 'menuitem':
      return pushStartMenuItem(target, props, formatContext);

    case 'object':
      return pushStartObject(target, props, formatContext);

    case 'title':
      return pushTitle(target, props, renderState, formatContext);

    case 'link':
      return pushLink(target, props, resumableState, renderState, hoistableState, textEmbedded, formatContext);

    case 'script':
      return pushScript(target, props, resumableState, renderState, textEmbedded, formatContext);

    case 'style':
      return pushStyle(target, props, resumableState, renderState, hoistableState, textEmbedded, formatContext);

    case 'meta':
      return pushMeta(target, props, renderState, textEmbedded, formatContext);
    // Newline eating tags

    case 'listing':
    case 'pre':
      {
        return pushStartPreformattedElement(target, props, type, formatContext);
      }

    case 'img':
      {
        return pushImg(target, props, resumableState, renderState, formatContext);
      }
    // Omitted close tags

    case 'base':
    case 'area':
    case 'br':
    case 'col':
    case 'embed':
    case 'hr':
    case 'keygen':
    case 'param':
    case 'source':
    case 'track':
    case 'wbr':
      {
        return pushSelfClosing(target, props, type, formatContext);
      }
    // These are reserved SVG and MathML elements, that are never custom elements.
    // https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements-core-concepts

    case 'annotation-xml':
    case 'color-profile':
    case 'font-face':
    case 'font-face-src':
    case 'font-face-uri':
    case 'font-face-format':
    case 'font-face-name':
    case 'missing-glyph':
      {
        break;
      }
    // Preamble start tags

    case 'head':
      return pushStartHead(target, props, renderState, preambleState, formatContext);

    case 'body':
      return pushStartBody(target, props, renderState, preambleState, formatContext);

    case 'html':
      {
        return pushStartHtml(target, props, renderState, preambleState, formatContext);
      }

    default:
      {
        if (type.indexOf('-') !== -1) {
          // Custom element
          return pushStartCustomElement(target, props, type, formatContext);
        }
      }
  } // Generic element


  return pushStartGenericElement(target, props, type, formatContext);
}
var endTagCache = new Map();

function endChunkForTag(tag) {
  var chunk = endTagCache.get(tag);

  if (chunk === undefined) {
    chunk = stringToPrecomputedChunk('</' + tag + '>');
    endTagCache.set(tag, chunk);
  }

  return chunk;
}

export function pushEndInstance(target, type, props, resumableState, formatContext) {
  switch (type) {
    // We expect title and script tags to always be pushed in a unit and never
    // return children. when we end up pushing the end tag we want to ensure
    // there is no extra closing tag pushed
    case 'title':
    case 'style':
    case 'script': // Omitted close tags
    // TODO: Instead of repeating this switch we could try to pass a flag from above.
    // That would require returning a tuple. Which might be ok if it gets inlined.
    // fallthrough

    case 'area':
    case 'base':
    case 'br':
    case 'col':
    case 'embed':
    case 'hr':
    case 'img':
    case 'input':
    case 'keygen':
    case 'link':
    case 'meta':
    case 'param':
    case 'source':
    case 'track':
    case 'wbr':
      {
        // No close tag needed.
        return;
      }
    // Postamble end tags
    // When float is enabled we omit the end tags for body and html when
    // they represent the Document.body and Document.documentElement Nodes.
    // This is so we can withhold them until the postamble when we know
    // we won't emit any more tags

    case 'body':
      {
        if (formatContext.insertionMode <= HTML_HTML_MODE) {
          resumableState.hasBody = true;
          return;
        }

        break;
      }

    case 'html':
      if (formatContext.insertionMode === ROOT_HTML_MODE) {
        resumableState.hasHtml = true;
        return;
      }

      break;

    case 'head':
      if (formatContext.insertionMode <= HTML_HTML_MODE) {
        return;
      }

      break;
  }

  target.push(endChunkForTag(type));
}
export function hoistPreambleState(renderState, preambleState) {
  var rootPreamble = renderState.preamble;

  if (rootPreamble.htmlChunks === null && preambleState.htmlChunks) {
    rootPreamble.htmlChunks = preambleState.htmlChunks;
  }

  if (rootPreamble.headChunks === null && preambleState.headChunks) {
    rootPreamble.headChunks = preambleState.headChunks;
  }

  if (rootPreamble.bodyChunks === null && preambleState.bodyChunks) {
    rootPreamble.bodyChunks = preambleState.bodyChunks;
  }
}
export function isPreambleReady(renderState, // This means there are unfinished Suspense boundaries which could contain
// a preamble. In the case of DOM we constrain valid programs to only having
// one instance of each singleton so we can determine the preamble is ready
// as long as we have chunks for each of these tags.
hasPendingPreambles) {
  var preamble = renderState.preamble;
  return (// There are no remaining boundaries which might contain a preamble so
    // the preamble is as complete as it is going to get
    hasPendingPreambles === false || // we have a head and body tag. we don't need to wait for any more
    // because it would be invalid to render additional copies of these tags
    !!(preamble.headChunks && preamble.bodyChunks)
  );
}

function writeBootstrap(destination, renderState) {
  var bootstrapChunks = renderState.bootstrapChunks;
  var i = 0;

  for (; i < bootstrapChunks.length - 1; i++) {
    writeChunk(destination, bootstrapChunks[i]);
  }

  if (i < bootstrapChunks.length) {
    var lastChunk = bootstrapChunks[i];
    bootstrapChunks.length = 0;
    return writeChunkAndReturn(destination, lastChunk);
  }

  return true;
}

var shellTimeRuntimeScript = stringToPrecomputedChunk(markShellTime);

function writeShellTimeInstruction(destination, resumableState, renderState) {
  if (enableFizzExternalRuntime && resumableState.streamingFormat !== ScriptStreamingFormat) {
    // External runtime always tracks the shell time in the runtime.
    return true;
  }

  if ((resumableState.instructions & SentMarkShellTime) !== NothingSent) {
    // We already sent this instruction.
    return true;
  }

  resumableState.instructions |= SentMarkShellTime;
  writeChunk(destination, renderState.startInlineScript);
  writeCompletedShellIdAttribute(destination, resumableState);
  writeChunk(destination, endOfStartTag);
  writeChunk(destination, shellTimeRuntimeScript);
  return writeChunkAndReturn(destination, endInlineScript);
}

export function writeCompletedRoot(destination, resumableState, renderState, isComplete) {
  if (!isComplete) {
    // If we're not already fully complete, we might complete another boundary. If so,
    // we need to track the paint time of the shell so we know how much to throttle the reveal.
    writeShellTimeInstruction(destination, resumableState, renderState);
  }

  if (enableFizzBlockingRender) {
    var preamble = renderState.preamble;

    if (preamble.htmlChunks || preamble.headChunks) {
      // If we rendered the whole document, then we emitted a rel="expect" that needs a
      // matching target. Normally we use one of the bootstrap scripts for this but if
      // there are none, then we need to emit a tag to complete the shell.
      if ((resumableState.instructions & SentCompletedShellId) === NothingSent) {
        writeChunk(destination, startChunkForTag('template'));
        writeCompletedShellIdAttribute(destination, resumableState);
        writeChunk(destination, endOfStartTag);
        writeChunk(destination, endChunkForTag('template'));
      }
    }
  }

  return writeBootstrap(destination, renderState);
} // Structural Nodes
// A placeholder is a node inside a hidden partial tree that can be filled in later, but before
// display. It's never visible to users. We use the template tag because it can be used in every
// type of parent. <script> tags also work in every other tag except <colgroup>.

var placeholder1 = stringToPrecomputedChunk('<template id="');
var placeholder2 = stringToPrecomputedChunk('"></template>');
export function writePlaceholder(destination, renderState, id) {
  writeChunk(destination, placeholder1);
  writeChunk(destination, renderState.placeholderPrefix);
  var formattedID = stringToChunk(id.toString(16));
  writeChunk(destination, formattedID);
  return writeChunkAndReturn(destination, placeholder2);
} // Activity boundaries are encoded as comments.

var startActivityBoundary = stringToPrecomputedChunk('<!--&-->');
var endActivityBoundary = stringToPrecomputedChunk('<!--/&-->');
export function pushStartActivityBoundary(target, renderState) {
  target.push(startActivityBoundary);
}
export function pushEndActivityBoundary(target, renderState) {
  target.push(endActivityBoundary);
} // Suspense boundaries are encoded as comments.

var startCompletedSuspenseBoundary = stringToPrecomputedChunk('<!--$-->');
var startPendingSuspenseBoundary1 = stringToPrecomputedChunk('<!--$?--><template id="');
var startPendingSuspenseBoundary2 = stringToPrecomputedChunk('"></template>');
var startClientRenderedSuspenseBoundary = stringToPrecomputedChunk('<!--$!-->');
var endSuspenseBoundary = stringToPrecomputedChunk('<!--/$-->');
var clientRenderedSuspenseBoundaryError1 = stringToPrecomputedChunk('<template');
var clientRenderedSuspenseBoundaryErrorAttrInterstitial = stringToPrecomputedChunk('"');
var clientRenderedSuspenseBoundaryError1A = stringToPrecomputedChunk(' data-dgst="');
var clientRenderedSuspenseBoundaryError1B = stringToPrecomputedChunk(' data-msg="');
var clientRenderedSuspenseBoundaryError1C = stringToPrecomputedChunk(' data-stck="');
var clientRenderedSuspenseBoundaryError1D = stringToPrecomputedChunk(' data-cstck="');
var clientRenderedSuspenseBoundaryError2 = stringToPrecomputedChunk('></template>');
export function writeStartCompletedSuspenseBoundary(destination, renderState) {
  return writeChunkAndReturn(destination, startCompletedSuspenseBoundary);
}
export function writeStartPendingSuspenseBoundary(destination, renderState, id) {
  writeChunk(destination, startPendingSuspenseBoundary1);

  if (id === null) {
    throw new Error('An ID must have been assigned before we can complete the boundary.');
  }

  writeChunk(destination, renderState.boundaryPrefix);
  writeChunk(destination, stringToChunk(id.toString(16)));
  return writeChunkAndReturn(destination, startPendingSuspenseBoundary2);
}
export function writeStartClientRenderedSuspenseBoundary(destination, renderState, errorDigest, errorMessage, errorStack, errorComponentStack) {
  var result;
  result = writeChunkAndReturn(destination, startClientRenderedSuspenseBoundary);
  writeChunk(destination, clientRenderedSuspenseBoundaryError1);

  if (errorDigest) {
    writeChunk(destination, clientRenderedSuspenseBoundaryError1A);
    writeChunk(destination, stringToChunk(escapeTextForBrowser(errorDigest)));
    writeChunk(destination, clientRenderedSuspenseBoundaryErrorAttrInterstitial);
  }

  if (__DEV__) {
    if (errorMessage) {
      writeChunk(destination, clientRenderedSuspenseBoundaryError1B);
      writeChunk(destination, stringToChunk(escapeTextForBrowser(errorMessage)));
      writeChunk(destination, clientRenderedSuspenseBoundaryErrorAttrInterstitial);
    }

    if (errorStack) {
      writeChunk(destination, clientRenderedSuspenseBoundaryError1C);
      writeChunk(destination, stringToChunk(escapeTextForBrowser(errorStack)));
      writeChunk(destination, clientRenderedSuspenseBoundaryErrorAttrInterstitial);
    }

    if (errorComponentStack) {
      writeChunk(destination, clientRenderedSuspenseBoundaryError1D);
      writeChunk(destination, stringToChunk(escapeTextForBrowser(errorComponentStack)));
      writeChunk(destination, clientRenderedSuspenseBoundaryErrorAttrInterstitial);
    }
  }

  result = writeChunkAndReturn(destination, clientRenderedSuspenseBoundaryError2);
  return result;
}
export function writeEndCompletedSuspenseBoundary(destination, renderState) {
  return writeChunkAndReturn(destination, endSuspenseBoundary);
}
export function writeEndPendingSuspenseBoundary(destination, renderState) {
  return writeChunkAndReturn(destination, endSuspenseBoundary);
}
export function writeEndClientRenderedSuspenseBoundary(destination, renderState) {
  return writeChunkAndReturn(destination, endSuspenseBoundary);
}
var startSegmentHTML = stringToPrecomputedChunk('<div hidden id="');
var startSegmentHTML2 = stringToPrecomputedChunk('">');
var endSegmentHTML = stringToPrecomputedChunk('</div>');
var startSegmentSVG = stringToPrecomputedChunk('<svg aria-hidden="true" style="display:none" id="');
var startSegmentSVG2 = stringToPrecomputedChunk('">');
var endSegmentSVG = stringToPrecomputedChunk('</svg>');
var startSegmentMathML = stringToPrecomputedChunk('<math aria-hidden="true" style="display:none" id="');
var startSegmentMathML2 = stringToPrecomputedChunk('">');
var endSegmentMathML = stringToPrecomputedChunk('</math>');
var startSegmentTable = stringToPrecomputedChunk('<table hidden id="');
var startSegmentTable2 = stringToPrecomputedChunk('">');
var endSegmentTable = stringToPrecomputedChunk('</table>');
var startSegmentTableBody = stringToPrecomputedChunk('<table hidden><tbody id="');
var startSegmentTableBody2 = stringToPrecomputedChunk('">');
var endSegmentTableBody = stringToPrecomputedChunk('</tbody></table>');
var startSegmentTableRow = stringToPrecomputedChunk('<table hidden><tr id="');
var startSegmentTableRow2 = stringToPrecomputedChunk('">');
var endSegmentTableRow = stringToPrecomputedChunk('</tr></table>');
var startSegmentColGroup = stringToPrecomputedChunk('<table hidden><colgroup id="');
var startSegmentColGroup2 = stringToPrecomputedChunk('">');
var endSegmentColGroup = stringToPrecomputedChunk('</colgroup></table>');
export function writeStartSegment(destination, renderState, formatContext, id) {
  switch (formatContext.insertionMode) {
    case ROOT_HTML_MODE:
    case HTML_HTML_MODE:
    case HTML_HEAD_MODE:
    case HTML_MODE:
      {
        writeChunk(destination, startSegmentHTML);
        writeChunk(destination, renderState.segmentPrefix);
        writeChunk(destination, stringToChunk(id.toString(16)));
        return writeChunkAndReturn(destination, startSegmentHTML2);
      }

    case SVG_MODE:
      {
        writeChunk(destination, startSegmentSVG);
        writeChunk(destination, renderState.segmentPrefix);
        writeChunk(destination, stringToChunk(id.toString(16)));
        return writeChunkAndReturn(destination, startSegmentSVG2);
      }

    case MATHML_MODE:
      {
        writeChunk(destination, startSegmentMathML);
        writeChunk(destination, renderState.segmentPrefix);
        writeChunk(destination, stringToChunk(id.toString(16)));
        return writeChunkAndReturn(destination, startSegmentMathML2);
      }

    case HTML_TABLE_MODE:
      {
        writeChunk(destination, startSegmentTable);
        writeChunk(destination, renderState.segmentPrefix);
        writeChunk(destination, stringToChunk(id.toString(16)));
        return writeChunkAndReturn(destination, startSegmentTable2);
      }
    // TODO: For the rest of these, there will be extra wrapper nodes that never
    // get deleted from the document. We need to delete the table too as part
    // of the injected scripts. They are invisible though so it's not too terrible
    // and it's kind of an edge case to suspend in a table. Totally supported though.

    case HTML_TABLE_BODY_MODE:
      {
        writeChunk(destination, startSegmentTableBody);
        writeChunk(destination, renderState.segmentPrefix);
        writeChunk(destination, stringToChunk(id.toString(16)));
        return writeChunkAndReturn(destination, startSegmentTableBody2);
      }

    case HTML_TABLE_ROW_MODE:
      {
        writeChunk(destination, startSegmentTableRow);
        writeChunk(destination, renderState.segmentPrefix);
        writeChunk(destination, stringToChunk(id.toString(16)));
        return writeChunkAndReturn(destination, startSegmentTableRow2);
      }

    case HTML_COLGROUP_MODE:
      {
        writeChunk(destination, startSegmentColGroup);
        writeChunk(destination, renderState.segmentPrefix);
        writeChunk(destination, stringToChunk(id.toString(16)));
        return writeChunkAndReturn(destination, startSegmentColGroup2);
      }

    default:
      {
        throw new Error('Unknown insertion mode. This is a bug in React.');
      }
  }
}
export function writeEndSegment(destination, formatContext) {
  switch (formatContext.insertionMode) {
    case ROOT_HTML_MODE:
    case HTML_HTML_MODE:
    case HTML_HEAD_MODE:
    case HTML_MODE:
      {
        return writeChunkAndReturn(destination, endSegmentHTML);
      }

    case SVG_MODE:
      {
        return writeChunkAndReturn(destination, endSegmentSVG);
      }

    case MATHML_MODE:
      {
        return writeChunkAndReturn(destination, endSegmentMathML);
      }

    case HTML_TABLE_MODE:
      {
        return writeChunkAndReturn(destination, endSegmentTable);
      }

    case HTML_TABLE_BODY_MODE:
      {
        return writeChunkAndReturn(destination, endSegmentTableBody);
      }

    case HTML_TABLE_ROW_MODE:
      {
        return writeChunkAndReturn(destination, endSegmentTableRow);
      }

    case HTML_COLGROUP_MODE:
      {
        return writeChunkAndReturn(destination, endSegmentColGroup);
      }

    default:
      {
        throw new Error('Unknown insertion mode. This is a bug in React.');
      }
  }
}
var completeSegmentScript1Full = stringToPrecomputedChunk(completeSegmentFunction + '$RS("');
var completeSegmentScript1Partial = stringToPrecomputedChunk('$RS("');
var completeSegmentScript2 = stringToPrecomputedChunk('","');
var completeSegmentScriptEnd = stringToPrecomputedChunk('")</script>');
var completeSegmentData1 = stringToPrecomputedChunk('<template data-rsi="" data-sid="');
var completeSegmentData2 = stringToPrecomputedChunk('" data-pid="');
var completeSegmentDataEnd = dataElementQuotedEnd;
export function writeCompletedSegmentInstruction(destination, resumableState, renderState, contentSegmentID) {
  var scriptFormat = !enableFizzExternalRuntime || resumableState.streamingFormat === ScriptStreamingFormat;

  if (scriptFormat) {
    writeChunk(destination, renderState.startInlineScript);
    writeChunk(destination, endOfStartTag);

    if ((resumableState.instructions & SentCompleteSegmentFunction) === NothingSent) {
      // The first time we write this, we'll need to include the full implementation.
      resumableState.instructions |= SentCompleteSegmentFunction;
      writeChunk(destination, completeSegmentScript1Full);
    } else {
      // Future calls can just reuse the same function.
      writeChunk(destination, completeSegmentScript1Partial);
    }
  } else {
    writeChunk(destination, completeSegmentData1);
  } // Write function arguments, which are string literals


  writeChunk(destination, renderState.segmentPrefix);
  var formattedID = stringToChunk(contentSegmentID.toString(16));
  writeChunk(destination, formattedID);

  if (scriptFormat) {
    writeChunk(destination, completeSegmentScript2);
  } else {
    writeChunk(destination, completeSegmentData2);
  }

  writeChunk(destination, renderState.placeholderPrefix);
  writeChunk(destination, formattedID);

  if (scriptFormat) {
    return writeChunkAndReturn(destination, completeSegmentScriptEnd);
  } else {
    return writeChunkAndReturn(destination, completeSegmentDataEnd);
  }
}
var completeBoundaryScriptFunctionOnly = stringToPrecomputedChunk(completeBoundaryFunction);
var completeBoundaryUpgradeToViewTransitionsInstruction = stringToPrecomputedChunk(upgradeToViewTransitionsInstruction);
var completeBoundaryScript1Partial = stringToPrecomputedChunk('$RC("');
var completeBoundaryWithStylesScript1FullPartial = stringToPrecomputedChunk(styleInsertionFunction + '$RR("');
var completeBoundaryWithStylesScript1Partial = stringToPrecomputedChunk('$RR("');
var completeBoundaryScript2 = stringToPrecomputedChunk('","');
var completeBoundaryScript3a = stringToPrecomputedChunk('",');
var completeBoundaryScript3b = stringToPrecomputedChunk('"');
var completeBoundaryScriptEnd = stringToPrecomputedChunk(')</script>');
var completeBoundaryData1 = stringToPrecomputedChunk('<template data-rci="" data-bid="');
var completeBoundaryWithStylesData1 = stringToPrecomputedChunk('<template data-rri="" data-bid="');
var completeBoundaryData2 = stringToPrecomputedChunk('" data-sid="');
var completeBoundaryData3a = stringToPrecomputedChunk('" data-sty="');
var completeBoundaryDataEnd = dataElementQuotedEnd;
export function writeCompletedBoundaryInstruction(destination, resumableState, renderState, id, hoistableState) {
  var requiresStyleInsertion = renderState.stylesToHoist;
  var requiresViewTransitions = enableViewTransition && (resumableState.instructions & NeedUpgradeToViewTransitions) !== NothingSent; // If necessary stylesheets will be flushed with this instruction.
  // Any style tags not yet hoisted in the Document will also be hoisted.
  // We reset this state since after this instruction executes all styles
  // up to this point will have been hoisted

  renderState.stylesToHoist = false;
  var scriptFormat = !enableFizzExternalRuntime || resumableState.streamingFormat === ScriptStreamingFormat;

  if (scriptFormat) {
    writeChunk(destination, renderState.startInlineScript);
    writeChunk(destination, endOfStartTag);

    if (requiresStyleInsertion) {
      if ((resumableState.instructions & SentClientRenderFunction) === NothingSent) {
        // The completeBoundaryWithStyles function depends on the client render function.
        resumableState.instructions |= SentClientRenderFunction;
        writeChunk(destination, clientRenderScriptFunctionOnly);
      }

      if ((resumableState.instructions & SentCompleteBoundaryFunction) === NothingSent) {
        // The completeBoundaryWithStyles function depends on the complete boundary function.
        resumableState.instructions |= SentCompleteBoundaryFunction;
        writeChunk(destination, completeBoundaryScriptFunctionOnly);
      }

      if (requiresViewTransitions && (resumableState.instructions & SentUpgradeToViewTransitions) === NothingSent) {
        resumableState.instructions |= SentUpgradeToViewTransitions;
        writeChunk(destination, completeBoundaryUpgradeToViewTransitionsInstruction);
      }

      if ((resumableState.instructions & SentStyleInsertionFunction) === NothingSent) {
        resumableState.instructions |= SentStyleInsertionFunction;
        writeChunk(destination, completeBoundaryWithStylesScript1FullPartial);
      } else {
        writeChunk(destination, completeBoundaryWithStylesScript1Partial);
      }
    } else {
      if ((resumableState.instructions & SentCompleteBoundaryFunction) === NothingSent) {
        resumableState.instructions |= SentCompleteBoundaryFunction;
        writeChunk(destination, completeBoundaryScriptFunctionOnly);
      }

      if (requiresViewTransitions && (resumableState.instructions & SentUpgradeToViewTransitions) === NothingSent) {
        resumableState.instructions |= SentUpgradeToViewTransitions;
        writeChunk(destination, completeBoundaryUpgradeToViewTransitionsInstruction);
      }

      writeChunk(destination, completeBoundaryScript1Partial);
    }
  } else {
    if (requiresStyleInsertion) {
      writeChunk(destination, completeBoundaryWithStylesData1);
    } else {
      writeChunk(destination, completeBoundaryData1);
    }
  }

  var idChunk = stringToChunk(id.toString(16));
  writeChunk(destination, renderState.boundaryPrefix);
  writeChunk(destination, idChunk); // Write function arguments, which are string and array literals

  if (scriptFormat) {
    writeChunk(destination, completeBoundaryScript2);
  } else {
    writeChunk(destination, completeBoundaryData2);
  }

  writeChunk(destination, renderState.segmentPrefix);
  writeChunk(destination, idChunk);

  if (requiresStyleInsertion) {
    // Script and data writers must format this differently:
    //  - script writer emits an array literal, whose string elements are
    //    escaped for javascript  e.g. ["A", "B"]
    //  - data writer emits a string literal, which is escaped as html
    //    e.g. [&#34;A&#34;, &#34;B&#34;]
    if (scriptFormat) {
      writeChunk(destination, completeBoundaryScript3a); // hoistableState encodes an array literal

      writeStyleResourceDependenciesInJS(destination, hoistableState);
    } else {
      writeChunk(destination, completeBoundaryData3a);
      writeStyleResourceDependenciesInAttr(destination, hoistableState);
    }
  } else {
    if (scriptFormat) {
      writeChunk(destination, completeBoundaryScript3b);
    }
  }

  var writeMore;

  if (scriptFormat) {
    writeMore = writeChunkAndReturn(destination, completeBoundaryScriptEnd);
  } else {
    writeMore = writeChunkAndReturn(destination, completeBoundaryDataEnd);
  }

  return writeBootstrap(destination, renderState) && writeMore;
}
var clientRenderScriptFunctionOnly = stringToPrecomputedChunk(clientRenderFunction);
var clientRenderScript1Full = stringToPrecomputedChunk(clientRenderFunction + ';$RX("');
var clientRenderScript1Partial = stringToPrecomputedChunk('$RX("');
var clientRenderScript1A = stringToPrecomputedChunk('"');
var clientRenderErrorScriptArgInterstitial = stringToPrecomputedChunk(',');
var clientRenderScriptEnd = stringToPrecomputedChunk(')</script>');
var clientRenderData1 = stringToPrecomputedChunk('<template data-rxi="" data-bid="');
var clientRenderData2 = stringToPrecomputedChunk('" data-dgst="');
var clientRenderData3 = stringToPrecomputedChunk('" data-msg="');
var clientRenderData4 = stringToPrecomputedChunk('" data-stck="');
var clientRenderData5 = stringToPrecomputedChunk('" data-cstck="');
var clientRenderDataEnd = dataElementQuotedEnd;
export function writeClientRenderBoundaryInstruction(destination, resumableState, renderState, id, errorDigest, errorMessage, errorStack, errorComponentStack) {
  var scriptFormat = !enableFizzExternalRuntime || resumableState.streamingFormat === ScriptStreamingFormat;

  if (scriptFormat) {
    writeChunk(destination, renderState.startInlineScript);
    writeChunk(destination, endOfStartTag);

    if ((resumableState.instructions & SentClientRenderFunction) === NothingSent) {
      // The first time we write this, we'll need to include the full implementation.
      resumableState.instructions |= SentClientRenderFunction;
      writeChunk(destination, clientRenderScript1Full);
    } else {
      // Future calls can just reuse the same function.
      writeChunk(destination, clientRenderScript1Partial);
    }
  } else {
    // <template data-rxi="" data-bid="
    writeChunk(destination, clientRenderData1);
  }

  writeChunk(destination, renderState.boundaryPrefix);
  writeChunk(destination, stringToChunk(id.toString(16)));

  if (scriptFormat) {
    // " needs to be inserted for scripts, since ArgInterstitual does not contain
    // leading or trailing quotes
    writeChunk(destination, clientRenderScript1A);
  }

  if (errorDigest || errorMessage || errorStack || errorComponentStack) {
    if (scriptFormat) {
      // ,"JSONString"
      writeChunk(destination, clientRenderErrorScriptArgInterstitial);
      writeChunk(destination, stringToChunk(escapeJSStringsForInstructionScripts(errorDigest || '')));
    } else {
      // " data-dgst="HTMLString
      writeChunk(destination, clientRenderData2);
      writeChunk(destination, stringToChunk(escapeTextForBrowser(errorDigest || '')));
    }
  }

  if (errorMessage || errorStack || errorComponentStack) {
    if (scriptFormat) {
      // ,"JSONString"
      writeChunk(destination, clientRenderErrorScriptArgInterstitial);
      writeChunk(destination, stringToChunk(escapeJSStringsForInstructionScripts(errorMessage || '')));
    } else {
      // " data-msg="HTMLString
      writeChunk(destination, clientRenderData3);
      writeChunk(destination, stringToChunk(escapeTextForBrowser(errorMessage || '')));
    }
  }

  if (errorStack || errorComponentStack) {
    // ,"JSONString"
    if (scriptFormat) {
      writeChunk(destination, clientRenderErrorScriptArgInterstitial);
      writeChunk(destination, stringToChunk(escapeJSStringsForInstructionScripts(errorStack || '')));
    } else {
      // " data-stck="HTMLString
      writeChunk(destination, clientRenderData4);
      writeChunk(destination, stringToChunk(escapeTextForBrowser(errorStack || '')));
    }
  }

  if (errorComponentStack) {
    // ,"JSONString"
    if (scriptFormat) {
      writeChunk(destination, clientRenderErrorScriptArgInterstitial);
      writeChunk(destination, stringToChunk(escapeJSStringsForInstructionScripts(errorComponentStack)));
    } else {
      // " data-cstck="HTMLString
      writeChunk(destination, clientRenderData5);
      writeChunk(destination, stringToChunk(escapeTextForBrowser(errorComponentStack)));
    }
  }

  if (scriptFormat) {
    // ></script>
    return writeChunkAndReturn(destination, clientRenderScriptEnd);
  } else {
    // "></template>
    return writeChunkAndReturn(destination, clientRenderDataEnd);
  }
}
var regexForJSStringsInInstructionScripts = /[<\u2028\u2029]/g;

function escapeJSStringsForInstructionScripts(input) {
  var escaped = JSON.stringify(input);
  return escaped.replace(regexForJSStringsInInstructionScripts, function (match) {
    switch (match) {
      // santizing breaking out of strings and script tags
      case '<':
        return "\\u003c";

      case "\u2028":
        return "\\u2028";

      case "\u2029":
        return "\\u2029";

      default:
        {
          // eslint-disable-next-line react-internal/prod-error-codes
          throw new Error('escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React');
        }
    }
  });
}

var regexForJSStringsInScripts = /[&><\u2028\u2029]/g;

function escapeJSObjectForInstructionScripts(input) {
  var escaped = JSON.stringify(input);
  return escaped.replace(regexForJSStringsInScripts, function (match) {
    switch (match) {
      // santizing breaking out of strings and script tags
      case '&':
        return "\\u0026";

      case '>':
        return "\\u003e";

      case '<':
        return "\\u003c";

      case "\u2028":
        return "\\u2028";

      case "\u2029":
        return "\\u2029";

      default:
        {
          // eslint-disable-next-line react-internal/prod-error-codes
          throw new Error('escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React');
        }
    }
  });
}

var lateStyleTagResourceOpen1 = stringToPrecomputedChunk(' media="not all" data-precedence="');
var lateStyleTagResourceOpen2 = stringToPrecomputedChunk('" data-href="');
var lateStyleTagResourceOpen3 = stringToPrecomputedChunk('">');
var lateStyleTagTemplateClose = stringToPrecomputedChunk('</style>'); // Tracks whether the boundary currently flushing is flushign style tags or has any
// stylesheet dependencies not flushed in the Preamble.

var currentlyRenderingBoundaryHasStylesToHoist = false; // Acts as a return value for the forEach execution of style tag flushing.

var destinationHasCapacity = true;

function flushStyleTagsLateForBoundary(this, styleQueue) {
  var rules = styleQueue.rules;
  var hrefs = styleQueue.hrefs;

  if (__DEV__) {
    if (rules.length > 0 && hrefs.length === 0) {
      console.error('React expected to have at least one href for an a hoistable style but found none. This is a bug in React.');
    }
  }

  var i = 0;

  if (hrefs.length) {
    writeChunk(this, currentlyFlushingRenderState.startInlineStyle);
    writeChunk(this, lateStyleTagResourceOpen1);
    writeChunk(this, styleQueue.precedence);
    writeChunk(this, lateStyleTagResourceOpen2);

    for (; i < hrefs.length - 1; i++) {
      writeChunk(this, hrefs[i]);
      writeChunk(this, spaceSeparator);
    }

    writeChunk(this, hrefs[i]);
    writeChunk(this, lateStyleTagResourceOpen3);

    for (i = 0; i < rules.length; i++) {
      writeChunk(this, rules[i]);
    }

    destinationHasCapacity = writeChunkAndReturn(this, lateStyleTagTemplateClose); // We wrote style tags for this boundary and we may need to emit a script
    // to hoist them.

    currentlyRenderingBoundaryHasStylesToHoist = true; // style resources can flush continuously since more rules may be written into
    // them with new hrefs. Instead of marking it flushed, we simply reset the chunks
    // and hrefs

    rules.length = 0;
    hrefs.length = 0;
  }
}

function hasStylesToHoist(stylesheet) {
  // We need to reveal boundaries with styles whenever a stylesheet it depends on is either
  // not flushed or flushed after the preamble (shell).
  if (stylesheet.state !== PREAMBLE) {
    currentlyRenderingBoundaryHasStylesToHoist = true;
    return true;
  }

  return false;
}

export function writeHoistablesForBoundary(destination, hoistableState, renderState) {
  // Reset these on each invocation, they are only safe to read in this function
  currentlyRenderingBoundaryHasStylesToHoist = false;
  destinationHasCapacity = true; // Flush style tags for each precedence this boundary depends on

  currentlyFlushingRenderState = renderState;
  hoistableState.styles.forEach(flushStyleTagsLateForBoundary, destination);
  currentlyFlushingRenderState = null; // Determine if this boundary has stylesheets that need to be awaited upon completion

  hoistableState.stylesheets.forEach(hasStylesToHoist); // We don't actually want to flush any hoistables until the boundary is complete so we omit
  // any further writing here. This is becuase unlike Resources, Hoistable Elements act more like
  // regular elements, each rendered element has a unique representation in the DOM. We don't want
  // these elements to appear in the DOM early, before the boundary has actually completed

  if (currentlyRenderingBoundaryHasStylesToHoist) {
    renderState.stylesToHoist = true;
  }

  return destinationHasCapacity;
}

function flushResource(this, resource) {
  for (var i = 0; i < resource.length; i++) {
    writeChunk(this, resource[i]);
  }

  resource.length = 0;
}

var stylesheetFlushingQueue = [];

function flushStyleInPreamble(this, stylesheet, key, map) {
  // We still need to encode stylesheet chunks
  // because unlike most Hoistables and Resources we do not eagerly encode
  // them during render. This is because if we flush late we have to send a
  // different encoding and we don't want to encode multiple times
  pushLinkImpl(stylesheetFlushingQueue, stylesheet.props);

  for (var i = 0; i < stylesheetFlushingQueue.length; i++) {
    writeChunk(this, stylesheetFlushingQueue[i]);
  }

  stylesheetFlushingQueue.length = 0;
  stylesheet.state = PREAMBLE;
}

var styleTagResourceOpen1 = stringToPrecomputedChunk(' data-precedence="');
var styleTagResourceOpen2 = stringToPrecomputedChunk('" data-href="');
var spaceSeparator = stringToPrecomputedChunk(' ');
var styleTagResourceOpen3 = stringToPrecomputedChunk('">');
var styleTagResourceClose = stringToPrecomputedChunk('</style>');

function flushStylesInPreamble(this, styleQueue, precedence) {
  var hasStylesheets = styleQueue.sheets.size > 0;
  styleQueue.sheets.forEach(flushStyleInPreamble, this);
  styleQueue.sheets.clear();
  var rules = styleQueue.rules;
  var hrefs = styleQueue.hrefs; // If we don't emit any stylesheets at this precedence we still need to maintain the precedence
  // order so even if there are no rules for style tags at this precedence we emit an empty style
  // tag with the data-precedence attribute

  if (!hasStylesheets || hrefs.length) {
    writeChunk(this, currentlyFlushingRenderState.startInlineStyle);
    writeChunk(this, styleTagResourceOpen1);
    writeChunk(this, styleQueue.precedence);
    var i = 0;

    if (hrefs.length) {
      writeChunk(this, styleTagResourceOpen2);

      for (; i < hrefs.length - 1; i++) {
        writeChunk(this, hrefs[i]);
        writeChunk(this, spaceSeparator);
      }

      writeChunk(this, hrefs[i]);
    }

    writeChunk(this, styleTagResourceOpen3);

    for (i = 0; i < rules.length; i++) {
      writeChunk(this, rules[i]);
    }

    writeChunk(this, styleTagResourceClose); // style resources can flush continuously since more rules may be written into
    // them with new hrefs. Instead of marking it flushed, we simply reset the chunks
    // and hrefs

    rules.length = 0;
    hrefs.length = 0;
  }
}

function preloadLateStyle(this, stylesheet) {
  if (stylesheet.state === PENDING) {
    stylesheet.state = PRELOADED;
    var preloadProps = preloadAsStylePropsFromProps(stylesheet.props.href, stylesheet.props);
    pushLinkImpl(stylesheetFlushingQueue, preloadProps);

    for (var i = 0; i < stylesheetFlushingQueue.length; i++) {
      writeChunk(this, stylesheetFlushingQueue[i]);
    }

    stylesheetFlushingQueue.length = 0;
  }
}

function preloadLateStyles(this, styleQueue) {
  styleQueue.sheets.forEach(preloadLateStyle, this);
  styleQueue.sheets.clear();
}

var blockingRenderChunkStart = stringToPrecomputedChunk('<link rel="expect" href="#');
var blockingRenderChunkEnd = stringToPrecomputedChunk('" blocking="render"/>');

function writeBlockingRenderInstruction(destination, resumableState, renderState) {
  if (enableFizzBlockingRender) {
    var idPrefix = resumableState.idPrefix;
    var shellId = "\xAB" + idPrefix + "R\xBB";
    writeChunk(destination, blockingRenderChunkStart);
    writeChunk(destination, stringToChunk(escapeTextForBrowser(shellId)));
    writeChunk(destination, blockingRenderChunkEnd);
  }
}

var completedShellIdAttributeStart = stringToPrecomputedChunk(' id="');

function writeCompletedShellIdAttribute(destination, resumableState) {
  if ((resumableState.instructions & SentCompletedShellId) !== NothingSent) {
    return;
  }

  resumableState.instructions |= SentCompletedShellId;
  var idPrefix = resumableState.idPrefix;
  var shellId = "\xAB" + idPrefix + "R\xBB";
  writeChunk(destination, completedShellIdAttributeStart);
  writeChunk(destination, stringToChunk(escapeTextForBrowser(shellId)));
  writeChunk(destination, attributeEnd);
}

function pushCompletedShellIdAttribute(target, resumableState) {
  if ((resumableState.instructions & SentCompletedShellId) !== NothingSent) {
    return;
  }

  resumableState.instructions |= SentCompletedShellId;
  var idPrefix = resumableState.idPrefix;
  var shellId = "\xAB" + idPrefix + "R\xBB";
  target.push(completedShellIdAttributeStart, stringToChunk(escapeTextForBrowser(shellId)), attributeEnd);
} // We don't bother reporting backpressure at the moment because we expect to
// flush the entire preamble in a single pass. This probably should be modified
// in the future to be backpressure sensitive but that requires a larger refactor
// of the flushing code in Fizz.


export function writePreambleStart(destination, resumableState, renderState, skipExpect // Used as an override by ReactFizzConfigMarkup
) {
  // This function must be called exactly once on every request
  if (enableFizzExternalRuntime && renderState.externalRuntimeScript) {
    // If the root segment is incomplete due to suspended tasks
    // (e.g. willFlushAllSegments = false) and we are using data
    // streaming format, ensure the external runtime is sent.
    // (User code could choose to send this even earlier by calling
    //  preinit(...), if they know they will suspend).
    var _renderState$external = renderState.externalRuntimeScript,
        src = _renderState$external.src,
        chunks = _renderState$external.chunks;
    internalPreinitScript(resumableState, renderState, src, chunks);
  }

  var preamble = renderState.preamble;
  var htmlChunks = preamble.htmlChunks;
  var headChunks = preamble.headChunks;
  var i = 0; // Emit open tags before Hoistables and Resources

  if (htmlChunks) {
    // We have an <html> to emit as part of the preamble
    for (i = 0; i < htmlChunks.length; i++) {
      writeChunk(destination, htmlChunks[i]);
    }

    if (headChunks) {
      for (i = 0; i < headChunks.length; i++) {
        writeChunk(destination, headChunks[i]);
      }
    } else {
      // We did not render a head but we emitted an <html> so we emit one now
      writeChunk(destination, startChunkForTag('head'));
      writeChunk(destination, endOfStartTag);
    }
  } else if (headChunks) {
    // We do not have an <html> but we do have a <head>
    for (i = 0; i < headChunks.length; i++) {
      writeChunk(destination, headChunks[i]);
    }
  } // Emit high priority Hoistables


  var charsetChunks = renderState.charsetChunks;

  for (i = 0; i < charsetChunks.length; i++) {
    writeChunk(destination, charsetChunks[i]);
  }

  charsetChunks.length = 0; // emit preconnect resources

  renderState.preconnects.forEach(flushResource, destination);
  renderState.preconnects.clear();
  var viewportChunks = renderState.viewportChunks;

  for (i = 0; i < viewportChunks.length; i++) {
    writeChunk(destination, viewportChunks[i]);
  }

  viewportChunks.length = 0;
  renderState.fontPreloads.forEach(flushResource, destination);
  renderState.fontPreloads.clear();
  renderState.highImagePreloads.forEach(flushResource, destination);
  renderState.highImagePreloads.clear(); // Flush unblocked stylesheets by precedence

  currentlyFlushingRenderState = renderState;
  renderState.styles.forEach(flushStylesInPreamble, destination);
  currentlyFlushingRenderState = null;
  var importMapChunks = renderState.importMapChunks;

  for (i = 0; i < importMapChunks.length; i++) {
    writeChunk(destination, importMapChunks[i]);
  }

  importMapChunks.length = 0;
  renderState.bootstrapScripts.forEach(flushResource, destination);
  renderState.scripts.forEach(flushResource, destination);
  renderState.scripts.clear();
  renderState.bulkPreloads.forEach(flushResource, destination);
  renderState.bulkPreloads.clear();

  if ((htmlChunks || headChunks) && !skipExpect) {
    // If we have any html or head chunks we know that we're rendering a full document.
    // A full document should block display until the full shell has downloaded.
    // Therefore we insert a render blocking instruction referring to the last body
    // element that's considered part of the shell. We do this after the important loads
    // have already been emitted so we don't do anything to delay them but early so that
    // the browser doesn't risk painting too early.
    writeBlockingRenderInstruction(destination, resumableState, renderState);
  } // Write embedding hoistableChunks


  var hoistableChunks = renderState.hoistableChunks;

  for (i = 0; i < hoistableChunks.length; i++) {
    writeChunk(destination, hoistableChunks[i]);
  }

  hoistableChunks.length = 0;
} // We don't bother reporting backpressure at the moment because we expect to
// flush the entire preamble in a single pass. This probably should be modified
// in the future to be backpressure sensitive but that requires a larger refactor
// of the flushing code in Fizz.

export function writePreambleEnd(destination, renderState) {
  var preamble = renderState.preamble;
  var htmlChunks = preamble.htmlChunks;
  var headChunks = preamble.headChunks;

  if (htmlChunks || headChunks) {
    // we have an <html> but we inserted an implicit <head> tag. We need
    // to close it since the main content won't have it
    writeChunk(destination, endChunkForTag('head'));
  }

  var bodyChunks = preamble.bodyChunks;

  if (bodyChunks) {
    for (var i = 0; i < bodyChunks.length; i++) {
      writeChunk(destination, bodyChunks[i]);
    }
  }
} // We don't bother reporting backpressure at the moment because we expect to
// flush the entire preamble in a single pass. This probably should be modified
// in the future to be backpressure sensitive but that requires a larger refactor
// of the flushing code in Fizz.

export function writeHoistables(destination, resumableState, renderState) {
  var i = 0; // Emit high priority Hoistables
  // We omit charsetChunks because we have already sent the shell and if it wasn't
  // already sent it is too late now.

  var viewportChunks = renderState.viewportChunks;

  for (i = 0; i < viewportChunks.length; i++) {
    writeChunk(destination, viewportChunks[i]);
  }

  viewportChunks.length = 0;
  renderState.preconnects.forEach(flushResource, destination);
  renderState.preconnects.clear();
  renderState.fontPreloads.forEach(flushResource, destination);
  renderState.fontPreloads.clear();
  renderState.highImagePreloads.forEach(flushResource, destination);
  renderState.highImagePreloads.clear(); // Preload any stylesheets. these will emit in a render instruction that follows this
  // but we want to kick off preloading as soon as possible

  renderState.styles.forEach(preloadLateStyles, destination); // We only hoist importmaps that are configured through createResponse and that will
  // always flush in the preamble. Generally we don't expect people to render them as
  // tags when using React but if you do they are going to be treated like regular inline
  // scripts and flush after other hoistables which is problematic
  // bootstrap scripts should flush above script priority but these can only flush in the preamble
  // so we elide the code here for performance

  renderState.scripts.forEach(flushResource, destination);
  renderState.scripts.clear();
  renderState.bulkPreloads.forEach(flushResource, destination);
  renderState.bulkPreloads.clear(); // Write embedding hoistableChunks

  var hoistableChunks = renderState.hoistableChunks;

  for (i = 0; i < hoistableChunks.length; i++) {
    writeChunk(destination, hoistableChunks[i]);
  }

  hoistableChunks.length = 0;
}
export function writePostamble(destination, resumableState) {
  if (resumableState.hasBody) {
    writeChunk(destination, endChunkForTag('body'));
  }

  if (resumableState.hasHtml) {
    writeChunk(destination, endChunkForTag('html'));
  }
}
var arrayFirstOpenBracket = stringToPrecomputedChunk('[');
var arraySubsequentOpenBracket = stringToPrecomputedChunk(',[');
var arrayInterstitial = stringToPrecomputedChunk(',');
var arrayCloseBracket = stringToPrecomputedChunk(']'); // This function writes a 2D array of strings to be embedded in javascript.
// E.g.
//  [["JS_escaped_string1", "JS_escaped_string2"]]

function writeStyleResourceDependenciesInJS(destination, hoistableState) {
  writeChunk(destination, arrayFirstOpenBracket);
  var nextArrayOpenBrackChunk = arrayFirstOpenBracket;
  hoistableState.stylesheets.forEach(function (resource) {
    if (resource.state === PREAMBLE) {// We can elide this dependency because it was flushed in the shell and
      // should be ready before content is shown on the client
    } else if (resource.state === LATE) {
      // We only need to emit the href because this resource flushed in an earlier
      // boundary already which encoded the attributes necessary to construct
      // the resource instance on the client.
      writeChunk(destination, nextArrayOpenBrackChunk);
      writeStyleResourceDependencyHrefOnlyInJS(destination, resource.props.href);
      writeChunk(destination, arrayCloseBracket);
      nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
    } else {
      // We need to emit the whole resource for insertion on the client
      writeChunk(destination, nextArrayOpenBrackChunk);
      writeStyleResourceDependencyInJS(destination, resource.props.href, resource.props['data-precedence'], resource.props);
      writeChunk(destination, arrayCloseBracket);
      nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
      resource.state = LATE;
    }
  });
  writeChunk(destination, arrayCloseBracket);
}
/* Helper functions */


function writeStyleResourceDependencyHrefOnlyInJS(destination, href) {
  // We should actually enforce this earlier when the resource is created but for
  // now we make sure we are actually dealing with a string here.
  if (__DEV__) {
    checkAttributeStringCoercion(href, 'href');
  }

  var coercedHref = '' + href;
  writeChunk(destination, stringToChunk(escapeJSObjectForInstructionScripts(coercedHref)));
}

function writeStyleResourceDependencyInJS(destination, href, precedence, props) {
  // eslint-disable-next-line react-internal/safe-string-coercion
  var coercedHref = sanitizeURL('' + href);
  writeChunk(destination, stringToChunk(escapeJSObjectForInstructionScripts(coercedHref)));

  if (__DEV__) {
    checkAttributeStringCoercion(precedence, 'precedence');
  }

  var coercedPrecedence = '' + precedence;
  writeChunk(destination, arrayInterstitial);
  writeChunk(destination, stringToChunk(escapeJSObjectForInstructionScripts(coercedPrecedence)));

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'href':
        case 'rel':
        case 'precedence':
        case 'data-precedence':
          {
            break;
          }

        case 'children':
        case 'dangerouslySetInnerHTML':
          throw new Error('link' + " is a self-closing tag and must neither have `children` nor " + 'use `dangerouslySetInnerHTML`.');

        default:
          writeStyleResourceAttributeInJS(destination, propKey, propValue);
          break;
      }
    }
  }

  return null;
}

function writeStyleResourceAttributeInJS(destination, name, value // not null or undefined
) {
  var attributeName = name.toLowerCase();
  var attributeValue;

  switch (typeof value) {
    case 'function':
    case 'symbol':
      return;
  }

  switch (name) {
    // Reserved names
    case 'innerHTML':
    case 'dangerouslySetInnerHTML':
    case 'suppressContentEditableWarning':
    case 'suppressHydrationWarning':
    case 'style':
    case 'ref':
      // Ignored
      return;
    // Attribute renames

    case 'className':
      {
        attributeName = 'class';

        if (__DEV__) {
          checkAttributeStringCoercion(value, attributeName);
        }

        attributeValue = '' + value;
        break;
      }
    // Booleans

    case 'hidden':
      {
        if (value === false) {
          return;
        }

        attributeValue = '';
        break;
      }
    // Santized URLs

    case 'src':
    case 'href':
      {
        value = sanitizeURL(value);

        if (__DEV__) {
          checkAttributeStringCoercion(value, attributeName);
        }

        attributeValue = '' + value;
        break;
      }

    default:
      {
        if ( // unrecognized event handlers are not SSR'd and we (apparently)
        // use on* as hueristic for these handler props
        name.length > 2 && (name[0] === 'o' || name[0] === 'O') && (name[1] === 'n' || name[1] === 'N')) {
          return;
        }

        if (!isAttributeNameSafe(name)) {
          return;
        }

        if (__DEV__) {
          checkAttributeStringCoercion(value, attributeName);
        }

        attributeValue = '' + value;
      }
  }

  writeChunk(destination, arrayInterstitial);
  writeChunk(destination, stringToChunk(escapeJSObjectForInstructionScripts(attributeName)));
  writeChunk(destination, arrayInterstitial);
  writeChunk(destination, stringToChunk(escapeJSObjectForInstructionScripts(attributeValue)));
} // This function writes a 2D array of strings to be embedded in an attribute
// value and read with JSON.parse in ReactDOMServerExternalRuntime.js
// E.g.
//  [[&quot;JSON_escaped_string1&quot;, &quot;JSON_escaped_string2&quot;]]


function writeStyleResourceDependenciesInAttr(destination, hoistableState) {
  writeChunk(destination, arrayFirstOpenBracket);
  var nextArrayOpenBrackChunk = arrayFirstOpenBracket;
  hoistableState.stylesheets.forEach(function (resource) {
    if (resource.state === PREAMBLE) {// We can elide this dependency because it was flushed in the shell and
      // should be ready before content is shown on the client
    } else if (resource.state === LATE) {
      // We only need to emit the href because this resource flushed in an earlier
      // boundary already which encoded the attributes necessary to construct
      // the resource instance on the client.
      writeChunk(destination, nextArrayOpenBrackChunk);
      writeStyleResourceDependencyHrefOnlyInAttr(destination, resource.props.href);
      writeChunk(destination, arrayCloseBracket);
      nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
    } else {
      // We need to emit the whole resource for insertion on the client
      writeChunk(destination, nextArrayOpenBrackChunk);
      writeStyleResourceDependencyInAttr(destination, resource.props.href, resource.props['data-precedence'], resource.props);
      writeChunk(destination, arrayCloseBracket);
      nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
      resource.state = LATE;
    }
  });
  writeChunk(destination, arrayCloseBracket);
}
/* Helper functions */


function writeStyleResourceDependencyHrefOnlyInAttr(destination, href) {
  // We should actually enforce this earlier when the resource is created but for
  // now we make sure we are actually dealing with a string here.
  if (__DEV__) {
    checkAttributeStringCoercion(href, 'href');
  }

  var coercedHref = '' + href;
  writeChunk(destination, stringToChunk(escapeTextForBrowser(JSON.stringify(coercedHref))));
}

function writeStyleResourceDependencyInAttr(destination, href, precedence, props) {
  // eslint-disable-next-line react-internal/safe-string-coercion
  var coercedHref = sanitizeURL('' + href);
  writeChunk(destination, stringToChunk(escapeTextForBrowser(JSON.stringify(coercedHref))));

  if (__DEV__) {
    checkAttributeStringCoercion(precedence, 'precedence');
  }

  var coercedPrecedence = '' + precedence;
  writeChunk(destination, arrayInterstitial);
  writeChunk(destination, stringToChunk(escapeTextForBrowser(JSON.stringify(coercedPrecedence))));

  for (var propKey in props) {
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];

      if (propValue == null) {
        continue;
      }

      switch (propKey) {
        case 'href':
        case 'rel':
        case 'precedence':
        case 'data-precedence':
          {
            break;
          }

        case 'children':
        case 'dangerouslySetInnerHTML':
          throw new Error('link' + " is a self-closing tag and must neither have `children` nor " + 'use `dangerouslySetInnerHTML`.');

        default:
          writeStyleResourceAttributeInAttr(destination, propKey, propValue);
          break;
      }
    }
  }

  return null;
}

function writeStyleResourceAttributeInAttr(destination, name, value // not null or undefined
) {
  var attributeName = name.toLowerCase();
  var attributeValue;

  switch (typeof value) {
    case 'function':
    case 'symbol':
      return;
  }

  switch (name) {
    // Reserved names
    case 'innerHTML':
    case 'dangerouslySetInnerHTML':
    case 'suppressContentEditableWarning':
    case 'suppressHydrationWarning':
    case 'style':
    case 'ref':
      // Ignored
      return;
    // Attribute renames

    case 'className':
      {
        attributeName = 'class';

        if (__DEV__) {
          checkAttributeStringCoercion(value, attributeName);
        }

        attributeValue = '' + value;
        break;
      }
    // Booleans

    case 'hidden':
      {
        if (value === false) {
          return;
        }

        attributeValue = '';
        break;
      }
    // Santized URLs

    case 'src':
    case 'href':
      {
        value = sanitizeURL(value);

        if (__DEV__) {
          checkAttributeStringCoercion(value, attributeName);
        }

        attributeValue = '' + value;
        break;
      }

    default:
      {
        if ( // unrecognized event handlers are not SSR'd and we (apparently)
        // use on* as hueristic for these handler props
        name.length > 2 && (name[0] === 'o' || name[0] === 'O') && (name[1] === 'n' || name[1] === 'N')) {
          return;
        }

        if (!isAttributeNameSafe(name)) {
          return;
        }

        if (__DEV__) {
          checkAttributeStringCoercion(value, attributeName);
        }

        attributeValue = '' + value;
      }
  }

  writeChunk(destination, arrayInterstitial);
  writeChunk(destination, stringToChunk(escapeTextForBrowser(JSON.stringify(attributeName))));
  writeChunk(destination, arrayInterstitial);
  writeChunk(destination, stringToChunk(escapeTextForBrowser(JSON.stringify(attributeValue))));
}
/**
 * Resources
 */


var PENDING = 0;
var PRELOADED = 1;
var PREAMBLE = 2;
var LATE = 3;
export function createHoistableState() {
  return {
    styles: new Set(),
    stylesheets: new Set()
  };
}

function getResourceKey(href) {
  return href;
}

function getImageResourceKey(href, imageSrcSet, imageSizes) {
  if (imageSrcSet) {
    return imageSrcSet + '\n' + (imageSizes || '');
  }

  return href;
}

function prefetchDNS(href) {
  var request = resolveRequest();

  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.D(
    /* prefetchDNS */
    href);
    return;
  }

  var resumableState = getResumableState(request);
  var renderState = getRenderState(request);

  if (typeof href === 'string' && href) {
    var _key3 = getResourceKey(href);

    if (!resumableState.dnsResources.hasOwnProperty(_key3)) {
      resumableState.dnsResources[_key3] = EXISTS;
      var _headers2 = renderState.headers;
      var header;

      if (_headers2 && _headers2.remainingCapacity > 0 && ( // Compute the header since we might be able to fit it in the max length
      header = getPrefetchDNSAsHeader(href), // We always consume the header length since once we find one header that doesn't fit
      // we assume all the rest won't as well. This is to avoid getting into a situation
      // where we have a very small remaining capacity but no headers will ever fit and we end
      // up constantly trying to see if the next resource might make it. In the future we can
      // make this behavior different between render and prerender since in the latter case
      // we are less sensitive to the current requests runtime per and more sensitive to maximizing
      // headers.
      (_headers2.remainingCapacity -= header.length + 2) >= 0)) {
        // Store this as resettable in case we are prerendering and postpone in the Shell
        renderState.resets.dns[_key3] = EXISTS;

        if (_headers2.preconnects) {
          _headers2.preconnects += ', ';
        } // $FlowFixMe[unsafe-addition]: we assign header during the if condition


        _headers2.preconnects += header;
      } else {
        // Encode as element
        var resource = [];
        pushLinkImpl(resource, {
          href: href,
          rel: 'dns-prefetch'
        });
        renderState.preconnects.add(resource);
      }
    }

    flushResources(request);
  }
}

function preconnect(href, crossOrigin) {
  var request = resolveRequest();

  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.C(
    /* preconnect */
    href, crossOrigin);
    return;
  }

  var resumableState = getResumableState(request);
  var renderState = getRenderState(request);

  if (typeof href === 'string' && href) {
    var bucket = crossOrigin === 'use-credentials' ? 'credentials' : typeof crossOrigin === 'string' ? 'anonymous' : 'default';

    var _key4 = getResourceKey(href);

    if (!resumableState.connectResources[bucket].hasOwnProperty(_key4)) {
      resumableState.connectResources[bucket][_key4] = EXISTS;
      var _headers3 = renderState.headers;
      var header;

      if (_headers3 && _headers3.remainingCapacity > 0 && ( // Compute the header since we might be able to fit it in the max length
      header = getPreconnectAsHeader(href, crossOrigin), // We always consume the header length since once we find one header that doesn't fit
      // we assume all the rest won't as well. This is to avoid getting into a situation
      // where we have a very small remaining capacity but no headers will ever fit and we end
      // up constantly trying to see if the next resource might make it. In the future we can
      // make this behavior different between render and prerender since in the latter case
      // we are less sensitive to the current requests runtime per and more sensitive to maximizing
      // headers.
      (_headers3.remainingCapacity -= header.length + 2) >= 0)) {
        // Store this in resettableState in case we are prerending and postpone in the Shell
        renderState.resets.connect[bucket][_key4] = EXISTS;

        if (_headers3.preconnects) {
          _headers3.preconnects += ', ';
        } // $FlowFixMe[unsafe-addition]: we assign header during the if condition


        _headers3.preconnects += header;
      } else {
        var resource = [];
        pushLinkImpl(resource, {
          rel: 'preconnect',
          href: href,
          crossOrigin: crossOrigin
        });
        renderState.preconnects.add(resource);
      }
    }

    flushResources(request);
  }
}

function preload(href, as, options) {
  var request = resolveRequest();

  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.L(
    /* preload */
    href, as, options);
    return;
  }

  var resumableState = getResumableState(request);
  var renderState = getRenderState(request);

  if (as && href) {
    switch (as) {
      case 'image':
        {
          var imageSrcSet, imageSizes, fetchPriority;

          if (options) {
            imageSrcSet = options.imageSrcSet;
            imageSizes = options.imageSizes;
            fetchPriority = options.fetchPriority;
          }

          var _key5 = getImageResourceKey(href, imageSrcSet, imageSizes);

          if (resumableState.imageResources.hasOwnProperty(_key5)) {
            // we can return if we already have this resource
            return;
          }

          resumableState.imageResources[_key5] = PRELOAD_NO_CREDS;
          var _headers4 = renderState.headers;
          var header;

          if (_headers4 && _headers4.remainingCapacity > 0 && // browsers today don't support preloading responsive images from link headers so we bail out
          // if the img has srcset defined
          typeof imageSrcSet !== 'string' && // We only include high priority images in the link header
          fetchPriority === 'high' && ( // Compute the header since we might be able to fit it in the max length
          header = getPreloadAsHeader(href, as, options), // We always consume the header length since once we find one header that doesn't fit
          // we assume all the rest won't as well. This is to avoid getting into a situation
          // where we have a very small remaining capacity but no headers will ever fit and we end
          // up constantly trying to see if the next resource might make it. In the future we can
          // make this behavior different between render and prerender since in the latter case
          // we are less sensitive to the current requests runtime per and more sensitive to maximizing
          // headers.
          (_headers4.remainingCapacity -= header.length + 2) >= 0)) {
            // If we postpone in the shell we will still emit a preload as a header so we
            // track this to make sure we don't reset it.
            renderState.resets.image[_key5] = PRELOAD_NO_CREDS;

            if (_headers4.highImagePreloads) {
              _headers4.highImagePreloads += ', ';
            } // $FlowFixMe[unsafe-addition]: we assign header during the if condition


            _headers4.highImagePreloads += header;
          } else {
            // If we don't have headers to write to we have to encode as elements to flush in the head
            // When we have imageSrcSet the browser probably cannot load the right version from headers
            // (this should be verified by testing). For now we assume these need to go in the head
            // as elements even if headers are available.
            var resource = [];
            pushLinkImpl(resource, Object.assign({
              rel: 'preload',
              // There is a bug in Safari where imageSrcSet is not respected on preload links
              // so we omit the href here if we have imageSrcSet b/c safari will load the wrong image.
              // This harms older browers that do not support imageSrcSet by making their preloads not work
              // but this population is shrinking fast and is already small so we accept this tradeoff.
              href: imageSrcSet ? undefined : href,
              as: as
            }, options));

            if (fetchPriority === 'high') {
              renderState.highImagePreloads.add(resource);
            } else {
              renderState.bulkPreloads.add(resource); // Stash the resource in case we need to promote it to higher priority
              // when an img tag is rendered

              renderState.preloads.images.set(_key5, resource);
            }
          }

          break;
        }

      case 'style':
        {
          var _key6 = getResourceKey(href);

          if (resumableState.styleResources.hasOwnProperty(_key6)) {
            // we can return if we already have this resource
            return;
          }

          var _resource2 = [];
          pushLinkImpl(_resource2, Object.assign({
            rel: 'preload',
            href: href,
            as: as
          }, options));
          resumableState.styleResources[_key6] = options && (typeof options.crossOrigin === 'string' || typeof options.integrity === 'string') ? [options.crossOrigin, options.integrity] : PRELOAD_NO_CREDS;
          renderState.preloads.stylesheets.set(_key6, _resource2);
          renderState.bulkPreloads.add(_resource2);
          break;
        }

      case 'script':
        {
          var _key7 = getResourceKey(href);

          if (resumableState.scriptResources.hasOwnProperty(_key7)) {
            // we can return if we already have this resource
            return;
          }

          var _resource3 = [];
          renderState.preloads.scripts.set(_key7, _resource3);
          renderState.bulkPreloads.add(_resource3);
          pushLinkImpl(_resource3, Object.assign({
            rel: 'preload',
            href: href,
            as: as
          }, options));
          resumableState.scriptResources[_key7] = options && (typeof options.crossOrigin === 'string' || typeof options.integrity === 'string') ? [options.crossOrigin, options.integrity] : PRELOAD_NO_CREDS;
          break;
        }

      default:
        {
          var _key8 = getResourceKey(href);

          var hasAsType = resumableState.unknownResources.hasOwnProperty(as);
          var resources;

          if (hasAsType) {
            resources = resumableState.unknownResources[as];

            if (resources.hasOwnProperty(_key8)) {
              // we can return if we already have this resource
              return;
            }
          } else {
            resources = {};
            resumableState.unknownResources[as] = resources;
          }

          resources[_key8] = PRELOAD_NO_CREDS;
          var _headers5 = renderState.headers;

          var _header;

          if (_headers5 && _headers5.remainingCapacity > 0 && as === 'font' && ( // We compute the header here because we might be able to fit it in the max length
          _header = getPreloadAsHeader(href, as, options), // We always consume the header length since once we find one header that doesn't fit
          // we assume all the rest won't as well. This is to avoid getting into a situation
          // where we have a very small remaining capacity but no headers will ever fit and we end
          // up constantly trying to see if the next resource might make it. In the future we can
          // make this behavior different between render and prerender since in the latter case
          // we are less sensitive to the current requests runtime per and more sensitive to maximizing
          // headers.
          (_headers5.remainingCapacity -= _header.length + 2) >= 0)) {
            // If we postpone in the shell we will still emit this preload so we
            // track it here to prevent it from being reset.
            renderState.resets.font[_key8] = PRELOAD_NO_CREDS;

            if (_headers5.fontPreloads) {
              _headers5.fontPreloads += ', ';
            } // $FlowFixMe[unsafe-addition]: we assign header during the if condition


            _headers5.fontPreloads += _header;
          } else {
            // We either don't have headers or we are preloading something that does
            // not warrant elevated priority so we encode as an element.
            var _resource4 = [];
            var props = Object.assign({
              rel: 'preload',
              href: href,
              as: as
            }, options);
            pushLinkImpl(_resource4, props);

            switch (as) {
              case 'font':
                renderState.fontPreloads.add(_resource4);
                break;
              // intentional fall through

              default:
                renderState.bulkPreloads.add(_resource4);
            }
          }
        }
    } // If we got this far we created a new resource


    flushResources(request);
  }
}

function preloadModule(href, options) {
  var request = resolveRequest();

  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.m(
    /* preloadModule */
    href, options);
    return;
  }

  var resumableState = getResumableState(request);
  var renderState = getRenderState(request);

  if (href) {
    var _key9 = getResourceKey(href);

    var as = options && typeof options.as === 'string' ? options.as : 'script';
    var resource;

    switch (as) {
      case 'script':
        {
          if (resumableState.moduleScriptResources.hasOwnProperty(_key9)) {
            // we can return if we already have this resource
            return;
          }

          resource = [];
          resumableState.moduleScriptResources[_key9] = options && (typeof options.crossOrigin === 'string' || typeof options.integrity === 'string') ? [options.crossOrigin, options.integrity] : PRELOAD_NO_CREDS;
          renderState.preloads.moduleScripts.set(_key9, resource);
          break;
        }

      default:
        {
          var hasAsType = resumableState.moduleUnknownResources.hasOwnProperty(as);
          var resources;

          if (hasAsType) {
            resources = resumableState.unknownResources[as];

            if (resources.hasOwnProperty(_key9)) {
              // we can return if we already have this resource
              return;
            }
          } else {
            resources = {};
            resumableState.moduleUnknownResources[as] = resources;
          }

          resource = [];
          resources[_key9] = PRELOAD_NO_CREDS;
        }
    }

    pushLinkImpl(resource, Object.assign({
      rel: 'modulepreload',
      href: href
    }, options));
    renderState.bulkPreloads.add(resource); // If we got this far we created a new resource

    flushResources(request);
  }
}

function preinitStyle(href, precedence, options) {
  var request = resolveRequest();

  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.S(
    /* preinitStyle */
    href, precedence, options);
    return;
  }

  var resumableState = getResumableState(request);
  var renderState = getRenderState(request);

  if (href) {
    precedence = precedence || 'default';

    var _key10 = getResourceKey(href);

    var styleQueue = renderState.styles.get(precedence);
    var hasKey = resumableState.styleResources.hasOwnProperty(_key10);
    var resourceState = hasKey ? resumableState.styleResources[_key10] : undefined;

    if (resourceState !== EXISTS) {
      // We are going to create this resource now so it is marked as Exists
      resumableState.styleResources[_key10] = EXISTS; // If this is the first time we've encountered this precedence we need
      // to create a StyleQueue

      if (!styleQueue) {
        styleQueue = {
          precedence: stringToChunk(escapeTextForBrowser(precedence)),
          rules: [],
          hrefs: [],
          sheets: new Map()
        };
        renderState.styles.set(precedence, styleQueue);
      }

      var resource = {
        state: PENDING,
        props: Object.assign({
          rel: 'stylesheet',
          href: href,
          'data-precedence': precedence
        }, options)
      };

      if (resourceState) {
        // When resourceState is truty it is a Preload state. We cast it for clarity
        var preloadState = resourceState;

        if (preloadState.length === 2) {
          adoptPreloadCredentials(resource.props, preloadState);
        }

        var preloadResource = renderState.preloads.stylesheets.get(_key10);

        if (preloadResource && preloadResource.length > 0) {
          // The Preload for this resource was created in this render pass and has not flushed yet so
          // we need to clear it to avoid it flushing.
          preloadResource.length = 0;
        } else {
          // Either the preload resource from this render already flushed in this render pass
          // or the preload flushed in a prior pass (prerender). In either case we need to mark
          // this resource as already having been preloaded.
          resource.state = PRELOADED;
        }
      } else {// We don't need to check whether a preloadResource exists in the renderState
        // because if it did exist then the resourceState would also exist and we would
        // have hit the primary if condition above.
      } // We add the newly created resource to our StyleQueue and if necessary
      // track the resource with the currently rendering boundary


      styleQueue.sheets.set(_key10, resource); // Notify the request that there are resources to flush even if no work is currently happening

      flushResources(request);
    }
  }
}

function preinitScript(src, options) {
  var request = resolveRequest();

  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.X(
    /* preinitScript */
    src, options);
    return;
  }

  var resumableState = getResumableState(request);
  var renderState = getRenderState(request);

  if (src) {
    var _key11 = getResourceKey(src);

    var hasKey = resumableState.scriptResources.hasOwnProperty(_key11);
    var resourceState = hasKey ? resumableState.scriptResources[_key11] : undefined;

    if (resourceState !== EXISTS) {
      // We are going to create this resource now so it is marked as Exists
      resumableState.scriptResources[_key11] = EXISTS;
      var props = Object.assign({
        src: src,
        async: true
      }, options);

      if (resourceState) {
        // When resourceState is truty it is a Preload state. We cast it for clarity
        var preloadState = resourceState;

        if (preloadState.length === 2) {
          adoptPreloadCredentials(props, preloadState);
        }

        var preloadResource = renderState.preloads.scripts.get(_key11);

        if (preloadResource) {
          // the preload resource exists was created in this render. Now that we have
          // a script resource which will emit earlier than a preload would if it
          // hasn't already flushed we prevent it from flushing by zeroing the length
          preloadResource.length = 0;
        }
      }

      var resource = []; // Add to the script flushing queue

      renderState.scripts.add(resource); // encode the tag as Chunks

      pushScriptImpl(resource, props); // Notify the request that there are resources to flush even if no work is currently happening

      flushResources(request);
    }

    return;
  }
}

function preinitModuleScript(src, options) {
  var request = resolveRequest();

  if (!request) {
    // In async contexts we can sometimes resolve resources from AsyncLocalStorage. If we can't we can also
    // possibly get them from the stack if we are not in an async context. Since we were not able to resolve
    // the resources for this call in either case we opt to do nothing. We can consider making this a warning
    // but there may be times where calling a function outside of render is intentional (i.e. to warm up data
    // fetching) and we don't want to warn in those cases.
    previousDispatcher.M(
    /* preinitModuleScript */
    src, options);
    return;
  }

  var resumableState = getResumableState(request);
  var renderState = getRenderState(request);

  if (src) {
    var _key12 = getResourceKey(src);

    var hasKey = resumableState.moduleScriptResources.hasOwnProperty(_key12);
    var resourceState = hasKey ? resumableState.moduleScriptResources[_key12] : undefined;

    if (resourceState !== EXISTS) {
      // We are going to create this resource now so it is marked as Exists
      resumableState.moduleScriptResources[_key12] = EXISTS;
      var props = Object.assign({
        src: src,
        type: 'module',
        async: true
      }, options);

      if (resourceState) {
        // When resourceState is truty it is a Preload state. We cast it for clarity
        var preloadState = resourceState;

        if (preloadState.length === 2) {
          adoptPreloadCredentials(props, preloadState);
        }

        var preloadResource = renderState.preloads.moduleScripts.get(_key12);

        if (preloadResource) {
          // the preload resource exists was created in this render. Now that we have
          // a script resource which will emit earlier than a preload would if it
          // hasn't already flushed we prevent it from flushing by zeroing the length
          preloadResource.length = 0;
        }
      }

      var resource = []; // Add to the script flushing queue

      renderState.scripts.add(resource); // encode the tag as Chunks

      pushScriptImpl(resource, props); // Notify the request that there are resources to flush even if no work is currently happening

      flushResources(request);
    }

    return;
  }
} // This function is only safe to call at Request start time since it assumes
// that each module has not already been preloaded. If we find a need to preload
// scripts at any other point in time we will need to check whether the preload
// already exists and not assume it


function preloadBootstrapScriptOrModule(resumableState, renderState, href, props) {
  var key = getResourceKey(href);

  if (__DEV__) {
    if (resumableState.scriptResources.hasOwnProperty(key) || resumableState.moduleScriptResources.hasOwnProperty(key)) {
      // This is coded as a React error because it should be impossible for a userspace preload to preempt this call
      // If a userspace preload can preempt it then this assumption is broken and we need to reconsider this strategy
      // rather than instruct the user to not preload their bootstrap scripts themselves
      console.error('Internal React Error: React expected bootstrap script or module with src "%s" to not have been preloaded already. please file an issue', href);
    }
  } // The href used for bootstrap scripts and bootstrap modules should never be
  // used to preinit the resource. If a script can be preinited then it shouldn't
  // be a bootstrap script/module and if it is a bootstrap script/module then it
  // must not be safe to emit early. To avoid possibly allowing for preinits of
  // bootstrap scripts/modules we occlude these keys.


  resumableState.scriptResources[key] = EXISTS;
  resumableState.moduleScriptResources[key] = EXISTS;
  var resource = [];
  pushLinkImpl(resource, props);
  renderState.bootstrapScripts.add(resource);
}

function internalPreinitScript(resumableState, renderState, src, chunks) {
  var key = getResourceKey(src);

  if (!resumableState.scriptResources.hasOwnProperty(key)) {
    var resource = chunks;
    resumableState.scriptResources[key] = EXISTS;
    renderState.scripts.add(resource);
  }

  return;
}

function preloadAsStylePropsFromProps(href, props) {
  return {
    rel: 'preload',
    as: 'style',
    href: href,
    crossOrigin: props.crossOrigin,
    fetchPriority: props.fetchPriority,
    integrity: props.integrity,
    media: props.media,
    hrefLang: props.hrefLang,
    referrerPolicy: props.referrerPolicy
  };
}

function stylesheetPropsFromRawProps(rawProps) {
  return Object.assign({}, rawProps, {
    'data-precedence': rawProps.precedence,
    precedence: null
  });
}

function adoptPreloadCredentials(target, preloadState) {
  if (target.crossOrigin == null) target.crossOrigin = preloadState[0];
  if (target.integrity == null) target.integrity = preloadState[1];
}

function getPrefetchDNSAsHeader(href) {
  var escapedHref = escapeHrefForLinkHeaderURLContext(href);
  return "<" + escapedHref + ">; rel=dns-prefetch";
}

function getPreconnectAsHeader(href, crossOrigin) {
  var escapedHref = escapeHrefForLinkHeaderURLContext(href);
  var value = "<" + escapedHref + ">; rel=preconnect";

  if (typeof crossOrigin === 'string') {
    var escapedCrossOrigin = escapeStringForLinkHeaderQuotedParamValueContext(crossOrigin, 'crossOrigin');
    value += "; crossorigin=\"" + escapedCrossOrigin + "\"";
  }

  return value;
}

function getPreloadAsHeader(href, as, params) {
  var escapedHref = escapeHrefForLinkHeaderURLContext(href);
  var escapedAs = escapeStringForLinkHeaderQuotedParamValueContext(as, 'as');
  var value = "<" + escapedHref + ">; rel=preload; as=\"" + escapedAs + "\"";

  for (var paramName in params) {
    if (hasOwnProperty.call(params, paramName)) {
      // $FlowFixMe[invalid-computed-prop]
      var paramValue = params[paramName];

      if (typeof paramValue === 'string') {
        value += "; " + paramName.toLowerCase() + "=\"" + escapeStringForLinkHeaderQuotedParamValueContext(paramValue, paramName) + "\"";
      }
    }
  }

  return value;
}

function getStylesheetPreloadAsHeader(stylesheet) {
  var props = stylesheet.props;
  var preloadOptions = {
    crossOrigin: props.crossOrigin,
    integrity: props.integrity,
    nonce: props.nonce,
    type: props.type,
    fetchPriority: props.fetchPriority,
    referrerPolicy: props.referrerPolicy,
    media: props.media
  };
  return getPreloadAsHeader(props.href, 'style', preloadOptions);
} // This escaping function is only safe to use for href values being written into
// a "Link" header in between `<` and `>` characters. The primary concern with the href is
// to escape the bounding characters as well as new lines. This is unsafe to use in any other
// context


var regexForHrefInLinkHeaderURLContext = /[<>\r\n]/g;

function escapeHrefForLinkHeaderURLContext(hrefInput) {
  if (__DEV__) {
    checkAttributeStringCoercion(hrefInput, 'href');
  }

  var coercedHref = '' + hrefInput;
  return coercedHref.replace(regexForHrefInLinkHeaderURLContext, escapeHrefForLinkHeaderURLContextReplacer);
}

function escapeHrefForLinkHeaderURLContextReplacer(match) {
  switch (match) {
    case '<':
      return '%3C';

    case '>':
      return '%3E';

    case '\n':
      return '%0A';

    case '\r':
      return '%0D';

    default:
      {
        // eslint-disable-next-line react-internal/prod-error-codes
        throw new Error('escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React');
      }
  }
} // This escaping function is only safe to use for quoted param values in an HTTP header.
// It is unsafe to use for any value not inside quote marks in parater value position.


var regexForLinkHeaderQuotedParamValueContext = /["';,\r\n]/g;

function escapeStringForLinkHeaderQuotedParamValueContext(value, name) {
  if (__DEV__) {
    checkOptionStringCoercion(value, name);
  }

  var coerced = '' + value;
  return coerced.replace(regexForLinkHeaderQuotedParamValueContext, escapeStringForLinkHeaderQuotedParamValueContextReplacer);
}

function escapeStringForLinkHeaderQuotedParamValueContextReplacer(match) {
  switch (match) {
    case '"':
      return '%22';

    case "'":
      return '%27';

    case ';':
      return '%3B';

    case ',':
      return '%2C';

    case '\n':
      return '%0A';

    case '\r':
      return '%0D';

    default:
      {
        // eslint-disable-next-line react-internal/prod-error-codes
        throw new Error('escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React');
      }
  }
}

function hoistStyleQueueDependency(this, styleQueue) {
  this.styles.add(styleQueue);
}

function hoistStylesheetDependency(this, stylesheet) {
  this.stylesheets.add(stylesheet);
}

export function hoistHoistables(parentState, childState) {
  childState.styles.forEach(hoistStyleQueueDependency, parentState);
  childState.stylesheets.forEach(hoistStylesheetDependency, parentState);
} // This function is called at various times depending on whether we are rendering
// or prerendering. In this implementation we only actually emit headers once and
// subsequent calls are ignored. We track whether the request has a completed shell
// to determine whether we will follow headers with a flush including stylesheets.
// In the context of prerrender we don't have a completed shell when the request finishes
// with a postpone in the shell. In the context of a render we don't have a completed shell
// if this is called before the shell finishes rendering which usually will happen anytime
// anything suspends in the shell.

export function emitEarlyPreloads(renderState, resumableState, shellComplete) {
  var onHeaders = renderState.onHeaders;

  if (onHeaders) {
    var _headers6 = renderState.headers;

    if (_headers6) {
      // Even if onHeaders throws we don't want to call this again so
      // we drop the headers state from this point onwards.
      renderState.headers = null;
      var linkHeader = _headers6.preconnects;

      if (_headers6.fontPreloads) {
        if (linkHeader) {
          linkHeader += ', ';
        }

        linkHeader += _headers6.fontPreloads;
      }

      if (_headers6.highImagePreloads) {
        if (linkHeader) {
          linkHeader += ', ';
        }

        linkHeader += _headers6.highImagePreloads;
      }

      if (!shellComplete) {
        // We use raw iterators because we want to be able to halt iteration
        // We could refactor renderState to store these dually in arrays to
        // make this more efficient at the cost of additional memory and
        // write overhead. However this code only runs once per request so
        // for now I consider this sufficient.
        var queueIter = renderState.styles.values();

        outer: for (var queueStep = queueIter.next(); _headers6.remainingCapacity > 0 && !queueStep.done; queueStep = queueIter.next()) {
          var sheets = queueStep.value.sheets;
          var sheetIter = sheets.values();

          for (var sheetStep = sheetIter.next(); _headers6.remainingCapacity > 0 && !sheetStep.done; sheetStep = sheetIter.next()) {
            var sheet = sheetStep.value;
            var props = sheet.props;

            var _key13 = getResourceKey(props.href);

            var header = getStylesheetPreloadAsHeader(sheet); // We mutate the capacity b/c we don't want to keep checking if later headers will fit.
            // This means that a particularly long header might close out the header queue where later
            // headers could still fit. We could in the future alter the behavior here based on prerender vs render
            // since during prerender we aren't as concerned with pure runtime performance.

            if ((_headers6.remainingCapacity -= header.length + 2) >= 0) {
              renderState.resets.style[_key13] = PRELOAD_NO_CREDS;

              if (linkHeader) {
                linkHeader += ', ';
              }

              linkHeader += header; // We already track that the resource exists in resumableState however
              // if the resumableState resets because we postponed in the shell
              // which is what is happening in this branch if we are prerendering
              // then we will end up resetting the resumableState. When it resets we
              // want to record the fact that this stylesheet was already preloaded

              renderState.resets.style[_key13] = typeof props.crossOrigin === 'string' || typeof props.integrity === 'string' ? [props.crossOrigin, props.integrity] : PRELOAD_NO_CREDS;
            } else {
              break outer;
            }
          }
        }
      }

      if (linkHeader) {
        onHeaders({
          Link: linkHeader
        });
      } else {
        // We still call this with no headers because a user may be using it as a signal that
        // it React will not provide any headers
        onHeaders({});
      }

      return;
    }
  }
}
export var NotPendingTransition = NotPending;