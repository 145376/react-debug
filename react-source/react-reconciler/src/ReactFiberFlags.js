/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { enableCreateEventHandleAPI, enableUseEffectEventHook } from 'shared/ReactFeatureFlags';
// Don't change these values. They're used by React Dev Tools.
export var NoFlags =
/*                      */
0;
export var PerformedWork =
/*                */
1;
export var Placement =
/*                    */
2;
export var DidCapture =
/*                   */
128;
export var Hydrating =
/*                    */
4096; // You can change the rest (and add more).

export var Update =
/*                       */
4;
export var Cloned =
/*                       */
8;
export var ChildDeletion =
/*                */
16;
export var ContentReset =
/*                 */
32;
export var Callback =
/*                     */
64;
/* Used by DidCapture:                            0b0000000000000000000000010000000; */

export var ForceClientRender =
/*            */
256;
export var Ref =
/*                          */
512;
export var Snapshot =
/*                     */
1024;
export var Passive =
/*                      */
2048;
/* Used by Hydrating:                             0b0000000000000000001000000000000; */

export var Visibility =
/*                   */
8192;
export var StoreConsistency =
/*             */
16384; // It's OK to reuse these bits because these flags are mutually exclusive for
// different fiber types. We should really be doing this for as many flags as
// possible, because we're about to run out of bits.

export var Hydrate = Callback;
export var ScheduleRetry = StoreConsistency;
export var ShouldSuspendCommit = Visibility;
export var ViewTransitionNamedMount = ShouldSuspendCommit;
export var DidDefer = ContentReset;
export var FormReset = Snapshot;
export var AffectedParentLayout = ContentReset;
export var LifecycleEffectMask = Passive | Update | Callback | Ref | Snapshot | StoreConsistency; // Union of all commit flags (flags with the lifetime of a particular commit)

export var HostEffectMask =
/*               */
32767; // These are not really side effects, but we still reuse this field.

export var Incomplete =
/*                   */
32768;
export var ShouldCapture =
/*                */
65536;
export var ForceUpdateForLegacySuspense =
/* */
131072;
export var DidPropagateContext =
/*          */
262144;
export var NeedsPropagation =
/*             */
524288;
export var Forked =
/*                       */
1048576; // Static tags describe aspects of a fiber that are not specific to a render,
// e.g. a fiber uses a passive effect (even if there are no updates on this particular render).
// This enables us to defer more work in the unmount case,
// since we can defer traversing the tree during layout to look for Passive effects,
// and instead rely on the static flag as a signal that there may be cleanup work.

export var SnapshotStatic =
/*               */
2097152;
export var LayoutStatic =
/*                 */
4194304;
export var RefStatic = LayoutStatic;
export var PassiveStatic =
/*                */
8388608;
export var MaySuspendCommit =
/*             */
16777216; // ViewTransitionNamedStatic tracks explicitly name ViewTransition components deeply
// that might need to be visited during clean up. This is similar to SnapshotStatic
// if there was any other use for it. It also needs to run in the same phase as
// MaySuspendCommit tracking.

export var ViewTransitionNamedStatic =
/*    */
SnapshotStatic | MaySuspendCommit; // ViewTransitionStatic tracks whether there are an ViewTransition components from
// the nearest HostComponent down. It resets at every HostComponent level.

export var ViewTransitionStatic =
/*         */
33554432; // Flag used to identify newly inserted fibers. It isn't reset after commit unlike `Placement`.

export var PlacementDEV =
/*                 */
67108864;
export var MountLayoutDev =
/*               */
134217728;
export var MountPassiveDev =
/*              */
268435456; // Groups of flags that are used in the commit phase to skip over trees that
// don't contain effects, by checking subtreeFlags.

export var BeforeMutationMask = Snapshot | (enableCreateEventHandleAPI ? // createEventHandle needs to visit deleted and hidden trees to
// fire beforeblur
// TODO: Only need to visit Deletions during BeforeMutation phase if an
// element is focused.
Update | ChildDeletion | Visibility : enableUseEffectEventHook ? // TODO: The useEffectEvent hook uses the snapshot phase for clean up but it
// really should use the mutation phase for this or at least schedule an
// explicit Snapshot phase flag for this.
Update : 0); // For View Transition support we use the snapshot phase to scan the tree for potentially
// affected ViewTransition components.

export var BeforeAndAfterMutationTransitionMask = Snapshot | Update | Placement | ChildDeletion | Visibility | ContentReset;
export var MutationMask = Placement | Update | ChildDeletion | ContentReset | Ref | Hydrating | Visibility | FormReset;
export var LayoutMask = Update | Callback | Ref | Visibility; // TODO: Split into PassiveMountMask and PassiveUnmountMask

export var PassiveMask = Passive | Visibility | ChildDeletion; // For View Transitions we need to visit anything we visited in the snapshot phase to
// restore the view-transition-name after committing the transition.

export var PassiveTransitionMask = PassiveMask | Update | Placement; // Union of tags that don't get reset on clones.
// This allows certain concepts to persist without recalculating them,
// e.g. whether a subtree contains passive effects or portals.

export var StaticMask = LayoutStatic | PassiveStatic | RefStatic | MaySuspendCommit | ViewTransitionStatic | ViewTransitionNamedStatic;