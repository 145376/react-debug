/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// Renderers that don't support hydration
// can re-export everything from this module.
function shim() {
  throw new Error('The current renderer does not support hydration. ' + 'This error is likely caused by a bug in React. ' + 'Please file an issue.');
} // Hydration (when unsupported)


export var supportsHydration = false;
export var isSuspenseInstancePending = shim;
export var isSuspenseInstanceFallback = shim;
export var getSuspenseInstanceFallbackErrorDetails = shim;
export var registerSuspenseInstanceRetry = shim;
export var canHydrateFormStateMarker = shim;
export var isFormStateMarkerMatching = shim;
export var getNextHydratableSibling = shim;
export var getNextHydratableSiblingAfterSingleton = shim;
export var getFirstHydratableChild = shim;
export var getFirstHydratableChildWithinContainer = shim;
export var getFirstHydratableChildWithinActivityInstance = shim;
export var getFirstHydratableChildWithinSuspenseInstance = shim;
export var getFirstHydratableChildWithinSingleton = shim;
export var canHydrateInstance = shim;
export var canHydrateTextInstance = shim;
export var canHydrateActivityInstance = shim;
export var canHydrateSuspenseInstance = shim;
export var hydrateInstance = shim;
export var hydrateTextInstance = shim;
export var hydrateActivityInstance = shim;
export var hydrateSuspenseInstance = shim;
export var getNextHydratableInstanceAfterActivityInstance = shim;
export var getNextHydratableInstanceAfterSuspenseInstance = shim;
export var finalizeHydratedChildren = shim;
export var commitHydratedInstance = shim;
export var commitHydratedContainer = shim;
export var commitHydratedActivityInstance = shim;
export var commitHydratedSuspenseInstance = shim;
export var flushHydrationEvents = shim;
export var clearActivityBoundary = shim;
export var clearSuspenseBoundary = shim;
export var clearActivityBoundaryFromContainer = shim;
export var clearSuspenseBoundaryFromContainer = shim;
export var hideDehydratedBoundary = shim;
export var unhideDehydratedBoundary = shim;
export var shouldDeleteUnhydratedTailInstances = shim;
export var diffHydratedPropsForDevWarnings = shim;
export var diffHydratedTextForDevWarnings = shim;
export var describeHydratableInstanceForDevWarnings = shim;
export var validateHydratableInstance = shim;
export var validateHydratableTextInstance = shim;