/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
export var NoMode =
/*                         */
0; // TODO: Remove ConcurrentMode by reading from the root tag instead

export var ConcurrentMode =
/*                 */
1;
export var ProfileMode =
/*                    */
2; //export const DebugTracingMode = /*             */ 0b0000100; // Removed

export var StrictLegacyMode =
/*               */
8;
export var StrictEffectsMode =
/*              */
16;
export var NoStrictPassiveEffectsMode =
/*     */
64; // Keep track of if we're in a SuspenseyImages eligible subtree.
// TODO: Remove this when enableSuspenseyImages ship where it's always on.

export var SuspenseyImagesMode =
/*            */
32;