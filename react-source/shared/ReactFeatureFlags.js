/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
// -----------------------------------------------------------------------------
// Land or remove (zero effort)
//
// Flags that can likely be deleted or landed without consequences
// -----------------------------------------------------------------------------
// None
// -----------------------------------------------------------------------------
// Killswitch
//
// Flags that exist solely to turn off a change in case it causes a regression
// when it rolls out to prod. We should remove these as soon as possible.
// -----------------------------------------------------------------------------
export var enableHydrationLaneScheduling = true; // -----------------------------------------------------------------------------
// Land or remove (moderate effort)
//
// Flags that can be probably deleted or landed, but might require extra effort
// like migrating internal callers or performance testing.
// -----------------------------------------------------------------------------
// TODO: Finish rolling out in www

export var favorSafetyOverHydrationPerf = true; // Need to remove didTimeout argument from Scheduler before landing

export var disableSchedulerTimeoutInWorkLoop = false; // TODO: Land at Meta before removing.

export var disableDefaultPropsExceptForClasses = true; // -----------------------------------------------------------------------------
// Slated for removal in the future (significant effort)
//
// These are experiments that didn't work out, and never shipped, but we can't
// delete from the codebase until we migrate internal callers.
// -----------------------------------------------------------------------------
// Add a callback property to suspense to notify which promises are currently
// in the update queue. This allows reporting and tracing of what is causing
// the user to see a loading state.
//
// Also allows hydration callbacks to fire when a dehydrated boundary gets
// hydrated or deleted.
//
// This will eventually be replaced by the Transition Tracing proposal.

export var enableSuspenseCallback = false; // Experimental Scope support.

export var enableScopeAPI = false; // Experimental Create Event Handle API.

export var enableCreateEventHandleAPI = false; // Support legacy Primer support on internal FB www

export var enableLegacyFBSupport = false; // -----------------------------------------------------------------------------
// Ongoing experiments
//
// These are features that we're either actively exploring or are reasonably
// likely to include in an upcoming release.
// -----------------------------------------------------------------------------
// Yield to the browser event loop and not just the scheduler event loop before passive effects.
// Fix gated tests that fail with this flag enabled before turning it back on.

export var enableYieldingBeforePassive = false; // Experiment to intentionally yield less to block high framerate animations.

export var enableThrottledScheduling = false;
export var enableLegacyCache = __EXPERIMENTAL__;
export var enableAsyncIterableChildren = __EXPERIMENTAL__;
export var enableTaint = __EXPERIMENTAL__;
export var enablePostpone = __EXPERIMENTAL__;
export var enableHalt = __EXPERIMENTAL__;
export var enableViewTransition = __EXPERIMENTAL__;
export var enableGestureTransition = __EXPERIMENTAL__;
export var enableScrollEndPolyfill = __EXPERIMENTAL__;
export var enableSuspenseyImages = false;
export var enableFizzBlockingRender = __EXPERIMENTAL__; // rel="expect"

export var enableSrcObject = __EXPERIMENTAL__;
export var enableHydrationChangeEvent = __EXPERIMENTAL__;
export var enableDefaultTransitionIndicator = __EXPERIMENTAL__;
/**
 * Switches Fiber creation to a simple object instead of a constructor.
 */

export var enableObjectFiber = false;
export var enableTransitionTracing = false; // FB-only usage. The new API has different semantics.

export var enableLegacyHidden = false; // Enables unstable_avoidThisFallback feature in Fiber

export var enableSuspenseAvoidThisFallback = false;
export var enableCPUSuspense = __EXPERIMENTAL__; // Test this at Meta before enabling.

export var enableNoCloningMemoCache = false;
export var enableUseEffectEventHook = __EXPERIMENTAL__; // Test in www before enabling in open source.
// Enables DOM-server to stream its instruction set as data-attributes
// (handled with an MutationObserver) instead of inline-scripts

export var enableFizzExternalRuntime = __EXPERIMENTAL__;
export var alwaysThrottleRetries = true;
export var passChildrenWhenCloningPersistedNodes = false;
/**
 * Enables a new Fiber flag used in persisted mode to reduce the number
 * of cloned host components.
 */

