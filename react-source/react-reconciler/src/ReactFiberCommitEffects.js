/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { getViewTransitionName } from './ReactFiberViewTransitionComponent';
import { enableProfilerTimer, enableProfilerCommitHooks, enableProfilerNestedUpdatePhase, enableSchedulingProfiler, enableViewTransition, enableFragmentRefs } from 'shared/ReactFeatureFlags';
import { ClassComponent, Fragment, HostComponent, HostHoistable, HostSingleton, ViewTransitionComponent } from './ReactWorkTags';
import { NoFlags } from './ReactFiberFlags';
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import { resolveClassComponentProps } from './ReactFiberClassComponent';
import { recordEffectDuration, startEffectTimer, isCurrentUpdateNested } from './ReactProfilerTimer';
import { NoMode, ProfileMode } from './ReactTypeOfMode';
import { commitCallbacks, commitHiddenCallbacks } from './ReactFiberClassUpdateQueue';
import { getPublicInstance, createViewTransitionInstance, createFragmentInstance } from './ReactFiberConfig';
import { captureCommitPhaseError, setIsRunningInsertionEffect } from './ReactFiberWorkLoop';
import { NoFlags as NoHookEffect, Layout as HookLayout, Insertion as HookInsertion, Passive as HookPassive } from './ReactHookEffectTags';
import { didWarnAboutReassigningProps } from './ReactFiberBeginWork';
import { markComponentPassiveEffectMountStarted, markComponentPassiveEffectMountStopped, markComponentPassiveEffectUnmountStarted, markComponentPassiveEffectUnmountStopped, markComponentLayoutEffectMountStarted, markComponentLayoutEffectMountStopped, markComponentLayoutEffectUnmountStarted, markComponentLayoutEffectUnmountStopped } from './ReactFiberDevToolsHook';
import { callComponentDidMountInDEV, callComponentDidUpdateInDEV, callComponentWillUnmountInDEV, callCreateInDEV, callDestroyInDEV } from './ReactFiberCallUserSpace';
import { runWithFiberInDEV } from './ReactCurrentFiber';

function shouldProfile(current) {
  return enableProfilerTimer && enableProfilerCommitHooks && (current.mode & ProfileMode) !== NoMode;
}

