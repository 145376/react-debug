/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// Keep in sync with https://github.com/facebook/flow/blob/main/lib/react.js
// Export all exports so that they're available in tests.
// We can't use export * from in Flow for some reason.
export { __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, __COMPILER_RUNTIME, Children, Component, Fragment, Profiler, PureComponent, StrictMode, Suspense, cloneElement, createContext, createElement, createRef, use, forwardRef, isValidElement, lazy, memo, cache, startTransition, unstable_LegacyHidden, unstable_Activity, unstable_Scope, unstable_SuspenseList, unstable_TracingMarker, unstable_getCacheForType, unstable_useCacheRefresh, useId, useCallback, useContext, useDebugValue, useDeferredValue, useEffect, experimental_useEffectEvent, useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo, useOptimistic, useSyncExternalStore, useReducer, useRef, useState, useTransition, useActionState, version, act, // DEV-only
captureOwnerStack // DEV-only
} from './src/ReactClient';