export var enablePersistedModeClonedFlag = false;
export var enableEagerAlternateStateNodeCleanup = true;
/**
 * Enables an expiration time for retry lanes to avoid starvation.
 */

export var enableRetryLaneExpiration = false;
export var retryLaneExpirationMs = 5000;
export var syncLaneExpirationMs = 250;
export var transitionLaneExpirationMs = 5000;
/**
 * Enables a new error detection for infinite render loops from updates caused
 * by setState or similar outside of the component owning the state.
 */

export var enableInfiniteRenderLoopDetection = false;
export var enableLazyPublicInstanceInFabric = false;
export var enableFragmentRefs = __EXPERIMENTAL__; // -----------------------------------------------------------------------------
// Ready for next major.
//
// Alias __NEXT_MAJOR__ to __EXPERIMENTAL__ for easier skimming.
// -----------------------------------------------------------------------------
// TODO: Anything that's set to `true` in this section should either be cleaned
// up (if it's on everywhere, including Meta and RN builds) or moved to a
// different section of this file.
// const __NEXT_MAJOR__ = __EXPERIMENTAL__;
// Renames the internal symbol for elements since they have changed signature/constructor

export var renameElementSymbol = true;
/**
 * Enables a fix to run insertion effect cleanup on hidden subtrees.
 */

export var enableHiddenSubtreeInsertionEffectCleanup = false;
/**
 * Removes legacy style context defined using static `contextTypes` and consumed with static `childContextTypes`.
 */

export var disableLegacyContext = true;
/**
 * Removes legacy style context just from function components.
 */

export var disableLegacyContextForFunctionComponents = true; // Enable the moveBefore() alternative to insertBefore(). This preserves states of moves.

export var enableMoveBefore = false; // Disabled caching behavior of `react/cache` in client runtimes.

export var disableClientCache = true; // Warn on any usage of ReactTestRenderer

export var enableReactTestRendererWarning = true; // Disables legacy mode
// This allows us to land breaking changes to remove legacy mode APIs in experimental builds
// before removing them in stable in the next Major

export var disableLegacyMode = true; // Make <Context> equivalent to <Context.Provider> instead of <Context.Consumer>

export var enableRenderableContext = true; // -----------------------------------------------------------------------------
// Chopping Block
//
// Planned feature deprecations and breaking changes. Sorted roughly in order of
// when we plan to enable them.
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// React DOM Chopping Block
//
// Similar to main Chopping Block but only flags related to React DOM. These are
// grouped because we will likely batch all of them into a single major release.
// -----------------------------------------------------------------------------
// Disable support for comment nodes as React DOM containers. Already disabled
// in open source, but www codebase still relies on it. Need to remove.

export var disableCommentsAsDOMContainers = true;
export var enableTrustedTypesIntegration = false; // Prevent the value and checked attributes from syncing with their related
// DOM properties

export var disableInputAttributeSyncing = false; // Disables children for <textarea> elements

export var disableTextareaChildren = false; // -----------------------------------------------------------------------------
// Debugging and DevTools
// -----------------------------------------------------------------------------
// Gather advanced timing metrics for Profiler subtrees.

export var enableProfilerTimer = __PROFILE__; // Adds performance.measure() marks using Chrome extensions to allow formatted
// Component rendering tracks to show up in the Performance tab.
// This flag will be used for both Server Component and Client Component tracks.
// All calls should also be gated on enableProfilerTimer.

export var enableComponentPerformanceTrack = __EXPERIMENTAL__; // Adds user timing marks for e.g. state updates, suspense, and work loop stuff,
// for an experimental timeline tool.

export var enableSchedulingProfiler = !enableComponentPerformanceTrack && __PROFILE__; // Record durations for commit and passive effects phases.

export var enableProfilerCommitHooks = __PROFILE__; // Phase param passed to onRender callback differentiates between an "update" and a "cascading-update".

export var enableProfilerNestedUpdatePhase = __PROFILE__;
export var enableAsyncDebugInfo = __EXPERIMENTAL__; // Track which Fiber(s) schedule render work.

export var enableUpdaterTracking = __PROFILE__; // Internal only.

export var enableDO_NOT_USE_disableStrictPassiveEffect = false;
export var ownerStackLimit = 1e4;