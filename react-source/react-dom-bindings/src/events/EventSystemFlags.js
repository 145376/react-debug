/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
export var IS_EVENT_HANDLE_NON_MANAGED_NODE = 1;
export var IS_NON_DELEGATED = 1 << 1;
export var IS_CAPTURE_PHASE = 1 << 2;
export var IS_PASSIVE = 1 << 3;
export var IS_LEGACY_FB_SUPPORT_MODE = 1 << 4;
export var SHOULD_NOT_DEFER_CLICK_FOR_FB_SUPPORT_MODE = IS_LEGACY_FB_SUPPORT_MODE | IS_CAPTURE_PHASE; // We do not want to defer if the event system has already been
// set to LEGACY_FB_SUPPORT. LEGACY_FB_SUPPORT only gets set when
// we call willDeferLaterForLegacyFBSupport, thus not bailing out
// will result in endless cycles like an infinite loop.
// We also don't want to defer during event replaying.

export var SHOULD_NOT_PROCESS_POLYFILL_EVENT_PLUGINS = IS_EVENT_HANDLE_NON_MANAGED_NODE | IS_NON_DELEGATED | IS_CAPTURE_PHASE;