export function commitHookLayoutEffects(finishedWork, hookFlags) {
  // At this point layout effects have already been destroyed (during mutation phase).
  // This is done to prevent sibling component effects from interfering with each other,
  // e.g. a destroy function in one component should never override a ref set
  // by a create function in another component during the same commit.
  if (shouldProfile(finishedWork)) {
    startEffectTimer();
    commitHookEffectListMount(hookFlags, finishedWork);
    recordEffectDuration(finishedWork);
  } else {
    commitHookEffectListMount(hookFlags, finishedWork);
  }
}
export function commitHookLayoutUnmountEffects(finishedWork, nearestMountedAncestor, hookFlags) {
  // Layout effects are destroyed during the mutation phase so that all
  // destroy functions for all fibers are called before any create functions.
  // This prevents sibling component effects from interfering with each other,
  // e.g. a destroy function in one component should never override a ref set
  // by a create function in another component during the same commit.
  if (shouldProfile(finishedWork)) {
    startEffectTimer();
    commitHookEffectListUnmount(hookFlags, finishedWork, nearestMountedAncestor);
    recordEffectDuration(finishedWork);
  } else {
    commitHookEffectListUnmount(hookFlags, finishedWork, nearestMountedAncestor);
  }
}
export function commitHookEffectListMount(flags, finishedWork) {
  try {
    var updateQueue = finishedWork.updateQueue;
    var lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

    if (lastEffect !== null) {
      var firstEffect = lastEffect.next;
      var effect = firstEffect;

      do {
        if ((effect.tag & flags) === flags) {
          if (enableSchedulingProfiler) {
            if ((flags & HookPassive) !== NoHookEffect) {
              markComponentPassiveEffectMountStarted(finishedWork);
            } else if ((flags & HookLayout) !== NoHookEffect) {
              markComponentLayoutEffectMountStarted(finishedWork);
            }
          } // Mount


          var destroy = void 0;

          if (__DEV__) {
            if ((flags & HookInsertion) !== NoHookEffect) {
              setIsRunningInsertionEffect(true);
            }

            destroy = runWithFiberInDEV(finishedWork, callCreateInDEV, effect);

            if ((flags & HookInsertion) !== NoHookEffect) {
              setIsRunningInsertionEffect(false);
            }
          } else {
            var create = effect.create;
            var inst = effect.inst;
            destroy = create();
            inst.destroy = destroy;
          }

          if (enableSchedulingProfiler) {
            if ((flags & HookPassive) !== NoHookEffect) {
              markComponentPassiveEffectMountStopped();
            } else if ((flags & HookLayout) !== NoHookEffect) {
              markComponentLayoutEffectMountStopped();
            }
          }

          if (__DEV__) {
            if (destroy !== undefined && typeof destroy !== 'function') {
              var hookName = void 0;

              if ((effect.tag & HookLayout) !== NoFlags) {
                hookName = 'useLayoutEffect';
              } else if ((effect.tag & HookInsertion) !== NoFlags) {
                hookName = 'useInsertionEffect';
              } else {
                hookName = 'useEffect';
              }

              var addendum = void 0;

              if (destroy === null) {
                addendum = ' You returned null. If your effect does not require clean ' + 'up, return undefined (or nothing).'; // $FlowFixMe (@poteto) this check is safe on arbitrary non-null/void objects
              } else if (typeof destroy.then === 'function') {
                addendum = '\n\nIt looks like you wrote ' + hookName + '(async () => ...) or returned a Promise. ' + 'Instead, write the async function inside your effect ' + 'and call it immediately:\n\n' + hookName + '(() => {\n' + '  async function fetchData() {\n' + '    // You can await here\n' + '    const response = await MyAPI.getData(someId);\n' + '    // ...\n' + '  }\n' + '  fetchData();\n' + "}, [someId]); // Or [] if effect doesn't need props or state\n\n" + 'Learn more about data fetching with Hooks: https://react.dev/link/hooks-data-fetching';
              } else {
                // $FlowFixMe[unsafe-addition] (@poteto)
                addendum = ' You returned: ' + destroy;
              }

              runWithFiberInDEV(finishedWork, function (n, a) {
                console.error('%s must not return anything besides a function, ' + 'which is used for clean-up.%s', n, a);
              }, hookName, addendum);
            }
          }
        }

        effect = effect.next;
      } while (effect !== firstEffect);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHookEffectListUnmount(flags, finishedWork, nearestMountedAncestor) {
  try {
    var updateQueue = finishedWork.updateQueue;
    var lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

    if (lastEffect !== null) {
      var firstEffect = lastEffect.next;
      var effect = firstEffect;

      do {
        if ((effect.tag & flags) === flags) {
          // Unmount
          var inst = effect.inst;
          var destroy = inst.destroy;

          if (destroy !== undefined) {
            inst.destroy = undefined;

            if (enableSchedulingProfiler) {
              if ((flags & HookPassive) !== NoHookEffect) {
                markComponentPassiveEffectUnmountStarted(finishedWork);
              } else if ((flags & HookLayout) !== NoHookEffect) {
                markComponentLayoutEffectUnmountStarted(finishedWork);
              }
            }

            if (__DEV__) {
              if ((flags & HookInsertion) !== NoHookEffect) {
                setIsRunningInsertionEffect(true);
              }
            }

            safelyCallDestroy(finishedWork, nearestMountedAncestor, destroy);

            if (__DEV__) {
              if ((flags & HookInsertion) !== NoHookEffect) {
                setIsRunningInsertionEffect(false);
              }
            }

            if (enableSchedulingProfiler) {
              if ((flags & HookPassive) !== NoHookEffect) {
                markComponentPassiveEffectUnmountStopped();
              } else if ((flags & HookLayout) !== NoHookEffect) {
                markComponentLayoutEffectUnmountStopped();
              }
            }
          }
        }

        effect = effect.next;
      } while (effect !== firstEffect);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
export function commitHookPassiveMountEffects(finishedWork, hookFlags) {
  if (shouldProfile(finishedWork)) {
    startEffectTimer();
    commitHookEffectListMount(hookFlags, finishedWork);
    recordEffectDuration(finishedWork);
  } else {
    commitHookEffectListMount(hookFlags, finishedWork);
  }
}
export function commitHookPassiveUnmountEffects(finishedWork, nearestMountedAncestor, hookFlags) {
  if (shouldProfile(finishedWork)) {
    startEffectTimer();
    commitHookEffectListUnmount(hookFlags, finishedWork, nearestMountedAncestor);
    recordEffectDuration(finishedWork);
  } else {
    commitHookEffectListUnmount(hookFlags, finishedWork, nearestMountedAncestor);
  }
}
export function commitClassLayoutLifecycles(finishedWork, current) {
  var instance = finishedWork.stateNode;

  if (current === null) {
    // We could update instance props and state here,
    // but instead we rely on them being set during last render.
    // TODO: revisit this when we implement resuming.
    if (__DEV__) {
      if (!finishedWork.type.defaultProps && !('ref' in finishedWork.memoizedProps) && !didWarnAboutReassigningProps) {
        if (instance.props !== finishedWork.memoizedProps) {
          console.error('Expected %s props to match memoized props before ' + 'componentDidMount. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
        }

        if (instance.state !== finishedWork.memoizedState) {
          console.error('Expected %s state to match memoized state before ' + 'componentDidMount. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.state`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
        }
      }
    }

    if (shouldProfile(finishedWork)) {
      startEffectTimer();

      if (__DEV__) {
        runWithFiberInDEV(finishedWork, callComponentDidMountInDEV, finishedWork, instance);
      } else {
        try {
          instance.componentDidMount();
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }

      recordEffectDuration(finishedWork);
    } else {
      if (__DEV__) {
        runWithFiberInDEV(finishedWork, callComponentDidMountInDEV, finishedWork, instance);
      } else {
        try {
          instance.componentDidMount();
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
    }
  } else {
    var prevProps = resolveClassComponentProps(finishedWork.type, current.memoizedProps, finishedWork.elementType === finishedWork.type);
    var prevState = current.memoizedState; // We could update instance props and state here,
    // but instead we rely on them being set during last render.
    // TODO: revisit this when we implement resuming.

    if (__DEV__) {
      if (!finishedWork.type.defaultProps && !('ref' in finishedWork.memoizedProps) && !didWarnAboutReassigningProps) {
        if (instance.props !== finishedWork.memoizedProps) {
          console.error('Expected %s props to match memoized props before ' + 'componentDidUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
        }

        if (instance.state !== finishedWork.memoizedState) {
          console.error('Expected %s state to match memoized state before ' + 'componentDidUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.state`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
        }
      }
    }

    if (shouldProfile(finishedWork)) {
      startEffectTimer();

      if (__DEV__) {
        runWithFiberInDEV(finishedWork, callComponentDidUpdateInDEV, finishedWork, instance, prevProps, prevState, instance.__reactInternalSnapshotBeforeUpdate);
      } else {
        try {
          instance.componentDidUpdate(prevProps, prevState, instance.__reactInternalSnapshotBeforeUpdate);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }

      recordEffectDuration(finishedWork);
    } else {
      if (__DEV__) {
        runWithFiberInDEV(finishedWork, callComponentDidUpdateInDEV, finishedWork, instance, prevProps, prevState, instance.__reactInternalSnapshotBeforeUpdate);
      } else {
        try {
          instance.componentDidUpdate(prevProps, prevState, instance.__reactInternalSnapshotBeforeUpdate);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
    }
  }
}
export function commitClassDidMount(finishedWork) {
  // TODO: Check for LayoutStatic flag
  var instance = finishedWork.stateNode;

  if (typeof instance.componentDidMount === 'function') {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, callComponentDidMountInDEV, finishedWork, instance);
    } else {
      try {
        instance.componentDidMount();
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
  }
}
export function commitClassCallbacks(finishedWork) {
  // TODO: I think this is now always non-null by the time it reaches the
  // commit phase. Consider removing the type check.
  var updateQueue = finishedWork.updateQueue;

  if (updateQueue !== null) {
    var instance = finishedWork.stateNode;

    if (__DEV__) {
      if (!finishedWork.type.defaultProps && !('ref' in finishedWork.memoizedProps) && !didWarnAboutReassigningProps) {
        if (instance.props !== finishedWork.memoizedProps) {
          console.error('Expected %s props to match memoized props before ' + 'processing the update queue. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
        }

        if (instance.state !== finishedWork.memoizedState) {
          console.error('Expected %s state to match memoized state before ' + 'processing the update queue. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.state`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
        }
      }
    } // We could update instance props and state here,
    // but instead we rely on them being set during last render.
    // TODO: revisit this when we implement resuming.


    try {
      if (__DEV__) {
        runWithFiberInDEV(finishedWork, commitCallbacks, updateQueue, instance);
      } else {
        commitCallbacks(updateQueue, instance);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}
export function commitClassHiddenCallbacks(finishedWork) {
  // Commit any callbacks that would have fired while the component
  // was hidden.
  var updateQueue = finishedWork.updateQueue;

  if (updateQueue !== null) {
    var instance = finishedWork.stateNode;

    try {
      if (__DEV__) {
        runWithFiberInDEV(finishedWork, commitHiddenCallbacks, updateQueue, instance);
      } else {
        commitHiddenCallbacks(updateQueue, instance);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}
export function commitRootCallbacks(finishedWork) {
  // TODO: I think this is now always non-null by the time it reaches the
  // commit phase. Consider removing the type check.
  var updateQueue = finishedWork.updateQueue;

  if (updateQueue !== null) {
    var instance = null;

    if (finishedWork.child !== null) {
      switch (finishedWork.child.tag) {
        case HostSingleton:
        case HostComponent:
          instance = getPublicInstance(finishedWork.child.stateNode);
          break;

        case ClassComponent:
          instance = finishedWork.child.stateNode;
          break;
      }
    }

    try {
      if (__DEV__) {
        runWithFiberInDEV(finishedWork, commitCallbacks, updateQueue, instance);
      } else {
        commitCallbacks(updateQueue, instance);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}
var didWarnAboutUndefinedSnapshotBeforeUpdate = null;

if (__DEV__) {
  didWarnAboutUndefinedSnapshotBeforeUpdate = new Set();
}

function callGetSnapshotBeforeUpdates(instance, prevProps, prevState) {
  return instance.getSnapshotBeforeUpdate(prevProps, prevState);
}

export function commitClassSnapshot(finishedWork, current) {
  var prevProps = current.memoizedProps;
  var prevState = current.memoizedState;
  var instance = finishedWork.stateNode; // We could update instance props and state here,
  // but instead we rely on them being set during last render.
  // TODO: revisit this when we implement resuming.

  if (__DEV__) {
    if (!finishedWork.type.defaultProps && !('ref' in finishedWork.memoizedProps) && !didWarnAboutReassigningProps) {
      if (instance.props !== finishedWork.memoizedProps) {
        console.error('Expected %s props to match memoized props before ' + 'getSnapshotBeforeUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.props`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
      }

      if (instance.state !== finishedWork.memoizedState) {
        console.error('Expected %s state to match memoized state before ' + 'getSnapshotBeforeUpdate. ' + 'This might either be because of a bug in React, or because ' + 'a component reassigns its own `this.state`. ' + 'Please file an issue.', getComponentNameFromFiber(finishedWork) || 'instance');
      }
    }
  }

  try {
    var resolvedPrevProps = resolveClassComponentProps(finishedWork.type, prevProps, finishedWork.elementType === finishedWork.type);
    var snapshot;

    if (__DEV__) {
      snapshot = runWithFiberInDEV(finishedWork, callGetSnapshotBeforeUpdates, instance, resolvedPrevProps, prevState);
      var didWarnSet = didWarnAboutUndefinedSnapshotBeforeUpdate;

      if (snapshot === undefined && !didWarnSet.has(finishedWork.type)) {
        didWarnSet.add(finishedWork.type);
        runWithFiberInDEV(finishedWork, function () {
          console.error('%s.getSnapshotBeforeUpdate(): A snapshot value (or null) ' + 'must be returned. You have returned undefined.', getComponentNameFromFiber(finishedWork));
        });
      }
    } else {
      snapshot = callGetSnapshotBeforeUpdates(instance, resolvedPrevProps, prevState);
    }

    instance.__reactInternalSnapshotBeforeUpdate = snapshot;
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
} // Capture errors so they don't interrupt unmounting.

export function safelyCallComponentWillUnmount(current, nearestMountedAncestor, instance) {
  instance.props = resolveClassComponentProps(current.type, current.memoizedProps, current.elementType === current.type);
  instance.state = current.memoizedState;

  if (shouldProfile(current)) {
    startEffectTimer();

    if (__DEV__) {
      runWithFiberInDEV(current, callComponentWillUnmountInDEV, current, nearestMountedAncestor, instance);
    } else {
      try {
        instance.componentWillUnmount();
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      }
    }

    recordEffectDuration(current);
  } else {
    if (__DEV__) {
      runWithFiberInDEV(current, callComponentWillUnmountInDEV, current, nearestMountedAncestor, instance);
    } else {
      try {
        instance.componentWillUnmount();
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      }
    }
  }
}

function commitAttachRef(finishedWork) {
  var ref = finishedWork.ref;

  if (ref !== null) {
    var instanceToUse;

    switch (finishedWork.tag) {
      case HostHoistable:
      case HostSingleton:
      case HostComponent:
        instanceToUse = getPublicInstance(finishedWork.stateNode);
        break;

      case ViewTransitionComponent:
        {
          if (enableViewTransition) {
            var instance = finishedWork.stateNode;
            var props = finishedWork.memoizedProps;
            var name = getViewTransitionName(props, instance);

            if (instance.ref === null || instance.ref.name !== name) {
              instance.ref = createViewTransitionInstance(name);
            }

            instanceToUse = instance.ref;
            break;
          }

          instanceToUse = finishedWork.stateNode;
          break;
        }

      case Fragment:
        if (enableFragmentRefs) {
          var _instance = finishedWork.stateNode;

          if (_instance === null) {
            finishedWork.stateNode = createFragmentInstance(finishedWork);
          }

          instanceToUse = finishedWork.stateNode;
          break;
        }

      // Fallthrough

      default:
        instanceToUse = finishedWork.stateNode;
    }

    if (typeof ref === 'function') {
      if (shouldProfile(finishedWork)) {
        try {
          startEffectTimer();
          finishedWork.refCleanup = ref(instanceToUse);
        } finally {
          recordEffectDuration(finishedWork);
        }
      } else {
        finishedWork.refCleanup = ref(instanceToUse);
      }
    } else {
      if (__DEV__) {
        // TODO: We should move these warnings to happen during the render
        // phase (markRef).
        if (typeof ref === 'string') {
          console.error('String refs are no longer supported.');
        } else if (!ref.hasOwnProperty('current')) {
          console.error('Unexpected ref object provided for %s. ' + 'Use either a ref-setter function or React.createRef().', getComponentNameFromFiber(finishedWork));
        }
      } // $FlowFixMe[incompatible-use] unable to narrow type to the non-function case


      ref.current = instanceToUse;
    }
  }
} // Capture errors so they don't interrupt mounting.


export function safelyAttachRef(current, nearestMountedAncestor) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(current, commitAttachRef, current);
    } else {
      commitAttachRef(current);
    }
  } catch (error) {
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}
export function safelyDetachRef(current, nearestMountedAncestor) {
  var ref = current.ref;
  var refCleanup = current.refCleanup;

  if (ref !== null) {
    if (typeof refCleanup === 'function') {
      try {
        if (shouldProfile(current)) {
          try {
            startEffectTimer();

            if (__DEV__) {
              runWithFiberInDEV(current, refCleanup);
            } else {
              refCleanup();
            }
          } finally {
            recordEffectDuration(current);
          }
        } else {
          if (__DEV__) {
            runWithFiberInDEV(current, refCleanup);
          } else {
            refCleanup();
          }
        }
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      } finally {
        // `refCleanup` has been called. Nullify all references to it to prevent double invocation.
        current.refCleanup = null;
        var finishedWork = current.alternate;

        if (finishedWork != null) {
          finishedWork.refCleanup = null;
        }
      }
    } else if (typeof ref === 'function') {
      try {
        if (shouldProfile(current)) {
          try {
            startEffectTimer();

            if (__DEV__) {
              runWithFiberInDEV(current, ref, null);
            } else {
              ref(null);
            }
          } finally {
            recordEffectDuration(current);
          }
        } else {
          if (__DEV__) {
            runWithFiberInDEV(current, ref, null);
          } else {
            ref(null);
          }
        }
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      }
    } else {
      // $FlowFixMe[incompatible-use] unable to narrow type to RefObject
      ref.current = null;
    }
  }
}

function safelyCallDestroy(current, nearestMountedAncestor, destroy, resource) {
  // $FlowFixMe[extra-arg] @poteto this is safe either way because the extra arg is ignored if it's not a CRUD effect
  var destroy_ = resource == null ? destroy : destroy.bind(null, resource);

  if (__DEV__) {
    runWithFiberInDEV(current, callDestroyInDEV, current, nearestMountedAncestor, destroy_);
  } else {
    try {
      // $FlowFixMe(incompatible-call) Already bound to resource
      destroy_();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
}

function commitProfiler(finishedWork, current, commitStartTime, effectDuration) {
  var _ref = finishedWork.memoizedProps,
      id = _ref.id,
      onCommit = _ref.onCommit,
      onRender = _ref.onRender;
  var phase = current === null ? 'mount' : 'update';

  if (enableProfilerNestedUpdatePhase) {
    if (isCurrentUpdateNested()) {
      phase = 'nested-update';
    }
  }

  if (typeof onRender === 'function') {
    onRender(id, phase, // $FlowFixMe: This should be always a number in profiling mode
    finishedWork.actualDuration, // $FlowFixMe: This should be always a number in profiling mode
    finishedWork.treeBaseDuration, // $FlowFixMe: This should be always a number in profiling mode
    finishedWork.actualStartTime, commitStartTime);
  }

  if (enableProfilerCommitHooks) {
    if (typeof onCommit === 'function') {
      onCommit(id, phase, effectDuration, commitStartTime);
    }
  }
}

export function commitProfilerUpdate(finishedWork, current, commitStartTime, effectDuration) {
  if (enableProfilerTimer) {
    try {
      if (__DEV__) {
        runWithFiberInDEV(finishedWork, commitProfiler, finishedWork, current, commitStartTime, effectDuration);
      } else {
        commitProfiler(finishedWork, current, commitStartTime, effectDuration);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}

function commitProfilerPostCommitImpl(finishedWork, current, commitStartTime, passiveEffectDuration) {
  var _finishedWork$memoize = finishedWork.memoizedProps,
      id = _finishedWork$memoize.id,
      onPostCommit = _finishedWork$memoize.onPostCommit;
  var phase = current === null ? 'mount' : 'update';

  if (enableProfilerNestedUpdatePhase) {
    if (isCurrentUpdateNested()) {
      phase = 'nested-update';
    }
  }

  if (typeof onPostCommit === 'function') {
    onPostCommit(id, phase, passiveEffectDuration, commitStartTime);
  }
}

export function commitProfilerPostCommit(finishedWork, current, commitStartTime, passiveEffectDuration) {
  try {
    if (__DEV__) {
      runWithFiberInDEV(finishedWork, commitProfilerPostCommitImpl, finishedWork, current, commitStartTime, passiveEffectDuration);
    } else {
      commitProfilerPostCommitImpl(finishedWork, current, commitStartTime, passiveEffectDuration);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}