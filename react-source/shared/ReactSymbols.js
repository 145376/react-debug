/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { renameElementSymbol } from 'shared/ReactFeatureFlags'; // ATTENTION
// When adding new symbols to this file,
// Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'
// The Symbol used to tag the ReactElement-like types.

export var REACT_LEGACY_ELEMENT_TYPE = Symbol.for('react.element');
export var REACT_ELEMENT_TYPE = renameElementSymbol ? Symbol.for('react.transitional.element') : REACT_LEGACY_ELEMENT_TYPE;
export var REACT_PORTAL_TYPE = Symbol.for('react.portal');
export var REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
export var REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode');
export var REACT_PROFILER_TYPE = Symbol.for('react.profiler');
export var REACT_PROVIDER_TYPE = Symbol.for('react.provider'); // TODO: Delete with enableRenderableContext

export var REACT_CONSUMER_TYPE = Symbol.for('react.consumer');
export var REACT_CONTEXT_TYPE = Symbol.for('react.context');
export var REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
export var REACT_SUSPENSE_TYPE = Symbol.for('react.suspense');
export var REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list');
export var REACT_MEMO_TYPE = Symbol.for('react.memo');
export var REACT_LAZY_TYPE = Symbol.for('react.lazy');
export var REACT_SCOPE_TYPE = Symbol.for('react.scope');
export var REACT_ACTIVITY_TYPE = Symbol.for('react.activity');
export var REACT_LEGACY_HIDDEN_TYPE = Symbol.for('react.legacy_hidden');
export var REACT_TRACING_MARKER_TYPE = Symbol.for('react.tracing_marker');
export var REACT_MEMO_CACHE_SENTINEL = Symbol.for('react.memo_cache_sentinel');
export var REACT_POSTPONE_TYPE = Symbol.for('react.postpone');
export var REACT_VIEW_TRANSITION_TYPE = Symbol.for('react.view_transition');
var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
var FAUX_ITERATOR_SYMBOL = '@@iterator';
export function getIteratorFn(maybeIterable) {
  if (maybeIterable === null || typeof maybeIterable !== 'object') {
    return null;
  }

  var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];

  if (typeof maybeIterator === 'function') {
    return maybeIterator;
  }

  return null;
}
export var ASYNC_ITERATOR = Symbol.asyncIterator;