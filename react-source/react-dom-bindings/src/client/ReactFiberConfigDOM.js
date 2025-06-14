/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * this source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { NotPending } from '../shared/ReactDOMFormActions';
import { setSrcObject } from './ReactDOMSrcObject';
import { getCurrentRootHostContainer } from 'react-reconciler/src/ReactFiberHostContext';
import { runWithFiberInDEV } from 'react-reconciler/src/ReactCurrentFiber';
import hasOwnProperty from 'shared/hasOwnProperty';
import { checkAttributeStringCoercion } from 'shared/CheckStringCoercion';
import { REACT_CONTEXT_TYPE } from 'shared/ReactSymbols';
import { isFiberContainedBy, isFiberFollowing, isFiberPreceding } from 'react-reconciler/src/ReactFiberTreeReflection';
export { setCurrentUpdatePriority, getCurrentUpdatePriority, resolveUpdatePriority } from './ReactDOMUpdatePriority';
import { precacheFiberNode, updateFiberProps, getFiberCurrentPropsFromNode, getInstanceFromNode, getClosestInstanceFromNode, getFiberFromScopeInstance, getInstanceFromNode as getInstanceFromNodeDOMTree, isContainerMarkedAsRoot, detachDeletedInstance, getResourcesFromRoot, isMarkedHoistable, markNodeAsHoistable, isOwnedInstance } from './ReactDOMComponentTree';
import { traverseFragmentInstance, getFragmentParentHostFiber, getNextSiblingHostFiber, getInstanceFromHostFiber, traverseFragmentInstanceDeeply } from 'react-reconciler/src/ReactFiberTreeReflection';
export { detachDeletedInstance };
import { hasRole } from './DOMAccessibilityRoles';
import { setInitialProperties, updateProperties, hydrateProperties, hydrateText, diffHydratedProperties, getPropsFromElement, diffHydratedText, trapClickOnNonInteractiveElement } from './ReactDOMComponent';
import { hydrateInput } from './ReactDOMInput';
import { hydrateTextarea } from './ReactDOMTextarea';
import { hydrateSelect } from './ReactDOMSelect';
import { getSelectionInformation, restoreSelection } from './ReactInputSelection';
import setTextContent from './setTextContent';
import { validateDOMNesting, validateTextNesting, updatedAncestorInfoDev } from './validateDOMNesting';
import { isEnabled as ReactBrowserEventEmitterIsEnabled, setEnabled as ReactBrowserEventEmitterSetEnabled } from '../events/ReactDOMEventListener';
import { SVG_NAMESPACE, MATH_NAMESPACE } from './DOMNamespaces';
import { ELEMENT_NODE, TEXT_NODE, COMMENT_NODE, DOCUMENT_NODE, DOCUMENT_TYPE_NODE, DOCUMENT_FRAGMENT_NODE } from './HTMLNodeType';
import { flushEventReplaying, retryIfBlockedOn } from '../events/ReactDOMEventReplaying';
import { enableCreateEventHandleAPI, enableScopeAPI, enableTrustedTypesIntegration, disableLegacyMode, enableMoveBefore, disableCommentsAsDOMContainers, enableSuspenseyImages, enableSrcObject, enableViewTransition, enableHydrationChangeEvent } from 'shared/ReactFeatureFlags';
import { HostComponent, HostHoistable, HostText, HostSingleton } from 'react-reconciler/src/ReactWorkTags';
import { listenToAllSupportedEvents } from '../events/DOMPluginEventSystem';
import { validateLinkPropsForStyleResource } from '../shared/ReactDOMResourceValidation';
import escapeSelectorAttributeValueInsideDoubleQuotes from './escapeSelectorAttributeValueInsideDoubleQuotes';
import { flushSyncWork as flushSyncWorkOnAllRoots } from 'react-reconciler/src/ReactFiberWorkLoop';
import { requestFormReset as requestFormResetOnFiber } from 'react-reconciler/src/ReactFiberHooks';
import ReactDOMSharedInternals from 'shared/ReactDOMSharedInternals';
export { default as rendererVersion } from 'shared/ReactVersion';
import noop from 'shared/noop';
export var rendererPackageName = 'react-dom';
export var extraDevToolsConfig = null; // Unused

var SUPPRESS_HYDRATION_WARNING = 'suppressHydrationWarning';
var ACTIVITY_START_DATA = '&';
var ACTIVITY_END_DATA = '/&';
var SUSPENSE_START_DATA = '$';
var SUSPENSE_END_DATA = '/$';
var SUSPENSE_PENDING_START_DATA = '$?';
var SUSPENSE_QUEUED_START_DATA = '$~';
var SUSPENSE_FALLBACK_START_DATA = '$!';
var PREAMBLE_CONTRIBUTION_HTML = 'html';
var PREAMBLE_CONTRIBUTION_BODY = 'body';
var PREAMBLE_CONTRIBUTION_HEAD = 'head';
var FORM_STATE_IS_MATCHING = 'F!';
var FORM_STATE_IS_NOT_MATCHING = 'F';
var DOCUMENT_READY_STATE_LOADING = 'loading';
var STYLE = 'style';
export var HostContextNamespaceNone = 0;
var HostContextNamespaceSvg = 1;
var HostContextNamespaceMath = 2;
var eventsEnabled = null;
var selectionInformation = null;
export * from 'react-reconciler/src/ReactFiberConfigWithNoPersistence';

function getOwnerDocumentFromRootContainer(rootContainerElement) {
  return rootContainerElement.nodeType === DOCUMENT_NODE ? rootContainerElement : rootContainerElement.ownerDocument;
}

export function getRootHostContext(rootContainerInstance) {
  var type;
  var context;
  var nodeType = rootContainerInstance.nodeType;

  switch (nodeType) {
    case DOCUMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE:
      {
        type = nodeType === DOCUMENT_NODE ? '#document' : '#fragment';
        var root = rootContainerInstance.documentElement;

        if (root) {
          var namespaceURI = root.namespaceURI;
          context = namespaceURI ? getOwnHostContext(namespaceURI) : HostContextNamespaceNone;
        } else {
          context = HostContextNamespaceNone;
        }

        break;
      }

    default:
      {
        var container = !disableCommentsAsDOMContainers && nodeType === COMMENT_NODE ? rootContainerInstance.parentNode : rootContainerInstance;
        type = container.tagName;
        var _namespaceURI = container.namespaceURI;

        if (!_namespaceURI) {
          switch (type) {
            case 'svg':
              context = HostContextNamespaceSvg;
              break;

            case 'math':
              context = HostContextNamespaceMath;
              break;

            default:
              context = HostContextNamespaceNone;
              break;
          }
        } else {
          var ownContext = getOwnHostContext(_namespaceURI);
          context = getChildHostContextProd(ownContext, type);
        }

        break;
      }
  }

  if (__DEV__) {
    var validatedTag = type.toLowerCase();
    var ancestorInfo = updatedAncestorInfoDev(null, validatedTag);
    return {
      context: context,
      ancestorInfo: ancestorInfo
    };
  }

  return context;
}

function getOwnHostContext(namespaceURI) {
  switch (namespaceURI) {
    case SVG_NAMESPACE:
      return HostContextNamespaceSvg;

    case MATH_NAMESPACE:
      return HostContextNamespaceMath;

    default:
      return HostContextNamespaceNone;
  }
}

function getChildHostContextProd(parentNamespace, type) {
  if (parentNamespace === HostContextNamespaceNone) {
    // No (or default) parent namespace: potential entry point.
    switch (type) {
      case 'svg':
        return HostContextNamespaceSvg;

      case 'math':
        return HostContextNamespaceMath;

      default:
        return HostContextNamespaceNone;
    }
  }

  if (parentNamespace === HostContextNamespaceSvg && type === 'foreignObject') {
    // We're leaving SVG.
    return HostContextNamespaceNone;
  } // By default, pass namespace below.


  return parentNamespace;
}

export function getChildHostContext(parentHostContext, type) {
  if (__DEV__) {
    var parentHostContextDev = parentHostContext;
    var context = getChildHostContextProd(parentHostContextDev.context, type);
    var ancestorInfo = updatedAncestorInfoDev(parentHostContextDev.ancestorInfo, type);
    return {
      context: context,
      ancestorInfo: ancestorInfo
    };
  }

  var parentNamespace = parentHostContext;
  return getChildHostContextProd(parentNamespace, type);
}
export function getPublicInstance(instance) {
  return instance;
}
export function prepareForCommit(containerInfo) {
  eventsEnabled = ReactBrowserEventEmitterIsEnabled();
  selectionInformation = getSelectionInformation(containerInfo);
  var activeInstance = null;

  if (enableCreateEventHandleAPI) {
    var focusedElem = selectionInformation.focusedElem;

    if (focusedElem !== null) {
      activeInstance = getClosestInstanceFromNode(focusedElem);
    }
  }

  ReactBrowserEventEmitterSetEnabled(false);
  return activeInstance;
}
export function beforeActiveInstanceBlur(internalInstanceHandle) {
  if (enableCreateEventHandleAPI) {
    ReactBrowserEventEmitterSetEnabled(true);
    dispatchBeforeDetachedBlur(selectionInformation.focusedElem, internalInstanceHandle);
    ReactBrowserEventEmitterSetEnabled(false);
  }
}
export function afterActiveInstanceBlur() {
  if (enableCreateEventHandleAPI) {
    ReactBrowserEventEmitterSetEnabled(true);
    dispatchAfterDetachedBlur(selectionInformation.focusedElem);
    ReactBrowserEventEmitterSetEnabled(false);
  }
}
export function resetAfterCommit(containerInfo) {
  restoreSelection(selectionInformation, containerInfo);
  ReactBrowserEventEmitterSetEnabled(eventsEnabled);
  eventsEnabled = null;
  selectionInformation = null;
}
export function createHoistableInstance(type, props, rootContainerInstance, internalInstanceHandle) {
  var ownerDocument = getOwnerDocumentFromRootContainer(rootContainerInstance);
  var domElement = ownerDocument.createElement(type);
  precacheFiberNode(internalInstanceHandle, domElement);
  updateFiberProps(domElement, props);
  setInitialProperties(domElement, type, props);
  markNodeAsHoistable(domElement);
  return domElement;
}
var didWarnScriptTags = false;
var warnedUnknownTags = {
  // There are working polyfills for <dialog>. Let people use it.
  dialog: true,
  // Electron ships a custom <webview> tag to display external web content in
  // an isolated frame and process.
  // this tag is not present in non Electron environments such as JSDom which
  // is often used for testing purposes.
  // @see https://electronjs.org/docs/api/webview-tag
  webview: true
};
export function createInstance(type, props, rootContainerInstance, hostContext, internalInstanceHandle) {
  var hostContextProd;

  if (__DEV__) {
    // TODO: take namespace into account when validating.
    var hostContextDev = hostContext;
    validateDOMNesting(type, hostContextDev.ancestorInfo);
    hostContextProd = hostContextDev.context;
  } else {
    hostContextProd = hostContext;
  }

  var ownerDocument = getOwnerDocumentFromRootContainer(rootContainerInstance);
  var domElement;

  switch (hostContextProd) {
    case HostContextNamespaceSvg:
      domElement = ownerDocument.createElementNS(SVG_NAMESPACE, type);
      break;

    case HostContextNamespaceMath:
      domElement = ownerDocument.createElementNS(MATH_NAMESPACE, type);
      break;

    default:
      switch (type) {
        case 'svg':
          {
            domElement = ownerDocument.createElementNS(SVG_NAMESPACE, type);
            break;
          }

        case 'math':
          {
            domElement = ownerDocument.createElementNS(MATH_NAMESPACE, type);
            break;
          }

        case 'script':
          {
            // Create the script via .innerHTML so its "parser-inserted" flag is
            // set to true and it does not execute
            var div = ownerDocument.createElement('div');

            if (__DEV__) {
              if (enableTrustedTypesIntegration && !didWarnScriptTags) {
                console.error('Encountered a script tag while rendering React component. ' + 'Scripts inside React components are never executed when rendering ' + 'on the client. Consider using template tag instead ' + '(https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template).');
                didWarnScriptTags = true;
              }
            }

            div.innerHTML = '<script><' + '/script>'; // this is guaranteed to yield a script element.

            var firstChild = div.firstChild;
            domElement = div.removeChild(firstChild);
            break;
          }

        case 'select':
          {
            if (typeof props.is === 'string') {
              domElement = ownerDocument.createElement('select', {
                is: props.is
              });
            } else {
              // Separate else branch instead of using `props.is || undefined` above because of a Firefox bug.
              // See discussion in https://github.com/facebook/react/pull/6896
              // and discussion in https://bugzilla.mozilla.org/show_bug.cgi?id=1276240
              domElement = ownerDocument.createElement('select');
            }

            if (props.multiple) {
              domElement.multiple = true;
            } else if (props.size) {
              // Setting a size greater than 1 causes a select to behave like `multiple=true`, where
              // it is possible that no option is selected.
              //
              // this is only necessary when a select in "single selection mode".
              domElement.size = props.size;
            }

            break;
          }

        default:
          {
            if (typeof props.is === 'string') {
              domElement = ownerDocument.createElement(type, {
                is: props.is
              });
            } else {
              // Separate else branch instead of using `props.is || undefined` above because of a Firefox bug.
              // See discussion in https://github.com/facebook/react/pull/6896
              // and discussion in https://bugzilla.mozilla.org/show_bug.cgi?id=1276240
              domElement = ownerDocument.createElement(type);
            }

            if (__DEV__) {
              if (type.indexOf('-') === -1) {
                // We're not SVG/MathML and we don't have a dash, so we're not a custom element
                // Even if you use `is`, these should be of known type and lower case.
                if (type !== type.toLowerCase()) {
                  console.error('<%s /> is using incorrect casing. ' + 'Use PascalCase for React components, ' + 'or lowercase for HTML elements.', type);
                }

                if ( // $FlowFixMe[method-unbinding]
                Object.prototype.toString.call(domElement) === '[object HTMLUnknownElement]' && !hasOwnProperty.call(warnedUnknownTags, type)) {
                  warnedUnknownTags[type] = true;
                  console.error('The tag <%s> is unrecognized in this browser. ' + 'If you meant to render a React component, start its name with ' + 'an uppercase letter.', type);
                }
              }
            }
          }
      }

  }

  precacheFiberNode(internalInstanceHandle, domElement);
  updateFiberProps(domElement, props);
  return domElement;
}
export function cloneMutableInstance(instance, keepChildren) {
  return instance.cloneNode(keepChildren);
}
export function appendInitialChild(parentInstance, child) {
  // Note: this should not use moveBefore() because initial are appended while disconnected.
  parentInstance.appendChild(child);
}
export function finalizeInitialChildren(domElement, type, props, hostContext) {
  setInitialProperties(domElement, type, props);

  switch (type) {
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      return !!props.autoFocus;

    case 'img':
      return true;

    default:
      return false;
  }
}
export function finalizeHydratedChildren(domElement, type, props, hostContext) {
  // TOOD: Consider unifying this with hydrateInstance.
  if (!enableHydrationChangeEvent) {
    return false;
  }

  switch (type) {
    case 'input':
    case 'select':
    case 'textarea':
    case 'img':
      return true;

    default:
      return false;
  }
}
export function shouldSetTextContent(type, props) {
  return type === 'textarea' || type === 'noscript' || typeof props.children === 'string' || typeof props.children === 'number' || typeof props.children === 'bigint' || typeof props.dangerouslySetInnerHTML === 'object' && props.dangerouslySetInnerHTML !== null && props.dangerouslySetInnerHTML.__html != null;
}
export function createTextInstance(text, rootContainerInstance, hostContext, internalInstanceHandle) {
  if (__DEV__) {
    var hostContextDev = hostContext;
    var ancestor = hostContextDev.ancestorInfo.current;

    if (ancestor != null) {
      validateTextNesting(text, ancestor.tag, hostContextDev.ancestorInfo.implicitRootScope);
    }
  }

  var textNode = getOwnerDocumentFromRootContainer(rootContainerInstance).createTextNode(text);
  precacheFiberNode(internalInstanceHandle, textNode);
  return textNode;
}
export function cloneMutableTextInstance(textInstance) {
  return textInstance.cloneNode(false);
}
var currentPopstateTransitionEvent = null;
export function shouldAttemptEagerTransition() {
  var event = window.event;

  if (event && event.type === 'popstate') {
    // this is a popstate event. Attempt to render any transition during this
    // event synchronously. Unless we already attempted during this event.
    if (event === currentPopstateTransitionEvent) {
      // We already attempted to render this popstate transition synchronously.
      // Any subsequent attempts must have happened as the result of a derived
      // update, like startTransition inside useEffect, or useDV. Switch back to
      // the default behavior for all remaining transitions during the current
      // popstate event.
      return false;
    } else {
      // Cache the current event in case a derived transition is scheduled.
      // (Refer to previous branch.)
      currentPopstateTransitionEvent = event;
      return true;
    }
  } // We're not inside a popstate event.


  currentPopstateTransitionEvent = null;
  return false;
}
var schedulerEvent = undefined;
export function trackSchedulerEvent() {
  schedulerEvent = window.event;
}
export function resolveEventType() {
  var event = window.event;
  return event && event !== schedulerEvent ? event.type : null;
}
export function resolveEventTimeStamp() {
  var event = window.event;
  return event && event !== schedulerEvent ? event.timeStamp : -1.1;
}
export var isPrimaryRenderer = true;
export var warnsIfNotActing = true; // this initialization code may run even on server environments
// if a component just imports ReactDOM (e.g. for findDOMNode).
// Some environments might not have setTimeout or clearTimeout.

export var scheduleTimeout = typeof setTimeout === 'function' ? setTimeout : undefined;
export var cancelTimeout = typeof clearTimeout === 'function' ? clearTimeout : undefined;
export var noTimeout = -1;
var localPromise = typeof Promise === 'function' ? Promise : undefined;
var localRequestAnimationFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : scheduleTimeout;
export { getClosestInstanceFromNode as getInstanceFromNode };
export function preparePortalMount(portalInstance) {
  listenToAllSupportedEvents(portalInstance);
}
export function prepareScopeUpdate(scopeInstance, internalInstanceHandle) {
  if (enableScopeAPI) {
    precacheFiberNode(internalInstanceHandle, scopeInstance);
  }
}
export function getInstanceFromScope(scopeInstance) {
  if (enableScopeAPI) {
    return getFiberFromScopeInstance(scopeInstance);
  }

  return null;
} // -------------------
//     Microtasks
// -------------------

export var supportsMicrotasks = true;
export var scheduleMicrotask = typeof queueMicrotask === 'function' ? queueMicrotask : typeof localPromise !== 'undefined' ? function (callback) {
  return localPromise.resolve(null).then(callback).catch(handleErrorInNextTick);
} : scheduleTimeout; // TODO: Determine the best fallback here.

function handleErrorInNextTick(error) {
  setTimeout(function () {
    throw error;
  });
} // -------------------
//     Mutation
// -------------------


export var supportsMutation = true;
export function commitMount(domElement, type, newProps, internalInstanceHandle) {
  // Despite the naming that might imply otherwise, this method only
  // fires if there is an `Update` effect scheduled during mounting.
  // this happens if `finalizeInitialChildren` returns `true` (which it
  // does to implement the `autoFocus` attribute on the client). But
  // there are also other cases when this might happen (such as patching
  // up text content during hydration mismatch). So we'll check this again.
  switch (type) {
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      if (newProps.autoFocus) {
        domElement.focus();
      }

      return;

    case 'img':
      {
        // The technique here is to assign the src or srcSet property to cause the browser
        // to issue a new load event. If it hasn't loaded yet it'll fire whenever the load actually completes.
        // If it has already loaded we missed it so the second load will still be the first one that executes
        // any associated onLoad props.
        // Even if we have srcSet we prefer to reassign src. The reason is that Firefox does not trigger a new
        // load event when only srcSet is assigned. Chrome will trigger a load event if either is assigned so we
        // only need to assign one. And Safari just never triggers a new load event which means this technique
        // is already a noop regardless of which properties are assigned. We should revisit if browsers update
        // this heuristic in the future.
        if (newProps.src) {
          var src = newProps.src;

          if (enableSrcObject && typeof src === 'object') {
            // For object src, we can't just set the src again to the same blob URL because it might have
            // already revoked if it loaded before this. However, we can create a new blob URL and set that.
            // this is relatively cheap since the blob is already in memory but this might cause some
            // duplicated work.
            // TODO: We could maybe detect if load hasn't fired yet and if so reuse the URL.
            try {
              setSrcObject(domElement, type, src);
              return;
            } catch (x) {// If URL.createObjectURL() errors, it was probably some other object type
              // that should be toString:ed instead, so we just fall-through to the normal
              // path.
            }
          }

          domElement.src = src;
        } else if (newProps.srcSet) {
          domElement.srcset = newProps.srcSet;
        }

        return;
      }
  }
}
export function commitHydratedInstance(domElement, type, props, internalInstanceHandle) {
  if (!enableHydrationChangeEvent) {
    return;
  } // this fires in the commit phase if a hydrated instance needs to do further
  // work in the commit phase. Similar to commitMount. However, this should not
  // do things that would've already happened such as set auto focus since that
  // would steal focus. It's only scheduled if finalizeHydratedChildren returns
  // true.


  switch (type) {
    case 'input':
      {
        hydrateInput(domElement, props.value, props.defaultValue, props.checked, props.defaultChecked);
        break;
      }

    case 'select':
      {
        hydrateSelect(domElement, props.value, props.defaultValue, props.multiple);
        break;
      }

    case 'textarea':
      hydrateTextarea(domElement, props.value, props.defaultValue);
      break;

    case 'img':
      // TODO: Should we replay onLoad events?
      break;
  }
}
export function commitUpdate(domElement, type, oldProps, newProps, internalInstanceHandle) {
  // Diff and update the properties.
  updateProperties(domElement, type, oldProps, newProps); // Update the props handle so that we know which props are the ones with
  // with current event handlers.

  updateFiberProps(domElement, newProps);
}
export function resetTextContent(domElement) {
  setTextContent(domElement, '');
}
export function commitTextUpdate(textInstance, oldText, newText) {
  textInstance.nodeValue = newText;
}
var supportsMoveBefore = // $FlowFixMe[prop-missing]: We're doing the feature detection here.
enableMoveBefore && typeof window !== 'undefined' && typeof window.Element.prototype.moveBefore === 'function';
export function appendChild(parentInstance, child) {
  if (supportsMoveBefore && child.parentNode !== null) {
    // $FlowFixMe[prop-missing]: We've checked this with supportsMoveBefore.
    parentInstance.moveBefore(child, null);
  } else {
    parentInstance.appendChild(child);
  }
}

function warnForReactChildrenConflict(container) {
  if (__DEV__) {
    if (container.__reactWarnedAboutChildrenConflict) {
      return;
    }

    var props = getFiberCurrentPropsFromNode(container);

    if (props !== null) {
      var fiber = getInstanceFromNode(container);

      if (fiber !== null) {
        if (typeof props.children === 'string' || typeof props.children === 'number') {
          container.__reactWarnedAboutChildrenConflict = true; // Run the warning with the Fiber of the container for context of where the children are specified.
          // We could also maybe use the Portal. The current execution context is the child being added.

          runWithFiberInDEV(fiber, function () {
            console.error('Cannot use a ref on a React element as a container to `createRoot` or `createPortal` ' + 'if that element also sets "children" text content using React. It should be a leaf with no children. ' + "Otherwise it's ambiguous which children should be used.");
          });
        } else if (props.dangerouslySetInnerHTML != null) {
          container.__reactWarnedAboutChildrenConflict = true;
          runWithFiberInDEV(fiber, function () {
            console.error('Cannot use a ref on a React element as a container to `createRoot` or `createPortal` ' + 'if that element also sets "dangerouslySetInnerHTML" using React. It should be a leaf with no children. ' + "Otherwise it's ambiguous which children should be used.");
          });
        }
      }
    }
  }
}

export function appendChildToContainer(container, child) {
  if (__DEV__) {
    warnForReactChildrenConflict(container);
  }

  var parentNode;

  if (container.nodeType === DOCUMENT_NODE) {
    parentNode = container.body;
  } else if (!disableCommentsAsDOMContainers && container.nodeType === COMMENT_NODE) {
    parentNode = container.parentNode;

    if (supportsMoveBefore && child.parentNode !== null) {
      // $FlowFixMe[prop-missing]: We've checked this with supportsMoveBefore.
      parentNode.moveBefore(child, container);
    } else {
      parentNode.insertBefore(child, container);
    }

    return;
  } else if (container.nodeName === 'HTML') {
    parentNode = container.ownerDocument.body;
  } else {
    parentNode = container;
  }

  if (supportsMoveBefore && child.parentNode !== null) {
    // $FlowFixMe[prop-missing]: We've checked this with supportsMoveBefore.
    parentNode.moveBefore(child, null);
  } else {
    parentNode.appendChild(child);
  } // this container might be used for a portal.
  // If something inside a portal is clicked, that click should bubble
  // through the React tree. However, on Mobile Safari the click would
  // never bubble through the *DOM* tree unless an ancestor with onclick
  // event exists. So we wouldn't see it and dispatch it.
  // this is why we ensure that non React root containers have inline onclick
  // defined.
  // https://github.com/facebook/react/issues/11918


  var reactRootContainer = container._reactRootContainer;

  if ((reactRootContainer === null || reactRootContainer === undefined) && parentNode.onclick === null) {
    // TODO: this cast may not be sound for SVG, MathML or custom elements.
    trapClickOnNonInteractiveElement(parentNode);
  }
}
export function insertBefore(parentInstance, child, beforeChild) {
  if (supportsMoveBefore && child.parentNode !== null) {
    // $FlowFixMe[prop-missing]: We've checked this with supportsMoveBefore.
    parentInstance.moveBefore(child, beforeChild);
  } else {
    parentInstance.insertBefore(child, beforeChild);
  }
}
export function insertInContainerBefore(container, child, beforeChild) {
  if (__DEV__) {
    warnForReactChildrenConflict(container);
  }

  var parentNode;

  if (container.nodeType === DOCUMENT_NODE) {
    parentNode = container.body;
  } else if (!disableCommentsAsDOMContainers && container.nodeType === COMMENT_NODE) {
    parentNode = container.parentNode;
  } else if (container.nodeName === 'HTML') {
    parentNode = container.ownerDocument.body;
  } else {
    parentNode = container;
  }

  if (supportsMoveBefore && child.parentNode !== null) {
    // $FlowFixMe[prop-missing]: We've checked this with supportsMoveBefore.
    parentNode.moveBefore(child, beforeChild);
  } else {
    parentNode.insertBefore(child, beforeChild);
  }
}
export function isSingletonScope(type) {
  return type === 'head';
}

function createEvent(type, bubbles) {
  var event = document.createEvent('Event');
  event.initEvent(type, bubbles, false);
  return event;
}

function dispatchBeforeDetachedBlur(target, internalInstanceHandle) {
  if (enableCreateEventHandleAPI) {
    var _event = createEvent('beforeblur', true); // Dispatch "beforeblur" directly on the target,
    // so it gets picked up by the event system and
    // can propagate through the React internal tree.
    // $FlowFixMe[prop-missing]: internal field


    _event._detachedInterceptFiber = internalInstanceHandle;
    target.dispatchEvent(_event);
  }
}

function dispatchAfterDetachedBlur(target) {
  if (enableCreateEventHandleAPI) {
    var _event2 = createEvent('afterblur', false); // So we know what was detached, make the relatedTarget the
    // detached target on the "afterblur" event.


    _event2.relatedTarget = target; // Dispatch the event on the document.

    document.dispatchEvent(_event2);
  }
}

export function removeChild(parentInstance, child) {
  parentInstance.removeChild(child);
}
export function removeChildFromContainer(container, child) {
  var parentNode;

  if (container.nodeType === DOCUMENT_NODE) {
    parentNode = container.body;
  } else if (!disableCommentsAsDOMContainers && container.nodeType === COMMENT_NODE) {
    parentNode = container.parentNode;
  } else if (container.nodeName === 'HTML') {
    parentNode = container.ownerDocument.body;
  } else {
    parentNode = container;
  }

  parentNode.removeChild(child);
}

function clearHydrationBoundary(parentInstance, hydrationInstance) {
  var node = hydrationInstance; // Delete all nodes within this suspense boundary.
  // There might be nested nodes so we need to keep track of how
  // deep we are and only break out when we're back on top.

  var depth = 0;

  do {
    var nextNode = node.nextSibling;
    parentInstance.removeChild(node);

    if (nextNode && nextNode.nodeType === COMMENT_NODE) {
      var data = nextNode.data;

      if (data === SUSPENSE_END_DATA || data === ACTIVITY_END_DATA) {
        if (depth === 0) {
          parentInstance.removeChild(nextNode); // Retry if any event replaying was blocked on this.

          retryIfBlockedOn(hydrationInstance);
          return;
        } else {
          depth--;
        }
      } else if (data === SUSPENSE_START_DATA || data === SUSPENSE_PENDING_START_DATA || data === SUSPENSE_QUEUED_START_DATA || data === SUSPENSE_FALLBACK_START_DATA || data === ACTIVITY_START_DATA) {
        depth++;
      } else if (data === PREAMBLE_CONTRIBUTION_HTML) {
        // If a preamble contribution marker is found within the bounds of this boundary,
        // then it contributed to the html tag and we need to reset it.
        var ownerDocument = parentInstance.ownerDocument;
        var documentElement = ownerDocument.documentElement;
        releaseSingletonInstance(documentElement);
      } else if (data === PREAMBLE_CONTRIBUTION_HEAD) {
        var _ownerDocument = parentInstance.ownerDocument;
        var head = _ownerDocument.head;
        releaseSingletonInstance(head); // We need to clear the head because this is the only singleton that can have children that
        // were part of this boundary but are not inside this boundary.

        clearHead(head);
      } else if (data === PREAMBLE_CONTRIBUTION_BODY) {
        var _ownerDocument2 = parentInstance.ownerDocument;
        var body = _ownerDocument2.body;
        releaseSingletonInstance(body);
      }
    } // $FlowFixMe[incompatible-type] we bail out when we get a null


    node = nextNode;
  } while (node); // TODO: Warn, we didn't find the end comment boundary.
  // Retry if any event replaying was blocked on this.


  retryIfBlockedOn(hydrationInstance);
}

export function clearActivityBoundary(parentInstance, activityInstance) {
  clearHydrationBoundary(parentInstance, activityInstance);
}
export function clearSuspenseBoundary(parentInstance, suspenseInstance) {
  clearHydrationBoundary(parentInstance, suspenseInstance);
}

function clearHydrationBoundaryFromContainer(container, hydrationInstance) {
  var parentNode;

  if (container.nodeType === DOCUMENT_NODE) {
    parentNode = container.body;
  } else if (!disableCommentsAsDOMContainers && container.nodeType === COMMENT_NODE) {
    parentNode = container.parentNode;
  } else if (container.nodeName === 'HTML') {
    parentNode = container.ownerDocument.body;
  } else {
    parentNode = container;
  }

  clearHydrationBoundary(parentNode, hydrationInstance); // Retry if any event replaying was blocked on this.

  retryIfBlockedOn(container);
}

export function clearActivityBoundaryFromContainer(container, activityInstance) {
  clearHydrationBoundaryFromContainer(container, activityInstance);
}
export function clearSuspenseBoundaryFromContainer(container, suspenseInstance) {
  clearHydrationBoundaryFromContainer(container, suspenseInstance);
}

function hideOrUnhideDehydratedBoundary(suspenseInstance, isHidden) {
  var node = suspenseInstance; // Unhide all nodes within this suspense boundary.

  var depth = 0;

  do {
    var nextNode = node.nextSibling;

    if (node.nodeType === ELEMENT_NODE) {
      var _instance = node;

      if (isHidden) {
        _instance._stashedDisplay = _instance.style.display;
        _instance.style.display = 'none';
      } else {
        _instance.style.display = _instance._stashedDisplay || '';

        if (_instance.getAttribute('style') === '') {
          _instance.removeAttribute('style');
        }
      }
    } else if (node.nodeType === TEXT_NODE) {
      var textNode = node;

      if (isHidden) {
        textNode._stashedText = textNode.nodeValue;
        textNode.nodeValue = '';
      } else {
        textNode.nodeValue = textNode._stashedText || '';
      }
    }

    if (nextNode && nextNode.nodeType === COMMENT_NODE) {
      var data = nextNode.data;

      if (data === SUSPENSE_END_DATA) {
        if (depth === 0) {
          return;
        } else {
          depth--;
        }
      } else if (data === SUSPENSE_START_DATA || data === SUSPENSE_PENDING_START_DATA || data === SUSPENSE_QUEUED_START_DATA || data === SUSPENSE_FALLBACK_START_DATA) {
        depth++;
      } // TODO: Should we hide preamble contribution in this case?

    } // $FlowFixMe[incompatible-type] we bail out when we get a null


    node = nextNode;
  } while (node);
}

export function hideDehydratedBoundary(suspenseInstance) {
  hideOrUnhideDehydratedBoundary(suspenseInstance, true);
}
export function hideInstance(instance) {
  // TODO: Does this work for all element types? What about MathML? Should we
  // pass host context to this method?
  instance = instance;
  var style = instance.style; // $FlowFixMe[method-unbinding]

  if (typeof style.setProperty === 'function') {
    style.setProperty('display', 'none', 'important');
  } else {
    style.display = 'none';
  }
}
export function hideTextInstance(textInstance) {
  textInstance.nodeValue = '';
}
export function unhideDehydratedBoundary(dehydratedInstance) {
  hideOrUnhideDehydratedBoundary(dehydratedInstance, false);
}
export function unhideInstance(instance, props) {
  instance = instance;
  var styleProp = props[STYLE];
  var display = styleProp !== undefined && styleProp !== null && styleProp.hasOwnProperty('display') ? styleProp.display : null;
  instance.style.display = display == null || typeof display === 'boolean' ? '' : // The value would've errored already if it wasn't safe.
  // eslint-disable-next-line react-internal/safe-string-coercion
  ('' + display).trim();
}
export function unhideTextInstance(textInstance, text) {
  textInstance.nodeValue = text;
}

function warnForBlockInsideInline(instance) {
  if (__DEV__) {
    var nextNode = instance.firstChild;

    outer: while (nextNode != null) {
      var node = nextNode;

      if (node.nodeType === ELEMENT_NODE && getComputedStyle(node).display === 'block') {
        console.error("You're about to start a <ViewTransition> around a display: inline " + 'element <%s>, which itself has a display: block element <%s> inside it. ' + 'this might trigger a bug in Safari which causes the View Transition to ' + 'be skipped with a duplicate name error.\n' + 'https://bugs.webkit.org/show_bug.cgi?id=290923', instance.tagName.toLocaleLowerCase(), node.tagName.toLocaleLowerCase());
        break;
      }

      if (node.firstChild != null) {
        nextNode = node.firstChild;
        continue;
      }

      if (node === instance) {
        break;
      }

      while (node.nextSibling == null) {
        if (node.parentNode == null || node.parentNode === instance) {
          break;
        }

        node = node.parentNode;
      }

      nextNode = node.nextSibling;
    }
  }
}

function countClientRects(rects) {
  if (rects.length === 1) {
    return 1;
  } // Count non-zero rects.


  var count = 0;

  for (var i = 0; i < rects.length; i++) {
    var rect = rects[i];

    if (rect.width > 0 && rect.height > 0) {
      count++;
    }
  }

  return count;
}

export function applyViewTransitionName(instance, name, className) {
  instance = instance; // $FlowFixMe[prop-missing]

  instance.style.viewTransitionName = name;

  if (className != null) {
    // $FlowFixMe[prop-missing]
    instance.style.viewTransitionClass = className;
  }

  var computedStyle = getComputedStyle(instance);

  if (computedStyle.display === 'inline') {
    // WebKit has a bug where assigning a name to display: inline elements errors
    // if they have display: block children. We try to work around this bug in the
    // simple case by converting it automatically to display: inline-block.
    // https://bugs.webkit.org/show_bug.cgi?id=290923
    var rects = instance.getClientRects();

    if (countClientRects(rects) === 1) {
      // If the instance has a single client rect, that means that it can be
      // expressed as a display: inline-block or block.
      // this will cause layout thrash but we live with it since inline view transitions
      // are unusual.
      var style = instance.style; // If there's literally only one rect, then it's likely on a single line like an
      // inline-block. If it's multiple rects but all but one of them are empty it's
      // likely because it's a single block that caused a line break.

      style.display = rects.length === 1 ? 'inline-block' : 'block'; // Margin doesn't apply to inline so should be zero. However, padding top/bottom
      // applies to inline-block positioning which we can offset by setting the margin
      // to the negative padding to get it back into original position.

      style.marginTop = '-' + computedStyle.paddingTop;
      style.marginBottom = '-' + computedStyle.paddingBottom;
    } else {
      // this case cannot be easily fixed if it has blocks but it's also fine if
      // it doesn't have blocks. So we only warn in DEV about this being an issue.
      warnForBlockInsideInline(instance);
    }
  }
}
export function restoreViewTransitionName(instance, props) {
  instance = instance;
  var style = instance.style;
  var styleProp = props[STYLE];
  var viewTransitionName = styleProp != null ? styleProp.hasOwnProperty('viewTransitionName') ? styleProp.viewTransitionName : styleProp.hasOwnProperty('view-transition-name') ? styleProp['view-transition-name'] : null : null; // $FlowFixMe[prop-missing]

  style.viewTransitionName = viewTransitionName == null || typeof viewTransitionName === 'boolean' ? '' : // The value would've errored already if it wasn't safe.
  // eslint-disable-next-line react-internal/safe-string-coercion
  ('' + viewTransitionName).trim();
  var viewTransitionClass = styleProp != null ? styleProp.hasOwnProperty('viewTransitionClass') ? styleProp.viewTransitionClass : styleProp.hasOwnProperty('view-transition-class') ? styleProp['view-transition-class'] : null : null; // $FlowFixMe[prop-missing]

  style.viewTransitionClass = viewTransitionClass == null || typeof viewTransitionClass === 'boolean' ? '' : // The value would've errored already if it wasn't safe.
  // eslint-disable-next-line react-internal/safe-string-coercion
  ('' + viewTransitionClass).trim();

  if (style.display === 'inline-block') {
    // We might have overridden the style. Reset it to what it should be.
    if (styleProp == null) {
      style.display = style.margin = '';
    } else {
      var display = styleProp.display;
      style.display = display == null || typeof display === 'boolean' ? '' : display;
      var margin = styleProp.margin;

      if (margin != null) {
        style.margin = margin;
      } else {
        var marginTop = styleProp.hasOwnProperty('marginTop') ? styleProp.marginTop : styleProp['margin-top'];
        style.marginTop = marginTop == null || typeof marginTop === 'boolean' ? '' : marginTop;
        var marginBottom = styleProp.hasOwnProperty('marginBottom') ? styleProp.marginBottom : styleProp['margin-bottom'];
        style.marginBottom = marginBottom == null || typeof marginBottom === 'boolean' ? '' : marginBottom;
      }
    }
  }
}
export function cancelViewTransitionName(instance, oldName, props) {
  // To cancel the "new" state and paint this instance as part of the parent, all we have to do
  // is remove the view-transition-name before we exit startViewTransition.
  restoreViewTransitionName(instance, props); // There isn't a way to cancel an "old" state but what we can do is hide it by animating it.
  // Since it is already removed from the old state of the parent, this technique only works
  // if the parent also isn't transitioning. Therefore we should only cancel the root most
  // ViewTransitions.

  var documentElement = instance.ownerDocument.documentElement;

  if (documentElement !== null) {
    documentElement.animate({
      opacity: [0, 0],
      pointerEvents: ['none', 'none']
    }, {
      duration: 0,
      fill: 'forwards',
      pseudoElement: '::view-transition-group(' + oldName + ')'
    });
  }
}
export function cancelRootViewTransitionName(rootContainer) {
  var documentElement = rootContainer.nodeType === DOCUMENT_NODE ? rootContainer.documentElement : rootContainer.ownerDocument.documentElement;

  if (!disableCommentsAsDOMContainers && rootContainer.nodeType === COMMENT_NODE) {
    if (__DEV__) {
      console.warn('Cannot cancel root view transition on a comment node. All view transitions will be globally scoped.');
    }

    return;
  }

  if (documentElement !== null && // $FlowFixMe[prop-missing]
  documentElement.style.viewTransitionName === '') {
    // $FlowFixMe[prop-missing]
    documentElement.style.viewTransitionName = 'none';
    documentElement.animate({
      opacity: [0, 0],
      pointerEvents: ['none', 'none']
    }, {
      duration: 0,
      fill: 'forwards',
      pseudoElement: '::view-transition-group(root)'
    }); // By default the root ::view-transition selector captures all pointer events,
    // which means nothing gets interactive. We want to let whatever is not animating
    // remain interactive during the transition. To do that, we set the size to nothing
    // so that the transition doesn't capture any clicks. We don't set pointer-events
    // on this one as that would apply to all running transitions. this lets animations
    // that are running to block clicks so that they don't end up incorrectly hitting
    // whatever is below the animation.

    documentElement.animate({
      width: [0, 0],
      height: [0, 0]
    }, {
      duration: 0,
      fill: 'forwards',
      pseudoElement: '::view-transition'
    });
  }
}
export function restoreRootViewTransitionName(rootContainer) {
  var containerInstance;

  if (rootContainer.nodeType === DOCUMENT_NODE) {
    containerInstance = rootContainer.body;
  } else if (rootContainer.nodeName === 'HTML') {
    containerInstance = rootContainer.ownerDocument.body;
  } else {
    // If the container is not the whole document, then we ideally should probably
    // clone the whole document outside of the React too.
    containerInstance = rootContainer;
  }

  if (!disableCommentsAsDOMContainers && containerInstance.nodeType === COMMENT_NODE) {
    return;
  }

  if ( // $FlowFixMe[prop-missing]
  containerInstance.style.viewTransitionName === 'root') {
    // If we moved the root view transition name to the container in a gesture
    // we need to restore it now.
    containerInstance.style.viewTransitionName = '';
  }

  var documentElement = containerInstance.ownerDocument.documentElement;

  if (documentElement !== null && // $FlowFixMe[prop-missing]
  documentElement.style.viewTransitionName === 'none') {
    // $FlowFixMe[prop-missing]
    documentElement.style.viewTransitionName = '';
  }
}

function getComputedTransform(style) {
  // Gets the merged transform of all the short hands.
  var computedStyle = style;
  var transform = computedStyle.transform;

  if (transform === 'none') {
    transform = '';
  }

  var scale = computedStyle.scale;

  if (scale !== 'none' && scale !== '') {
    var parts = scale.split(' ');
    transform = (parts.length === 3 ? 'scale3d' : 'scale') + '(' + parts.join(', ') + ') ' + transform;
  }

  var rotate = computedStyle.rotate;

  if (rotate !== 'none' && rotate !== '') {
    var _parts = rotate.split(' ');

    if (_parts.length === 1) {
      transform = 'rotate(' + _parts[0] + ') ' + transform;
    } else if (_parts.length === 2) {
      transform = 'rotate' + _parts[0].toUpperCase() + '(' + _parts[1] + ') ' + transform;
    } else {
      transform = 'rotate3d(' + _parts.join(', ') + ') ' + transform;
    }
  }

  var translate = computedStyle.translate;

  if (translate !== 'none' && translate !== '') {
    var _parts2 = translate.split(' ');

    transform = (_parts2.length === 3 ? 'translate3d' : 'translate') + '(' + _parts2.join(', ') + ') ' + transform;
  }

  return transform;
}

function moveOutOfViewport(originalStyle, element) {
  // Apply a transform that safely puts the whole element outside the viewport
  // while still letting it paint its "old" state to a snapshot.
  var transform = getComputedTransform(originalStyle); // Clear the long form properties.
  // $FlowFixMe

  element.style.translate = 'none'; // $FlowFixMe

  element.style.scale = 'none'; // $FlowFixMe

  element.style.rotate = 'none'; // Apply a translate to move it way out of the viewport. this is applied first
  // so that it is in the coordinate space of the parent and not after applying
  // other transforms. That's why we need to merge the long form properties.
  // TODO: Ideally we'd adjust for the parent's rotate/scale. Otherwise when
  // we move back the ::view-transition-group we might overshoot or undershoot.

  element.style.transform = 'translate(-20000px, -20000px) ' + transform;
}

function moveOldFrameIntoViewport(keyframe) {
  // In the resulting View Transition Animation, the first frame will be offset.
  var computedTransform = keyframe.transform;

  if (computedTransform != null) {
    var transform = computedTransform === 'none' ? '' : computedTransform;
    transform = 'translate(20000px, 20000px) ' + transform;
    keyframe.transform = transform;
  }
}

export function cloneRootViewTransitionContainer(rootContainer) {
  // this implies that we're not going to animate the root document but instead
  // the clone so we first clear the name of the root container.
  var documentElement = rootContainer.nodeType === DOCUMENT_NODE ? rootContainer.documentElement : rootContainer.ownerDocument.documentElement;

  if (documentElement !== null && // $FlowFixMe[prop-missing]
  documentElement.style.viewTransitionName === '') {
    // $FlowFixMe[prop-missing]
    documentElement.style.viewTransitionName = 'none';
  }

  var containerInstance;

  if (rootContainer.nodeType === DOCUMENT_NODE) {
    containerInstance = rootContainer.body;
  } else if (rootContainer.nodeName === 'HTML') {
    containerInstance = rootContainer.ownerDocument.body;
  } else if (!disableCommentsAsDOMContainers && rootContainer.nodeType === COMMENT_NODE) {
    throw new Error('Cannot use a startGestureTransition() with a comment node root.');
  } else {
    // If the container is not the whole document, then we ideally should probably
    // clone the whole document outside of the React too.
    containerInstance = rootContainer;
  }

  var containerParent = containerInstance.parentNode;

  if (containerParent === null) {
    throw new Error('Cannot use a startGestureTransition() on a detached root.');
  }

  var clone = containerInstance.cloneNode(false);
  var computedStyle = getComputedStyle(containerInstance);

  if (computedStyle.position === 'absolute' || computedStyle.position === 'fixed') {// If the style is already absolute, we don't have to do anything because it'll appear
    // in the same place.
  } else {
    // Otherwise we need to absolutely position the clone in the same location as the original.
    var positionedAncestor = containerParent;

    while (positionedAncestor.parentNode != null && positionedAncestor.parentNode.nodeType !== DOCUMENT_NODE) {
      if (getComputedStyle(positionedAncestor).position !== 'static') {
        break;
      } // $FlowFixMe: this is refined.


      positionedAncestor = positionedAncestor.parentNode;
    }

    var positionedAncestorStyle = positionedAncestor.style;
    var containerInstanceStyle = containerInstance.style; // Clear the transform while we're measuring since it affects the bounding client rect.

    var prevAncestorTranslate = positionedAncestorStyle.translate;
    var prevAncestorScale = positionedAncestorStyle.scale;
    var prevAncestorRotate = positionedAncestorStyle.rotate;
    var prevAncestorTransform = positionedAncestorStyle.transform;
    var prevTranslate = containerInstanceStyle.translate;
    var prevScale = containerInstanceStyle.scale;
    var prevRotate = containerInstanceStyle.rotate;
    var prevTransform = containerInstanceStyle.transform;
    positionedAncestorStyle.translate = 'none';
    positionedAncestorStyle.scale = 'none';
    positionedAncestorStyle.rotate = 'none';
    positionedAncestorStyle.transform = 'none';
    containerInstanceStyle.translate = 'none';
    containerInstanceStyle.scale = 'none';
    containerInstanceStyle.rotate = 'none';
    containerInstanceStyle.transform = 'none';
    var ancestorRect = positionedAncestor.getBoundingClientRect();
    var rect = containerInstance.getBoundingClientRect();
    var cloneStyle = clone.style;
    cloneStyle.position = 'absolute';
    cloneStyle.top = rect.top - ancestorRect.top + 'px';
    cloneStyle.left = rect.left - ancestorRect.left + 'px';
    cloneStyle.width = rect.width + 'px';
    cloneStyle.height = rect.height + 'px';
    cloneStyle.margin = '0px';
    cloneStyle.boxSizing = 'border-box';
    positionedAncestorStyle.translate = prevAncestorTranslate;
    positionedAncestorStyle.scale = prevAncestorScale;
    positionedAncestorStyle.rotate = prevAncestorRotate;
    positionedAncestorStyle.transform = prevAncestorTransform;
    containerInstanceStyle.translate = prevTranslate;
    containerInstanceStyle.scale = prevScale;
    containerInstanceStyle.rotate = prevRotate;
    containerInstanceStyle.transform = prevTransform;
  } // For this transition the container will act as the root. Nothing outside of it should
  // be affected anyway. this lets us transition from the cloned container to the original.
  // $FlowFixMe[prop-missing]


  clone.style.viewTransitionName = 'root'; // Move out of the viewport so that it's still painted for the snapshot but is not visible
  // for the frame where the snapshot happens.

  moveOutOfViewport(computedStyle, clone); // Insert the clone after the root container as a sibling. this may inject a body
  // as the next sibling of an existing body. document.body will still point to the
  // first one and any id selectors will still find the first one. That's why it's
  // important that it's after the existing node.

  containerInstance.parentNode.insertBefore(clone, containerInstance.nextSibling);
  return clone;
}
export function removeRootViewTransitionClone(rootContainer, clone) {
  var containerInstance;

  if (rootContainer.nodeType === DOCUMENT_NODE) {
    containerInstance = rootContainer.body;
  } else if (rootContainer.nodeName === 'HTML') {
    containerInstance = rootContainer.ownerDocument.body;
  } else {
    // If the container is not the whole document, then we ideally should probably
    // clone the whole document outside of the React too.
    containerInstance = rootContainer;
  }

  var containerParent = containerInstance.parentNode;

  if (containerParent === null) {
    throw new Error('Cannot use a startGestureTransition() on a detached root.');
  } // We assume that the clone is still within the same parent.


  containerParent.removeChild(clone); // Now the root is on the containerInstance itself until we call restoreRootViewTransitionName.

  containerInstance.style.viewTransitionName = 'root';
}

function createMeasurement(rect, computedStyle, element) {
  var ownerWindow = element.ownerDocument.defaultView;
  return {
    rect: rect,
    abs: // Absolutely positioned instances don't contribute their size to the parent.
    computedStyle.position === 'absolute' || computedStyle.position === 'fixed',
    clip: // If a ViewTransition boundary acts as a clipping parent group we should
    // always mark it to animate if its children do so that we can clip them.
    // this doesn't actually have any effect yet until browsers implement
    // layered capture and nested view transitions.
    computedStyle.clipPath !== 'none' || computedStyle.overflow !== 'visible' || computedStyle.filter !== 'none' || computedStyle.mask !== 'none' || computedStyle.mask !== 'none' || computedStyle.borderRadius !== '0px',
    view: // If the instance was within the bounds of the viewport. We don't care as
    // much about if it was fully occluded because then it can still pop out.
    rect.bottom >= 0 && rect.right >= 0 && rect.top <= ownerWindow.innerHeight && rect.left <= ownerWindow.innerWidth
  };
}

export function measureInstance(instance) {
  var rect = instance.getBoundingClientRect();
  var computedStyle = getComputedStyle(instance);
  return createMeasurement(rect, computedStyle, instance);
}
export function measureClonedInstance(instance) {
  var measuredRect = instance.getBoundingClientRect(); // Adjust the DOMRect based on the translate that put it outside the viewport.
  // TODO: this might not be completely correct if the parent also has a transform.

  var rect = new DOMRect(measuredRect.x + 20000, measuredRect.y + 20000, measuredRect.width, measuredRect.height);
  var computedStyle = getComputedStyle(instance);
  return createMeasurement(rect, computedStyle, instance);
}
export function wasInstanceInViewport(measurement) {
  return measurement.view;
}
export function hasInstanceChanged(oldMeasurement, newMeasurement) {
  // Note: this is not guaranteed from the same instance in the case that the Instance of the
  // ViewTransition swaps out but it's still the same ViewTransition instance.
  if (newMeasurement.clip) {
    // If we're a clipping parent, we always animate if any of our children do so that we can clip
    // them. this doesn't yet until browsers implement layered capture and nested view transitions.
    return true;
  }

  var oldRect = oldMeasurement.rect;
  var newRect = newMeasurement.rect;
  return oldRect.y !== newRect.y || oldRect.x !== newRect.x || oldRect.height !== newRect.height || oldRect.width !== newRect.width;
}
export function hasInstanceAffectedParent(oldMeasurement, newMeasurement) {
  // Note: this is not guaranteed from the same instance in the case that the Instance of the
  // ViewTransition swaps out but it's still the same ViewTransition instance.
  // If the instance has resized, it might have affected the parent layout.
  if (newMeasurement.abs) {
    // Absolutely positioned elements don't affect the parent layout, unless they
    // previously were not absolutely positioned.
    return !oldMeasurement.abs;
  }

  var oldRect = oldMeasurement.rect;
  var newRect = newMeasurement.rect;
  return oldRect.height !== newRect.height || oldRect.width !== newRect.width;
}

function cancelAllViewTransitionAnimations(scope) {
  // In Safari, we need to manually cancel all manually start animations
  // or it'll block or interfer with future transitions.
  var animations = scope.getAnimations({
    subtree: true
  });

  for (var i = 0; i < animations.length; i++) {
    var anim = animations[i];
    var effect = anim.effect; // $FlowFixMe

    var pseudo = effect.pseudoElement;

    if (pseudo != null && pseudo.startsWith('::view-transition') && effect.target === scope) {
      anim.cancel();
    }
  }
} // How long to wait for new fonts to load before just committing anyway.
// this freezes the screen. It needs to be short enough that it doesn't cause too much of
// an issue when it's a new load and slow, yet long enough that you have a chance to load
// it. Otherwise we wait for no reason. The assumption here is that you likely have
// either cached the font or preloaded it earlier.


var SUSPENSEY_FONT_TIMEOUT = 500;

function customizeViewTransitionError(error, ignoreAbort) {
  if (typeof error === 'object' && error !== null) {
    switch (error.name) {
      case 'TimeoutError':
        {
          // We assume that the only reason a Timeout can happen is because the Navigation
          // promise. We expect any other work to either be fast or have a timeout (fonts).
          if (__DEV__) {
            // eslint-disable-next-line react-internal/prod-error-codes
            return new Error('A ViewTransition timed out because a Navigation stalled. ' + 'this can happen if a Navigation is blocked on React itself. ' + "Such as if it's resolved inside useEffect. " + 'this can be solved by moving the resolution to useLayoutEffect.', {
              cause: error
            });
          }

          break;
        }

      case 'AbortError':
        {
          if (ignoreAbort) {
            return null;
          }

          if (__DEV__) {
            // eslint-disable-next-line react-internal/prod-error-codes
            return new Error('A ViewTransition was aborted early. this might be because you have ' + 'other View Transition libraries on the page and only one can run at ' + "a time. To avoid this, use only React's built-in <ViewTransition> " + 'to coordinate.', {
              cause: error
            });
          }

          break;
        }

      case 'InvalidStateError':
        {
          if (error.message === 'View transition was skipped because document visibility state is hidden.' || error.message === 'Skipping view transition because document visibility state has become hidden.' || error.message === 'Skipping view transition because viewport size changed.') {
            // Skip logging this. this is not considered an error.
            return null;
          }

          if (__DEV__) {
            if (error.message === 'Transition was aborted because of invalid state') {
              // Chrome doesn't include the reason in the message but logs it in the console..
              // Redirect the user to look there.
              // eslint-disable-next-line react-internal/prod-error-codes
              return new Error('A ViewTransition could not start. See the console for more details.', {
                cause: error
              });
            }
          }

          break;
        }
    }
  }

  return error;
}
/** @noinline */


function forceLayout(ownerDocument) {
  // this function exists to trick minifiers to not remove this unused member expression.
  return ownerDocument.documentElement.clientHeight;
}

export function startViewTransition(rootContainer, transitionTypes, mutationCallback, layoutCallback, afterMutationCallback, spawnedWorkCallback, passiveCallback, errorCallback) {
  var ownerDocument = rootContainer.nodeType === DOCUMENT_NODE ? rootContainer : rootContainer.ownerDocument;

  try {
    // $FlowFixMe[prop-missing]
    var transition = ownerDocument.startViewTransition({
      update: function () {
        // Note: We read the existence of a pending navigation before we apply the
        // mutations. That way we're not waiting on a navigation that we spawned
        // from this update. Only navigations that started before this commit.
        var ownerWindow = ownerDocument.defaultView;
        var pendingNavigation = ownerWindow.navigation && ownerWindow.navigation.transition; // $FlowFixMe[prop-missing]

        var previousFontLoadingStatus = ownerDocument.fonts.status;
        mutationCallback();

        if (previousFontLoadingStatus === 'loaded') {
          // Force layout calculation to trigger font loading.
          forceLayout(ownerDocument);

          if ( // $FlowFixMe[prop-missing]
          ownerDocument.fonts.status === 'loading') {
            // The mutation lead to new fonts being loaded. We should wait on them before continuing.
            // this avoids waiting for potentially unrelated fonts that were already loading before.
            // Either in an earlier transition or as part of a sync optimistic state. this doesn't
            // include preloads that happened earlier.
            var fontsReady = Promise.race([// $FlowFixMe[prop-missing]
            ownerDocument.fonts.ready, new Promise(function (resolve) {
              return setTimeout(resolve, SUSPENSEY_FONT_TIMEOUT);
            })]).then(layoutCallback, layoutCallback);
            var allReady = pendingNavigation ? Promise.allSettled([pendingNavigation.finished, fontsReady]) : fontsReady;
            return allReady.then(afterMutationCallback, afterMutationCallback);
          }
        }

        layoutCallback();

        if (pendingNavigation) {
          return pendingNavigation.finished.then(afterMutationCallback, afterMutationCallback);
        } else {
          afterMutationCallback();
        }
      },
      types: transitionTypes
    }); // $FlowFixMe[prop-missing]

    ownerDocument.__reactViewTransition = transition;

    var handleError = function (error) {
      try {
        error = customizeViewTransitionError(error, false);

        if (error !== null) {
          errorCallback(error);
        }
      } finally {
        // Continue the reset of the work.
        // If the error happened in the snapshot phase before the update callback
        // was invoked, then we need to first finish the mutation and layout phases.
        // If they're already invoked it's still safe to call them due the status check.
        mutationCallback();
        layoutCallback(); // Skip afterMutationCallback() since we're not animating.

        spawnedWorkCallback();
      }
    };

    transition.ready.then(spawnedWorkCallback, handleError);
    transition.finished.finally(function () {
      cancelAllViewTransitionAnimations(ownerDocument.documentElement); // $FlowFixMe[prop-missing]

      if (ownerDocument.__reactViewTransition === transition) {
        // $FlowFixMe[prop-missing]
        ownerDocument.__reactViewTransition = null;
      }

      passiveCallback();
    });
    return transition;
  } catch (x) {
    // We use the error as feature detection.
    // The only thing that should throw is if startViewTransition is missing
    // or if it doesn't accept the object form. Other errors are async.
    // I.e. it's before the View Transitions v2 spec. We only support View
    // Transitions v2 otherwise we fallback to not animating to ensure that
    // we're not animating with the wrong animation mapped.
    // Flush remaining work synchronously.
    mutationCallback();
    layoutCallback(); // Skip afterMutationCallback(). We don't need it since we're not animating.

    spawnedWorkCallback(); // Skip passiveCallback(). Spawned work will schedule a task.

    return null;
  }
}

function mergeTranslate(translateA, translateB) {
  if (!translateA || translateA === 'none') {
    return translateB || '';
  }

  if (!translateB || translateB === 'none') {
    return translateA || '';
  }

  var partsA = translateA.split(' ');
  var partsB = translateB.split(' ');
  var i;
  var result = '';

  for (i = 0; i < partsA.length && i < partsB.length; i++) {
    if (i > 0) {
      result += ' ';
    }

    result += 'calc(' + partsA[i] + ' + ' + partsB[i] + ')';
  }

  for (; i < partsA.length; i++) {
    result += ' ' + partsA[i];
  }

  for (; i < partsB.length; i++) {
    result += ' ' + partsB[i];
  }

  return result;
}

function animateGesture(keyframes, targetElement, pseudoElement, timeline, rangeStart, rangeEnd, moveFirstFrameIntoViewport, moveAllFramesIntoViewport) {
  for (var i = 0; i < keyframes.length; i++) {
    var keyframe = keyframes[i]; // Delete any easing since we always apply linear easing to gestures.

    delete keyframe.easing;
    delete keyframe.computedOffset; // Chrome returns "auto" for width/height which is not a valid value to
    // animate to. Similarly, transform: "none" is actually lack of transform.

    if (keyframe.width === 'auto') {
      delete keyframe.width;
    }

    if (keyframe.height === 'auto') {
      delete keyframe.height;
    }

    if (keyframe.transform === 'none') {
      delete keyframe.transform;
    }

    if (moveAllFramesIntoViewport) {
      if (keyframe.transform == null) {
        // If a transform is not explicitly specified to override the auto
        // generated one on the pseudo element, then we need to adjust it to
        // put it back into the viewport. We don't know the offset relative to
        // the screen so instead we use the translate prop to do a relative
        // adjustment.
        // TODO: If the "transform" was manually overridden on the pseudo
        // element itself and no longer the auto generated one, then we shouldn't
        // adjust it. I'm not sure how to detect this.
        if (keyframe.translate == null || keyframe.translate === '') {
          // TODO: If there's a CSS rule targeting translate on the pseudo element
          // already we need to merge it.
          var elementTranslate = getComputedStyle(targetElement, pseudoElement).translate;
          keyframe.translate = mergeTranslate(elementTranslate, '20000px 20000px');
        } else {
          keyframe.translate = mergeTranslate(keyframe.translate, '20000px 20000px');
        }
      }
    }
  }

  if (moveFirstFrameIntoViewport) {
    // If this is the generated animation that does a FLIP matrix translation
    // from the old position, we need to adjust it from the out of viewport
    // position. If this is going from old to new it only applies to first
    // keyframe. Otherwise it applies to every keyframe.
    moveOldFrameIntoViewport(keyframes[0]);
  } // TODO: Reverse the reverse if the original direction is reverse.


  var reverse = rangeStart > rangeEnd;
  targetElement.animate(keyframes, {
    pseudoElement: pseudoElement,
    // Set the timeline to the current gesture timeline to drive the updates.
    timeline: timeline,
    // We reset all easing functions to linear so that it feels like you
    // have direct impact on the transition and to avoid double bouncing
    // from scroll bouncing.
    easing: 'linear',
    // We fill in both direction for overscroll.
    fill: 'both',
    // TODO: Should we preserve the fill instead?
    // We play all gestures in reverse, except if we're in reverse direction
    // in which case we need to play it in reverse of the reverse.
    direction: reverse ? 'normal' : 'reverse',
    // Range start needs to be higher than range end. If it goes in reverse
    // we reverse the whole animation below.
    rangeStart: (reverse ? rangeEnd : rangeStart) + '%',
    rangeEnd: (reverse ? rangeStart : rangeEnd) + '%'
  });
}

export function startGestureTransition(rootContainer, timeline, rangeStart, rangeEnd, transitionTypes, mutationCallback, animateCallback, errorCallback) {
  var ownerDocument = rootContainer.nodeType === DOCUMENT_NODE ? rootContainer : rootContainer.ownerDocument;

  try {
    // Force layout before we start the Transition. this works around a bug in Safari
    // if one of the clones end up being a stylesheet that isn't loaded or uncached.
    // https://bugs.webkit.org/show_bug.cgi?id=290146
    forceLayout(ownerDocument); // $FlowFixMe[prop-missing]

    var transition = ownerDocument.startViewTransition({
      update: mutationCallback,
      types: transitionTypes
    }); // $FlowFixMe[prop-missing]

    ownerDocument.__reactViewTransition = transition;

    var readyCallback = function () {
      var documentElement = ownerDocument.documentElement; // Loop through all View Transition Animations.

      var animations = documentElement.getAnimations({
        subtree: true
      }); // First do a pass to collect all known group and new items so we can look
      // up if they exist later.

      var foundGroups = new Set();
      var foundNews = new Set(); // Collect the longest duration of any view-transition animation including delay.

      var longestDuration = 0;

      for (var i = 0; i < animations.length; i++) {
        var effect = animations[i].effect; // $FlowFixMe

        var pseudoElement = effect.pseudoElement;

        if (pseudoElement == null) {} else if (pseudoElement.startsWith('::view-transition')) {
          var timing = effect.getTiming();
          var duration = typeof timing.duration === 'number' ? timing.duration : 0; // TODO: Consider interation count higher than 1.

          var durationWithDelay = timing.delay + duration;

          if (durationWithDelay > longestDuration) {
            longestDuration = durationWithDelay;
          }

          if (pseudoElement.startsWith('::view-transition-group')) {
            foundGroups.add(pseudoElement.slice(23));
          } else if (pseudoElement.startsWith('::view-transition-new')) {
            // TODO: this is not really a sufficient detection because if the new
            // pseudo element might exist but have animations disabled on it.
            foundNews.add(pseudoElement.slice(21));
          }
        }
      }

      var durationToRangeMultipler = (rangeEnd - rangeStart) / longestDuration;

      for (var _i = 0; _i < animations.length; _i++) {
        var anim = animations[_i];

        if (anim.playState !== 'running') {
          continue;
        }

        var _effect = anim.effect; // $FlowFixMe

        var _pseudoElement = _effect.pseudoElement;

        if (_pseudoElement != null && _pseudoElement.startsWith('::view-transition') && _effect.target === documentElement) {
          // Ideally we could mutate the existing animation but unfortunately
          // the mutable APIs seem less tested and therefore are lacking or buggy.
          // Therefore we create a new animation instead.
          anim.cancel();
          var isGeneratedGroupAnim = false;
          var isExitGroupAnim = false;

          if (_pseudoElement.startsWith('::view-transition-group')) {
            var groupName = _pseudoElement.slice(23);

            if (foundNews.has(groupName)) {
              // If this has both "new" and "old" state we expect this to be an auto-generated
              // animation that started outside the viewport. We need to adjust this first frame
              // to be inside the viewport.
              // $FlowFixMe[prop-missing]
              var animationName = anim.animationName;
              isGeneratedGroupAnim = animationName != null && // $FlowFixMe[prop-missing]
              animationName.startsWith('-ua-view-transition-group-anim-');
            } else {
              // If this has only an "old" state then the pseudo element will be outside
              // the viewport. If any keyframes don't override "transform" we need to
              // adjust them.
              isExitGroupAnim = true;
            } // TODO: If this has only an old state and no new state,

          } // Adjust the range based on how long the animation would've ran as time based.
          // Since we're running animations in reverse from how they normally would run,
          // therefore the timing is from the rangeEnd to the start.


          var _timing = _effect.getTiming();

          var _duration = typeof _timing.duration === 'number' ? _timing.duration : 0;

          var adjustedRangeStart = rangeEnd - (_duration + _timing.delay) * durationToRangeMultipler;
          var adjustedRangeEnd = rangeEnd - _timing.delay * durationToRangeMultipler;

          if (_timing.direction === 'reverse' || _timing.direction === 'alternate-reverse') {
            // this animation was originally in reverse so we have to play it in flipped range.
            var temp = adjustedRangeStart;
            adjustedRangeStart = adjustedRangeEnd;
            adjustedRangeEnd = temp;
          }

          animateGesture(_effect.getKeyframes(), // $FlowFixMe: Always documentElement atm.
          _effect.target, _pseudoElement, timeline, adjustedRangeStart, adjustedRangeEnd, isGeneratedGroupAnim, isExitGroupAnim);

          if (_pseudoElement.startsWith('::view-transition-old')) {
            var _groupName = _pseudoElement.slice(21);

            if (!foundGroups.has(_groupName) && !foundNews.has(_groupName)) {
              foundGroups.add(_groupName); // We haven't seen any group animation with this name. Since the old
              // state was outside the viewport we need to put it back. Since we
              // can't programmatically target the element itself, we use an
              // animation to adjust it.
              // this usually happens for exit animations where the element has
              // the old position.
              // If we also have a "new" state then we skip this because it means
              // someone manually disabled the auto-generated animation. We need to
              // treat the old state as having the position of the "new" state which
              // will happen by default.

              var pseudoElementName = '::view-transition-group' + _groupName;
              animateGesture([{}, {}], // $FlowFixMe: Always documentElement atm.
              _effect.target, pseudoElementName, timeline, rangeStart, rangeEnd, false, true // We let the helper apply the translate
              );
            }
          }
        }
      } // View Transitions with ScrollTimeline has a quirk where they end if the
      // ScrollTimeline ever reaches 100% but that doesn't mean we're done because
      // you can swipe back again. We can prevent this by adding a paused Animation
      // that never stops. this seems to keep all running Animations alive until
      // we explicitly abort (or something forces the View Transition to cancel).


      var blockingAnim = documentElement.animate([{}, {}], {
        pseudoElement: '::view-transition',
        duration: 1
      });
      blockingAnim.pause();
      animateCallback();
    }; // In Chrome, "new" animations are not ready in the ready callback. We have to wait
    // until requestAnimationFrame before we can observe them through getAnimations().
    // However, in Safari, that would cause a flicker because we're applying them late.
    // TODO: Think of a feature detection for this instead.


    var readyForAnimations = navigator.userAgent.indexOf('Chrome') !== -1 ? function () {
      return requestAnimationFrame(readyCallback);
    } : readyCallback;

    var handleError = function (error) {
      try {
        error = customizeViewTransitionError(error, true);

        if (error !== null) {
          errorCallback(error);
        }
      } finally {
        // Continue the reset of the work.
        // If the error happened in the snapshot phase before the update callback
        // was invoked, then we need to first finish the mutation and layout phases.
        // If they're already invoked it's still safe to call them due the status check.
        mutationCallback(); // Skip readyCallback() and go straight to animateCallbck() since we're not animating.
        // animateCallback() is still required to restore states.

        animateCallback();
      }
    };

    transition.ready.then(readyForAnimations, handleError);
    transition.finished.finally(function () {
      cancelAllViewTransitionAnimations(ownerDocument.documentElement); // $FlowFixMe[prop-missing]

      if (ownerDocument.__reactViewTransition === transition) {
        // $FlowFixMe[prop-missing]
        ownerDocument.__reactViewTransition = null;
      }
    });
    return transition;
  } catch (x) {
    // We use the error as feature detection.
    // The only thing that should throw is if startViewTransition is missing
    // or if it doesn't accept the object form. Other errors are async.
    // I.e. it's before the View Transitions v2 spec. We only support View
    // Transitions v2 otherwise we fallback to not animating to ensure that
    // we're not animating with the wrong animation mapped.
    // Run through the sequence to put state back into a consistent state.
    mutationCallback();
    animateCallback();
    return null;
  }
}
export function stopViewTransition(transition) {
  transition.skipTransition();
}

function ViewTransitionPseudoElement(pseudo, name) {
  // TODO: Get the owner document from the root container.
  this._scope = document.documentElement;
  this._selector = '::view-transition-' + pseudo + '(' + name + ')';
} // $FlowFixMe[prop-missing]


ViewTransitionPseudoElement.prototype.animate = function (keyframes, options) {
  var opts = typeof options === 'number' ? {
    duration: options
  } : Object.assign({}, options);
  opts.pseudoElement = this._selector; // TODO: Handle multiple child instances.

  return this._scope.animate(keyframes, opts);
}; // $FlowFixMe[prop-missing]


ViewTransitionPseudoElement.prototype.getAnimations = function (options) {
  var scope = this._scope;
  var selector = this._selector;
  var animations = scope.getAnimations({
    subtree: true
  });
  var result = [];

  for (var i = 0; i < animations.length; i++) {
    var effect = animations[i].effect; // TODO: Handle multiple child instances.

    if (effect !== null && effect.target === scope && effect.pseudoElement === selector) {
      result.push(animations[i]);
    }
  }

  return result;
}; // $FlowFixMe[prop-missing]


ViewTransitionPseudoElement.prototype.getComputedStyle = function () {
  var scope = this._scope;
  var selector = this._selector;
  return getComputedStyle(scope, selector);
};

export function createViewTransitionInstance(name) {
  return {
    name: name,
    group: new ViewTransitionPseudoElement('group', name),
    imagePair: new ViewTransitionPseudoElement('image-pair', name),
    old: new ViewTransitionPseudoElement('old', name),
    new: new ViewTransitionPseudoElement('new', name)
  };
}
// TODO: More provider types.
export function getCurrentGestureOffset(provider) {
  var time = provider.currentTime;

  if (time === null) {
    throw new Error('Cannot start a gesture with a disconnected AnimationTimeline.');
  }

  return typeof time === 'number' ? time : time.value;
}

function FragmentInstance(fragmentFiber) {
  this._fragmentFiber = fragmentFiber;
  this._eventListeners = null;
  this._observers = null;
} // $FlowFixMe[prop-missing]


FragmentInstance.prototype.addEventListener = function (type, listener, optionsOrUseCapture) {
  if (this._eventListeners === null) {
    this._eventListeners = [];
  }

  var listeners = this._eventListeners; // Element.addEventListener will only apply uniquely new event listeners by default. Since we
  // need to collect the listeners to apply to appended children, we track them ourselves and use
  // custom equality check for the options.

  var isNewEventListener = indexOfEventListener(listeners, type, listener, optionsOrUseCapture) === -1;

  if (isNewEventListener) {
    listeners.push({
      type: type,
      listener: listener,
      optionsOrUseCapture: optionsOrUseCapture
    });
    traverseFragmentInstance(this._fragmentFiber, addEventListenerToChild, type, listener, optionsOrUseCapture);
  }

  this._eventListeners = listeners;
};

function addEventListenerToChild(child, type, listener, optionsOrUseCapture) {
  var instance = getInstanceFromHostFiber(child);
  instance.addEventListener(type, listener, optionsOrUseCapture);
  return false;
} // $FlowFixMe[prop-missing]


FragmentInstance.prototype.removeEventListener = function (type, listener, optionsOrUseCapture) {
  var listeners = this._eventListeners;

  if (listeners === null) {
    return;
  }

  if (typeof listeners !== 'undefined' && listeners.length > 0) {
    traverseFragmentInstance(this._fragmentFiber, removeEventListenerFromChild, type, listener, optionsOrUseCapture);
    var index = indexOfEventListener(listeners, type, listener, optionsOrUseCapture);

    if (this._eventListeners !== null) {
      this._eventListeners.splice(index, 1);
    }
  }
};

function removeEventListenerFromChild(child, type, listener, optionsOrUseCapture) {
  var instance = getInstanceFromHostFiber(child);
  instance.removeEventListener(type, listener, optionsOrUseCapture);
  return false;
} // $FlowFixMe[prop-missing]


FragmentInstance.prototype.dispatchEvent = function (event) {
  var parentHostFiber = getFragmentParentHostFiber(this._fragmentFiber);

  if (parentHostFiber === null) {
    return true;
  }

  var parentHostInstance = getInstanceFromHostFiber(parentHostFiber);
  var eventListeners = this._eventListeners;

  if (eventListeners !== null && eventListeners.length > 0 || !event.bubbles) {
    var temp = document.createTextNode('');

    if (eventListeners) {
      for (var i = 0; i < eventListeners.length; i++) {
        var _eventListeners$i = eventListeners[i],
            _type = _eventListeners$i.type,
            _listener = _eventListeners$i.listener,
            _optionsOrUseCapture = _eventListeners$i.optionsOrUseCapture;
        temp.addEventListener(_type, _listener, _optionsOrUseCapture);
      }
    }

    parentHostInstance.appendChild(temp);
    var cancelable = temp.dispatchEvent(event);

    if (eventListeners) {
      for (var _i2 = 0; _i2 < eventListeners.length; _i2++) {
        var _eventListeners$_i = eventListeners[_i2],
            _type2 = _eventListeners$_i.type,
            _listener2 = _eventListeners$_i.listener,
            _optionsOrUseCapture2 = _eventListeners$_i.optionsOrUseCapture;
        temp.removeEventListener(_type2, _listener2, _optionsOrUseCapture2);
      }
    }

    parentHostInstance.removeChild(temp);
    return cancelable;
  } else {
    return parentHostInstance.dispatchEvent(event);
  }
}; // $FlowFixMe[prop-missing]


FragmentInstance.prototype.focus = function (focusOptions) {
  traverseFragmentInstanceDeeply(this._fragmentFiber, setFocusOnFiberIfFocusable, focusOptions);
};

function setFocusOnFiberIfFocusable(fiber, focusOptions) {
  var instance = getInstanceFromHostFiber(fiber);
  return setFocusIfFocusable(instance, focusOptions);
} // $FlowFixMe[prop-missing]


FragmentInstance.prototype.focusLast = function (focusOptions) {
  var children = [];
  traverseFragmentInstanceDeeply(this._fragmentFiber, collectChildren, children);

  for (var i = children.length - 1; i >= 0; i--) {
    var child = children[i];

    if (setFocusOnFiberIfFocusable(child, focusOptions)) {
      break;
    }
  }
};

function collectChildren(child, collection) {
  collection.push(child);
  return false;
} // $FlowFixMe[prop-missing]


FragmentInstance.prototype.blur = function () {
  // TODO: When we have a parent element reference, we can skip traversal if the fragment's parent
  //   does not contain document.activeElement
  traverseFragmentInstance(this._fragmentFiber, blurActiveElementWithinFragment);
};

function blurActiveElementWithinFragment(child) {
  // TODO: We can get the activeElement from the parent outside of the loop when we have a reference.
  var instance = getInstanceFromHostFiber(child);
  var ownerDocument = instance.ownerDocument;

  if (instance === ownerDocument.activeElement) {
    // $FlowFixMe[prop-missing]
    instance.blur();
    return true;
  }

  return false;
} // $FlowFixMe[prop-missing]


FragmentInstance.prototype.observeUsing = function (observer) {
  if (this._observers === null) {
    this._observers = new Set();
  }

  this._observers.add(observer);

  traverseFragmentInstance(this._fragmentFiber, observeChild, observer);
};

function observeChild(child, observer) {
  var instance = getInstanceFromHostFiber(child);
  observer.observe(instance);
  return false;
} // $FlowFixMe[prop-missing]


FragmentInstance.prototype.unobserveUsing = function (observer) {
  if (this._observers === null || !this._observers.has(observer)) {
    if (__DEV__) {
      console.error('You are calling unobserveUsing() with an observer that is not being observed with this fragment ' + 'instance. First attach the observer with observeUsing()');
    }
  } else {
    this._observers.delete(observer);

    traverseFragmentInstance(this._fragmentFiber, unobserveChild, observer);
  }
};

function unobserveChild(child, observer) {
  var instance = getInstanceFromHostFiber(child);
  observer.unobserve(instance);
  return false;
} // $FlowFixMe[prop-missing]


FragmentInstance.prototype.getClientRects = function () {
  var rects = [];
  traverseFragmentInstance(this._fragmentFiber, collectClientRects, rects);
  return rects;
};

function collectClientRects(child, rects) {
  var instance = getInstanceFromHostFiber(child); // $FlowFixMe[method-unbinding]

  rects.push.apply(rects, instance.getClientRects());
  return false;
} // $FlowFixMe[prop-missing]


FragmentInstance.prototype.getRootNode = function (getRootNodeOptions) {
  var parentHostFiber = getFragmentParentHostFiber(this._fragmentFiber);

  if (parentHostFiber === null) {
    return this;
  }

  var parentHostInstance = getInstanceFromHostFiber(parentHostFiber);
  var rootNode = // $FlowFixMe[incompatible-cast] Flow expects Node
  parentHostInstance.getRootNode(getRootNodeOptions);
  return rootNode;
}; // $FlowFixMe[prop-missing]


FragmentInstance.prototype.compareDocumentPosition = function (otherNode) {
  var parentHostFiber = getFragmentParentHostFiber(this._fragmentFiber);

  if (parentHostFiber === null) {
    return Node.DOCUMENT_POSITION_DISCONNECTED;
  }

  var children = [];
  traverseFragmentInstance(this._fragmentFiber, collectChildren, children);
  var result = Node.DOCUMENT_POSITION_DISCONNECTED;

  if (children.length === 0) {
    // If the fragment has no children, we can use the parent and
    // siblings to determine a position.
    var parentHostInstance = getInstanceFromHostFiber(parentHostFiber);
    var parentResult = parentHostInstance.compareDocumentPosition(otherNode);
    result = parentResult;

    if (parentHostInstance === otherNode) {
      result = Node.DOCUMENT_POSITION_CONTAINS;
    } else {
      if (parentResult & Node.DOCUMENT_POSITION_CONTAINED_BY) {
        // otherNode is one of the fragment's siblings. Use the next
        // sibling to determine if its preceding or following.
        var nextSiblingFiber = getNextSiblingHostFiber(this._fragmentFiber);

        if (nextSiblingFiber === null) {
          result = Node.DOCUMENT_POSITION_PRECEDING;
        } else {
          var nextSiblingInstance = getInstanceFromHostFiber(nextSiblingFiber);
          var nextSiblingResult = nextSiblingInstance.compareDocumentPosition(otherNode);

          if (nextSiblingResult === 0 || nextSiblingResult & Node.DOCUMENT_POSITION_FOLLOWING) {
            result = Node.DOCUMENT_POSITION_FOLLOWING;
          } else {
            result = Node.DOCUMENT_POSITION_PRECEDING;
          }
        }
      }
    }

    result |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    return result;
  }

  var firstElement = getInstanceFromHostFiber(children[0]);
  var lastElement = getInstanceFromHostFiber(children[children.length - 1]);
  var firstResult = firstElement.compareDocumentPosition(otherNode);
  var lastResult = lastElement.compareDocumentPosition(otherNode);

  if (firstResult & Node.DOCUMENT_POSITION_FOLLOWING && lastResult & Node.DOCUMENT_POSITION_PRECEDING || otherNode === firstElement || otherNode === lastElement) {
    result = Node.DOCUMENT_POSITION_CONTAINED_BY;
  } else {
    result = firstResult;
  }

  if (result & Node.DOCUMENT_POSITION_DISCONNECTED || result & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC) {
    return result;
  } // Now that we have the result from the DOM API, we double check it matches
  // the state of the React tree. If it doesn't, we have a case of portaled or
  // otherwise injected elements and we return DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC.


  var documentPositionMatchesFiberPosition = validateDocumentPositionWithFiberTree(result, this._fragmentFiber, children[0], children[children.length - 1], otherNode);

  if (documentPositionMatchesFiberPosition) {
    return result;
  }

  return Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
};

function validateDocumentPositionWithFiberTree(documentPosition, fragmentFiber, precedingBoundaryFiber, followingBoundaryFiber, otherNode) {
  var otherFiber = getClosestInstanceFromNode(otherNode);

  if (documentPosition & Node.DOCUMENT_POSITION_CONTAINED_BY) {
    return !!otherFiber && isFiberContainedBy(fragmentFiber, otherFiber);
  }

  if (documentPosition & Node.DOCUMENT_POSITION_CONTAINS) {
    if (otherFiber === null) {
      // otherFiber could be null if its the document or body element
      var ownerDocument = otherNode.ownerDocument;
      return otherNode === ownerDocument || otherNode === ownerDocument.body;
    }

    return isFiberContainedBy(otherFiber, fragmentFiber);
  }

  if (documentPosition & Node.DOCUMENT_POSITION_PRECEDING) {
    return !!otherFiber && (otherFiber === precedingBoundaryFiber || isFiberPreceding(precedingBoundaryFiber, otherFiber));
  }

  if (documentPosition & Node.DOCUMENT_POSITION_FOLLOWING) {
    return !!otherFiber && (otherFiber === followingBoundaryFiber || isFiberFollowing(followingBoundaryFiber, otherFiber));
  }

  return false;
}

function normalizeListenerOptions(opts) {
  if (opts == null) {
    return '0';
  }

  if (typeof opts === 'boolean') {
    return "c=" + (opts ? '1' : '0');
  }

  return "c=" + (opts.capture ? '1' : '0') + "&o=" + (opts.once ? '1' : '0') + "&p=" + (opts.passive ? '1' : '0');
}

function indexOfEventListener(eventListeners, type, listener, optionsOrUseCapture) {
  for (var i = 0; i < eventListeners.length; i++) {
    var item = eventListeners[i];

    if (item.type === type && item.listener === listener && normalizeListenerOptions(item.optionsOrUseCapture) === normalizeListenerOptions(optionsOrUseCapture)) {
      return i;
    }
  }

  return -1;
}

export function createFragmentInstance(fragmentFiber) {
  return new FragmentInstance(fragmentFiber);
}
export function updateFragmentInstanceFiber(fragmentFiber, instance) {
  instance._fragmentFiber = fragmentFiber;
}
export function commitNewChildToFragmentInstance(childInstance, fragmentInstance) {
  var eventListeners = fragmentInstance._eventListeners;

  if (eventListeners !== null) {
    for (var i = 0; i < eventListeners.length; i++) {
      var _eventListeners$i2 = eventListeners[i],
          _type3 = _eventListeners$i2.type,
          _listener3 = _eventListeners$i2.listener,
          _optionsOrUseCapture3 = _eventListeners$i2.optionsOrUseCapture;
      childInstance.addEventListener(_type3, _listener3, _optionsOrUseCapture3);
    }
  }

  if (fragmentInstance._observers !== null) {
    fragmentInstance._observers.forEach(function (observer) {
      observer.observe(childInstance);
    });
  }
}
export function deleteChildFromFragmentInstance(childElement, fragmentInstance) {
  var eventListeners = fragmentInstance._eventListeners;

  if (eventListeners !== null) {
    for (var i = 0; i < eventListeners.length; i++) {
      var _eventListeners$i3 = eventListeners[i],
          _type4 = _eventListeners$i3.type,
          _listener4 = _eventListeners$i3.listener,
          _optionsOrUseCapture4 = _eventListeners$i3.optionsOrUseCapture;
      childElement.removeEventListener(_type4, _listener4, _optionsOrUseCapture4);
    }
  }
}
export function clearContainer(container) {
  var nodeType = container.nodeType;

  if (nodeType === DOCUMENT_NODE) {
    clearContainerSparingly(container);
  } else if (nodeType === ELEMENT_NODE) {
    switch (container.nodeName) {
      case 'HEAD':
      case 'HTML':
      case 'BODY':
        clearContainerSparingly(container);
        return;

      default:
        {
          container.textContent = '';
        }
    }
  }
}

function clearContainerSparingly(container) {
  var node;
  var nextNode = container.firstChild;

  if (nextNode && nextNode.nodeType === DOCUMENT_TYPE_NODE) {
    nextNode = nextNode.nextSibling;
  }

  while (nextNode) {
    node = nextNode;
    nextNode = nextNode.nextSibling;

    switch (node.nodeName) {
      case 'HTML':
      case 'HEAD':
      case 'BODY':
        {
          var element = node;
          clearContainerSparingly(element); // If these singleton instances had previously been rendered with React they
          // may still hold on to references to the previous fiber tree. We detatch them
          // prospectively to reset them to a baseline starting state since we cannot create
          // new instances.

          detachDeletedInstance(element);
          continue;
        }
      // Script tags are retained to avoid an edge case bug. Normally scripts will execute if they
      // are ever inserted into the DOM. However when streaming if a script tag is opened but not
      // yet closed some browsers create and insert the script DOM Node but the script cannot execute
      // yet until the closing tag is parsed. If something causes React to call clearContainer while
      // this DOM node is in the document but not yet executable the DOM node will be removed from the
      // document and when the script closing tag comes in the script will not end up running. this seems
      // to happen in Chrome/Firefox but not Safari at the moment though this is not necessarily specified
      // behavior so it could change in future versions of browsers. While leaving all scripts is broader
      // than strictly necessary this is the least amount of additional code to avoid this breaking
      // edge case.
      //
      // Style tags are retained because they may likely come from 3rd party scripts and extensions

      case 'SCRIPT':
      case 'STYLE':
        {
          continue;
        }
      // Stylesheet tags are retained because they may likely come from 3rd party scripts and extensions

      case 'LINK':
        {
          if (node.rel.toLowerCase() === 'stylesheet') {
            continue;
          }
        }
    }

    container.removeChild(node);
  }

  return;
}

function clearHead(head) {
  var node = head.firstChild;

  while (node) {
    var nextNode = node.nextSibling;
    var nodeName = node.nodeName;

    if (isMarkedHoistable(node) || nodeName === 'SCRIPT' || nodeName === 'STYLE' || nodeName === 'LINK' && node.rel.toLowerCase() === 'stylesheet') {// retain these nodes
    } else {
      head.removeChild(node);
    }

    node = nextNode;
  }

  return;
} // Making this so we can eventually move all of the instance caching to the commit phase.
// Currently this is only used to associate fiber and props to instances for hydrating
// HostSingletons. The reason we need it here is we only want to make this binding on commit
// because only one fiber can own the instance at a time and render can fail/restart


export function bindInstance(instance, props, internalInstanceHandle) {
  precacheFiberNode(internalInstanceHandle, instance);
  updateFiberProps(instance, props);
} // -------------------
//     Hydration
// -------------------

export var supportsHydration = true;
export function canHydrateInstance(instance, type, props, inRootOrSingleton) {
  while (instance.nodeType === ELEMENT_NODE) {
    var element = instance;
    var anyProps = props;

    if (element.nodeName.toLowerCase() !== type.toLowerCase()) {
      if (!inRootOrSingleton) {
        // Usually we error for mismatched tags.
        if (element.nodeName === 'INPUT' && element.type === 'hidden') {// If we have extra hidden inputs, we don't mismatch. this allows us to embed
          // extra form data in the original form.
        } else {
          return null;
        }
      } // In root or singleton parents we skip past mismatched instances.

    } else if (!inRootOrSingleton) {
      // Match
      if (type === 'input' && element.type === 'hidden') {
        if (__DEV__) {
          checkAttributeStringCoercion(anyProps.name, 'name');
        }

        var name = anyProps.name == null ? null : '' + anyProps.name;

        if (anyProps.type !== 'hidden' || element.getAttribute('name') !== name) {// Skip past hidden inputs unless that's what we're looking for. this allows us
          // embed extra form data in the original form.
        } else {
          return element;
        }
      } else {
        return element;
      }
    } else if (isMarkedHoistable(element)) {// We've already claimed this as a hoistable which isn't hydrated this way so we skip past it.
    } else {
      // We have an Element with the right type.
      // We are going to try to exclude it if we can definitely identify it as a hoisted Node or if
      // we can guess that the node is likely hoisted or was inserted by a 3rd party script or browser extension
      // using high entropy attributes for certain types. this technique will fail for strange insertions like
      // extension prepending <div> in the <body> but that already breaks before and that is an edge case.
      switch (type) {
        // case 'title':
        //We assume all titles are matchable. You should only have one in the Document, at least in a hoistable scope
        // and if you are a HostComponent with type title we must either be in an <svg> context or this title must have an `itemProp` prop.
        case 'meta':
          {
            // The only way to opt out of hoisting meta tags is to give it an itemprop attribute. We assume there will be
            // not 3rd party meta tags that are prepended, accepting the cases where this isn't true because meta tags
            // are usually only functional for SSR so even in a rare case where we did bind to an injected tag the runtime
            // implications are minimal
            if (!element.hasAttribute('itemprop')) {
              // this is a Hoistable
              break;
            }

            return element;
          }

        case 'link':
          {
            // Links come in many forms and we do expect 3rd parties to inject them into <head> / <body>. We exclude known resources
            // and then use high-entroy attributes like href which are almost always used and almost always unique to filter out unlikely
            // matches.
            var rel = element.getAttribute('rel');

            if (rel === 'stylesheet' && element.hasAttribute('data-precedence')) {
              // this is a stylesheet resource
              break;
            } else if (rel !== anyProps.rel || element.getAttribute('href') !== (anyProps.href == null || anyProps.href === '' ? null : anyProps.href) || element.getAttribute('crossorigin') !== (anyProps.crossOrigin == null ? null : anyProps.crossOrigin) || element.getAttribute('title') !== (anyProps.title == null ? null : anyProps.title)) {
              // rel + href should usually be enough to uniquely identify a link however crossOrigin can vary for rel preconnect
              // and title could vary for rel alternate
              break;
            }

            return element;
          }

        case 'style':
          {
            // Styles are hard to match correctly. We can exclude known resources but otherwise we accept the fact that a non-hoisted style tags
            // in <head> or <body> are likely never going to be unmounted given their position in the document and the fact they likely hold global styles
            if (element.hasAttribute('data-precedence')) {
              // this is a style resource
              break;
            }

            return element;
          }

        case 'script':
          {
            // Scripts are a little tricky, we exclude known resources and then similar to links try to use high-entropy attributes
            // to reject poor matches. One challenge with scripts are inline scripts. We don't attempt to check text content which could
            // in theory lead to a hydration error later if a 3rd party injected an inline script before the React rendered nodes.
            // Falling back to client rendering if this happens should be seemless though so we will try this hueristic and revisit later
            // if we learn it is problematic
            var srcAttr = element.getAttribute('src');

            if (srcAttr !== (anyProps.src == null ? null : anyProps.src) || element.getAttribute('type') !== (anyProps.type == null ? null : anyProps.type) || element.getAttribute('crossorigin') !== (anyProps.crossOrigin == null ? null : anyProps.crossOrigin)) {
              // this script is for a different src/type/crossOrigin. It may be a script resource
              // or it may just be a mistmatch
              if (srcAttr && element.hasAttribute('async') && !element.hasAttribute('itemprop')) {
                // this is an async script resource
                break;
              }
            }

            return element;
          }

        default:
          {
            // We have excluded the most likely cases of mismatch between hoistable tags, 3rd party script inserted tags,
            // and browser extension inserted tags. While it is possible this is not the right match it is a decent hueristic
            // that should work in the vast majority of cases.
            return element;
          }
      }
    }

    var nextInstance = getNextHydratableSibling(element);

    if (nextInstance === null) {
      break;
    }

    instance = nextInstance;
  } // this is a suspense boundary or Text node or we got the end.
  // Suspense Boundaries are never expected to be injected by 3rd parties. If we see one it should be matched
  // and this is a hydration error.
  // Text Nodes are also not expected to be injected by 3rd parties. this is less of a guarantee for <body>
  // but it seems reasonable and conservative to reject this as a hydration error as well


  return null;
}
export function canHydrateTextInstance(instance, text, inRootOrSingleton) {
  // Empty strings are not parsed by HTML so there won't be a correct match here.
  if (text === '') return null;

  while (instance.nodeType !== TEXT_NODE) {
    if (instance.nodeType === ELEMENT_NODE && instance.nodeName === 'INPUT' && instance.type === 'hidden') {// If we have extra hidden inputs, we don't mismatch. this allows us to
      // embed extra form data in the original form.
    } else if (!inRootOrSingleton) {
      return null;
    }

    var nextInstance = getNextHydratableSibling(instance);

    if (nextInstance === null) {
      return null;
    }

    instance = nextInstance;
  } // this has now been refined to a text node.


  return instance;
}

function canHydrateHydrationBoundary(instance, inRootOrSingleton) {
  while (instance.nodeType !== COMMENT_NODE) {
    if (!inRootOrSingleton) {
      return null;
    }

    var nextInstance = getNextHydratableSibling(instance);

    if (nextInstance === null) {
      return null;
    }

    instance = nextInstance;
  } // this has now been refined to a hydration boundary node.


  return instance;
}

export function canHydrateActivityInstance(instance, inRootOrSingleton) {
  var hydratableInstance = canHydrateHydrationBoundary(instance, inRootOrSingleton);

  if (hydratableInstance !== null && hydratableInstance.data === ACTIVITY_START_DATA) {
    return hydratableInstance;
  }

  return null;
}
export function canHydrateSuspenseInstance(instance, inRootOrSingleton) {
  var hydratableInstance = canHydrateHydrationBoundary(instance, inRootOrSingleton);

  if (hydratableInstance !== null && hydratableInstance.data !== ACTIVITY_START_DATA) {
    return hydratableInstance;
  }

  return null;
}
export function isSuspenseInstancePending(instance) {
  return instance.data === SUSPENSE_PENDING_START_DATA || instance.data === SUSPENSE_QUEUED_START_DATA;
}
export function isSuspenseInstanceFallback(instance) {
  return instance.data === SUSPENSE_FALLBACK_START_DATA || instance.data === SUSPENSE_PENDING_START_DATA && instance.ownerDocument.readyState !== DOCUMENT_READY_STATE_LOADING;
}
export function getSuspenseInstanceFallbackErrorDetails(instance) {
  var dataset = instance.nextSibling && instance.nextSibling.dataset;
  var digest, message, stack, componentStack;

  if (dataset) {
    digest = dataset.dgst;

    if (__DEV__) {
      message = dataset.msg;
      stack = dataset.stck;
      componentStack = dataset.cstck;
    }
  }

  if (__DEV__) {
    return {
      message: message,
      digest: digest,
      stack: stack,
      componentStack: componentStack
    };
  } else {
    // Object gets DCE'd if constructed in tail position and matches callsite destructuring
    return {
      digest: digest
    };
  }
}
export function registerSuspenseInstanceRetry(instance, callback) {
  var ownerDocument = instance.ownerDocument;

  if (instance.data === SUSPENSE_QUEUED_START_DATA) {
    // The Fizz runtime has already queued this boundary for reveal. We wait for it
    // to be revealed and then retries.
    instance._reactRetry = callback;
  } else if ( // The Fizz runtime must have put this boundary into client render or complete
  // state after the render finished but before it committed. We need to call the
  // callback now rather than wait
  instance.data !== SUSPENSE_PENDING_START_DATA || // The boundary is still in pending status but the document has finished loading
  // before we could register the event handler that would have scheduled the retry
  // on load so we call teh callback now.
  ownerDocument.readyState !== DOCUMENT_READY_STATE_LOADING) {
    callback();
  } else {
    // We're still in pending status and the document is still loading so we attach
    // a listener to the document load even and expose the retry on the instance for
    // the Fizz runtime to trigger if it ends up resolving this boundary
    var _listener5 = function () {
      callback();
      ownerDocument.removeEventListener('DOMContentLoaded', _listener5);
    };

    ownerDocument.addEventListener('DOMContentLoaded', _listener5);
    instance._reactRetry = _listener5;
  }
}
export function canHydrateFormStateMarker(instance, inRootOrSingleton) {
  while (instance.nodeType !== COMMENT_NODE) {
    if (!inRootOrSingleton) {
      return null;
    }

    var nextInstance = getNextHydratableSibling(instance);

    if (nextInstance === null) {
      return null;
    }

    instance = nextInstance;
  }

  var nodeData = instance.data;

  if (nodeData === FORM_STATE_IS_MATCHING || nodeData === FORM_STATE_IS_NOT_MATCHING) {
    var markerInstance = instance;
    return markerInstance;
  }

  return null;
}
export function isFormStateMarkerMatching(markerInstance) {
  return markerInstance.data === FORM_STATE_IS_MATCHING;
}

function getNextHydratable(node) {
  // Skip non-hydratable nodes.
  for (; node != null; node = node.nextSibling) {
    var nodeType = node.nodeType;

    if (nodeType === ELEMENT_NODE || nodeType === TEXT_NODE) {
      break;
    }

    if (nodeType === COMMENT_NODE) {
      var data = node.data;

      if (data === SUSPENSE_START_DATA || data === SUSPENSE_FALLBACK_START_DATA || data === SUSPENSE_PENDING_START_DATA || data === SUSPENSE_QUEUED_START_DATA || data === ACTIVITY_START_DATA || data === FORM_STATE_IS_MATCHING || data === FORM_STATE_IS_NOT_MATCHING) {
        break;
      }

      if (data === SUSPENSE_END_DATA || data === ACTIVITY_END_DATA) {
        return null;
      }
    }
  }

  return node;
}

export function getNextHydratableSibling(instance) {
  return getNextHydratable(instance.nextSibling);
}
export function getFirstHydratableChild(parentInstance) {
  return getNextHydratable(parentInstance.firstChild);
}
export function getFirstHydratableChildWithinContainer(parentContainer) {
  var parentElement;

  switch (parentContainer.nodeType) {
    case DOCUMENT_NODE:
      parentElement = parentContainer.body;
      break;

    default:
      {
        if (parentContainer.nodeName === 'HTML') {
          parentElement = parentContainer.ownerDocument.body;
        } else {
          parentElement = parentContainer;
        }
      }
  }

  return getNextHydratable(parentElement.firstChild);
}
export function getFirstHydratableChildWithinActivityInstance(parentInstance) {
  return getNextHydratable(parentInstance.nextSibling);
}
export function getFirstHydratableChildWithinSuspenseInstance(parentInstance) {
  return getNextHydratable(parentInstance.nextSibling);
} // If it were possible to have more than one scope singleton in a DOM tree
// we would need to model this as a stack but since you can only have one <head>
// and head is the only singleton that is a scope in DOM we can get away with
// tracking this as a single value.

var previousHydratableOnEnteringScopedSingleton = null;
export function getFirstHydratableChildWithinSingleton(type, singletonInstance, currentHydratableInstance) {
  if (isSingletonScope(type)) {
    previousHydratableOnEnteringScopedSingleton = currentHydratableInstance;
    return getNextHydratable(singletonInstance.firstChild);
  } else {
    return currentHydratableInstance;
  }
}
export function getNextHydratableSiblingAfterSingleton(type, currentHydratableInstance) {
  if (isSingletonScope(type)) {
    var previousHydratableInstance = previousHydratableOnEnteringScopedSingleton;
    previousHydratableOnEnteringScopedSingleton = null;
    return previousHydratableInstance;
  } else {
    return currentHydratableInstance;
  }
}
export function describeHydratableInstanceForDevWarnings(instance) {
  // Reverse engineer a pseudo react-element from hydratable instance
  if (instance.nodeType === ELEMENT_NODE) {
    // Reverse engineer a set of props that can print for dev warnings
    return {
      type: instance.nodeName.toLowerCase(),
      props: getPropsFromElement(instance)
    };
  } else if (instance.nodeType === COMMENT_NODE) {
    if (instance.data === ACTIVITY_START_DATA) {
      return {
        type: 'Activity',
        props: {}
      };
    }

    return {
      type: 'Suspense',
      props: {}
    };
  } else {
    return instance.nodeValue;
  }
}
export function validateHydratableInstance(type, props, hostContext) {
  if (__DEV__) {
    // TODO: take namespace into account when validating.
    var hostContextDev = hostContext;
    return validateDOMNesting(type, hostContextDev.ancestorInfo);
  }

  return true;
}
export function hydrateInstance(instance, type, props, hostContext, internalInstanceHandle) {
  precacheFiberNode(internalInstanceHandle, instance); // TODO: Possibly defer this until the commit phase where all the events
  // get attached.

  updateFiberProps(instance, props);
  return hydrateProperties(instance, type, props, hostContext);
} // Returns a Map of properties that were different on the server.

export function diffHydratedPropsForDevWarnings(instance, type, props, hostContext) {
  return diffHydratedProperties(instance, type, props, hostContext);
}
export function validateHydratableTextInstance(text, hostContext) {
  if (__DEV__) {
    var hostContextDev = hostContext;
    var ancestor = hostContextDev.ancestorInfo.current;

    if (ancestor != null) {
      return validateTextNesting(text, ancestor.tag, hostContextDev.ancestorInfo.implicitRootScope);
    }
  }

  return true;
}
export function hydrateTextInstance(textInstance, text, internalInstanceHandle, parentInstanceProps) {
  precacheFiberNode(internalInstanceHandle, textInstance);
  return hydrateText(textInstance, text, parentInstanceProps);
} // Returns the server text if it differs from the client.

export function diffHydratedTextForDevWarnings(textInstance, text, parentProps) {
  if (parentProps === null || parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
    return diffHydratedText(textInstance, text);
  }

  return null;
}
export function hydrateActivityInstance(activityInstance, internalInstanceHandle) {
  precacheFiberNode(internalInstanceHandle, activityInstance);
}
export function hydrateSuspenseInstance(suspenseInstance, internalInstanceHandle) {
  precacheFiberNode(internalInstanceHandle, suspenseInstance);
}

function getNextHydratableInstanceAfterHydrationBoundary(hydrationInstance) {
  var node = hydrationInstance.nextSibling; // Skip past all nodes within this suspense boundary.
  // There might be nested nodes so we need to keep track of how
  // deep we are and only break out when we're back on top.

  var depth = 0;

  while (node) {
    if (node.nodeType === COMMENT_NODE) {
      var data = node.data;

      if (data === SUSPENSE_END_DATA || data === ACTIVITY_END_DATA) {
        if (depth === 0) {
          return getNextHydratableSibling(node);
        } else {
          depth--;
        }
      } else if (data === SUSPENSE_START_DATA || data === SUSPENSE_FALLBACK_START_DATA || data === SUSPENSE_PENDING_START_DATA || data === SUSPENSE_QUEUED_START_DATA || data === ACTIVITY_START_DATA) {
        depth++;
      }
    }

    node = node.nextSibling;
  } // TODO: Warn, we didn't find the end comment boundary.


  return null;
}

export function getNextHydratableInstanceAfterActivityInstance(activityInstance) {
  return getNextHydratableInstanceAfterHydrationBoundary(activityInstance);
}
export function getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance) {
  return getNextHydratableInstanceAfterHydrationBoundary(suspenseInstance);
} // Returns the SuspenseInstance if this node is a direct child of a
// SuspenseInstance. I.e. if its previous sibling is a Comment with
// SUSPENSE_x_START_DATA. Otherwise, null.

export function getParentHydrationBoundary(targetInstance) {
  var node = targetInstance.previousSibling; // Skip past all nodes within this suspense boundary.
  // There might be nested nodes so we need to keep track of how
  // deep we are and only break out when we're back on top.

  var depth = 0;

  while (node) {
    if (node.nodeType === COMMENT_NODE) {
      var data = node.data;

      if (data === SUSPENSE_START_DATA || data === SUSPENSE_FALLBACK_START_DATA || data === SUSPENSE_PENDING_START_DATA || data === SUSPENSE_QUEUED_START_DATA || data === ACTIVITY_START_DATA) {
        if (depth === 0) {
          return node;
        } else {
          depth--;
        }
      } else if (data === SUSPENSE_END_DATA || data === ACTIVITY_END_DATA) {
        depth++;
      }
    }

    node = node.previousSibling;
  }

  return null;
}
export function commitHydratedContainer(container) {
  // Retry if any event replaying was blocked on this.
  retryIfBlockedOn(container);
}
export function commitHydratedActivityInstance(activityInstance) {
  // Retry if any event replaying was blocked on this.
  retryIfBlockedOn(activityInstance);
}
export function commitHydratedSuspenseInstance(suspenseInstance) {
  // Retry if any event replaying was blocked on this.
  retryIfBlockedOn(suspenseInstance);
}
export function flushHydrationEvents() {
  if (enableHydrationChangeEvent) {
    flushEventReplaying();
  }
}
export function shouldDeleteUnhydratedTailInstances(parentType) {
  return parentType !== 'form' && parentType !== 'button';
} // -------------------
//     Test Selectors
// -------------------

export var supportsTestSelectors = true;
export function findFiberRoot(node) {
  var stack = [node];
  var index = 0;

  while (index < stack.length) {
    var current = stack[index++];

    if (isContainerMarkedAsRoot(current)) {
      return getInstanceFromNodeDOMTree(current);
    }

    stack.push.apply(stack, current.children);
  }

  return null;
}
export function getBoundingRect(node) {
  var rect = node.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
}
export function matchAccessibilityRole(node, role) {
  if (hasRole(node, role)) {
    return true;
  }

  return false;
}
export function getTextContent(fiber) {
  switch (fiber.tag) {
    case HostHoistable:
    case HostSingleton:
    case HostComponent:
      var textContent = '';
      var childNodes = fiber.stateNode.childNodes;

      for (var i = 0; i < childNodes.length; i++) {
        var childNode = childNodes[i];

        if (childNode.nodeType === Node.TEXT_NODE) {
          textContent += childNode.textContent;
        }
      }

      return textContent;

    case HostText:
      return fiber.stateNode.textContent;
  }

  return null;
}
export function isHiddenSubtree(fiber) {
  return fiber.tag === HostComponent && fiber.memoizedProps.hidden === true;
}
export function setFocusIfFocusable(node, focusOptions) {
  // The logic for determining if an element is focusable is kind of complex,
  // and since we want to actually change focus anyway- we can just skip it.
  // Instead we'll just listen for a "focus" event to verify that focus was set.
  //
  // We could compare the node to document.activeElement after focus,
  // but this would not handle the case where application code managed focus to automatically blur.
  var didFocus = false;

  var handleFocus = function () {
    didFocus = true;
  };

  var element = node;

  try {
    element.addEventListener('focus', handleFocus); // $FlowFixMe[method-unbinding]

    (element.focus || HTMLElement.prototype.focus).call(element, focusOptions);
  } finally {
    element.removeEventListener('focus', handleFocus);
  }

  return didFocus;
}
export function setupIntersectionObserver(targets, callback, options) {
  var rectRatioCache = new Map();
  targets.forEach(function (target) {
    rectRatioCache.set(target, {
      rect: getBoundingRect(target),
      ratio: 0
    });
  });

  var handleIntersection = function (entries) {
    entries.forEach(function (entry) {
      var boundingClientRect = entry.boundingClientRect,
          intersectionRatio = entry.intersectionRatio,
          target = entry.target;
      rectRatioCache.set(target, {
        rect: {
          x: boundingClientRect.left,
          y: boundingClientRect.top,
          width: boundingClientRect.width,
          height: boundingClientRect.height
        },
        ratio: intersectionRatio
      });
    });
    callback(Array.from(rectRatioCache.values()));
  };

  var observer = new IntersectionObserver(handleIntersection, options);
  targets.forEach(function (target) {
    observer.observe(target);
  });
  return {
    disconnect: function () {
      return observer.disconnect();
    },
    observe: function (target) {
      rectRatioCache.set(target, {
        rect: getBoundingRect(target),
        ratio: 0
      });
      observer.observe(target);
    },
    unobserve: function (target) {
      rectRatioCache.delete(target);
      observer.unobserve(target);
    }
  };
}
export function requestPostPaintCallback(callback) {
  localRequestAnimationFrame(function () {
    localRequestAnimationFrame(function (time) {
      return callback(time);
    });
  });
} // -------------------
//     Singletons
// -------------------

export var supportsSingletons = true;
export function isHostSingletonType(type) {
  return type === 'html' || type === 'head' || type === 'body';
}
export function resolveSingletonInstance(type, props, rootContainerInstance, hostContext, validateDOMNestingDev) {
  if (__DEV__) {
    var hostContextDev = hostContext;

    if (validateDOMNestingDev) {
      validateDOMNesting(type, hostContextDev.ancestorInfo);
    }
  }

  var ownerDocument = getOwnerDocumentFromRootContainer(rootContainerInstance);

  switch (type) {
    case 'html':
      {
        var documentElement = ownerDocument.documentElement;

        if (!documentElement) {
          throw new Error('React expected an <html> element (document.documentElement) to exist in the Document but one was' + ' not found. React never removes the documentElement for any Document it renders into so' + ' the cause is likely in some other script running on this page.');
        }

        return documentElement;
      }

    case 'head':
      {
        var head = ownerDocument.head;

        if (!head) {
          throw new Error('React expected a <head> element (document.head) to exist in the Document but one was' + ' not found. React never removes the head for any Document it renders into so' + ' the cause is likely in some other script running on this page.');
        }

        return head;
      }

    case 'body':
      {
        var body = ownerDocument.body;

        if (!body) {
          throw new Error('React expected a <body> element (document.body) to exist in the Document but one was' + ' not found. React never removes the body for any Document it renders into so' + ' the cause is likely in some other script running on this page.');
        }

        return body;
      }

    default:
      {
        throw new Error('resolveSingletonInstance was called with an element type that is not supported. this is a bug in React.');
      }
  }
}
export function acquireSingletonInstance(type, props, instance, internalInstanceHandle) {
  if (__DEV__) {
    if ( // If this instance is the container then it is invalid to acquire it as a singleton however
    // the DOM nesting validation will already warn for this and the message below isn't semantically
    // aligned with the actual fix you need to make so we omit the warning in this case
    !isContainerMarkedAsRoot(instance) && // If this instance isn't the root but is currently owned by a different HostSingleton instance then
    // we we need to warn that you are rendering more than one singleton at a time.
    getInstanceFromNodeDOMTree(instance)) {
      var tagName = instance.tagName.toLowerCase();
      console.error('You are mounting a new %s component when a previous one has not first unmounted. It is an' + ' error to render more than one %s component at a time and attributes and children of these' + ' components will likely fail in unpredictable ways. Please only render a single instance of' + ' <%s> and if you need to mount a new one, ensure any previous ones have unmounted first.', tagName, tagName, tagName);
    }

    switch (type) {
      case 'html':
      case 'head':
      case 'body':
        {
          break;
        }

      default:
        {
          console.error('acquireSingletonInstance was called with an element type that is not supported. this is a bug in React.');
        }
    }
  }

  var attributes = instance.attributes;

  while (attributes.length) {
    instance.removeAttributeNode(attributes[0]);
  }

  setInitialProperties(instance, type, props);
  precacheFiberNode(internalInstanceHandle, instance);
  updateFiberProps(instance, props);
}
export function releaseSingletonInstance(instance) {
  var attributes = instance.attributes;

  while (attributes.length) {
    instance.removeAttributeNode(attributes[0]);
  }

  detachDeletedInstance(instance);
} // -------------------
//     Resources
// -------------------

export var supportsResources = true;
var NotLoaded =
/*       */
0;
var Loaded =
/*          */
1;
var Errored =
/*         */
2;
var Settled =
/*         */
3;
var Inserted =
/*        */
4;
export function prepareToCommitHoistables() {
  tagCaches = null;
} // global collections of Resources

var preloadPropsMap = new Map();
var preconnectsSet = new Set();
// getRootNode is missing from IE and old jsdom versions
export function getHoistableRoot(container) {
  // $FlowFixMe[method-unbinding]
  return typeof container.getRootNode === 'function' ?
  /* $FlowFixMe[incompatible-cast] Flow types this as returning a `Node`,
   * but it's either a `Document` or `ShadowRoot`. */
  container.getRootNode() : container.nodeType === DOCUMENT_NODE ? // $FlowFixMe[incompatible-cast] We've constrained this to be a Document which satisfies the return type
  container : container.ownerDocument;
}

function getCurrentResourceRoot() {
  var currentContainer = getCurrentRootHostContainer();
  return currentContainer ? getHoistableRoot(currentContainer) : null;
}

function getDocumentFromRoot(root) {
  return root.ownerDocument || root;
}

var previousDispatcher = ReactDOMSharedInternals.d;
/* ReactDOMCurrentDispatcher */

ReactDOMSharedInternals.d
/* ReactDOMCurrentDispatcher */
= {
  f
  /* flushSyncWork */
  : disableLegacyMode ? flushSyncWork : previousDispatcher.f
  /* flushSyncWork */
  ,
  r: requestFormReset,
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
};

function flushSyncWork() {
  if (disableLegacyMode) {
    var previousWasRendering = previousDispatcher.f();
    /* flushSyncWork */

    var wasRendering = flushSyncWorkOnAllRoots(); // Since multiple dispatchers can flush sync work during a single flushSync call
    // we need to return true if any of them were rendering.

    return previousWasRendering || wasRendering;
  } else {
    throw new Error('flushSyncWork should not be called from builds that support legacy mode. this is a bug in React.');
  }
}

function requestFormReset(form) {
  var formInst = getInstanceFromNodeDOMTree(form);

  if (formInst !== null && formInst.tag === HostComponent && formInst.type === 'form') {
    requestFormResetOnFiber(formInst);
  } else {
    // this form was either not rendered by this React renderer (or it's an
    // invalid type). Try the next one.
    //
    // The last implementation in the sequence will throw an error.
    previousDispatcher.r(
    /* requestFormReset */
    form);
  }
} // We expect this to get inlined. It is a function mostly to communicate the special nature of
// how we resolve the HoistableRoot for ReactDOM.pre*() methods. Because we support calling
// these methods outside of render there is no way to know which Document or ShadowRoot is 'scoped'
// and so we have to fall back to something universal. Currently we just refer to the global document.
// this is notable because nowhere else in ReactDOM do we actually reference the global document or window
// because we may be rendering inside an iframe.


var globalDocument = typeof document === 'undefined' ? null : document;

function getGlobalDocument() {
  return globalDocument;
}

function preconnectAs(rel, href, crossOrigin) {
  var ownerDocument = getGlobalDocument();

  if (ownerDocument && typeof href === 'string' && href) {
    var limitedEscapedHref = escapeSelectorAttributeValueInsideDoubleQuotes(href);

    var _key = "link[rel=\"" + rel + "\"][href=\"" + limitedEscapedHref + "\"]";

    if (typeof crossOrigin === 'string') {
      _key += "[crossorigin=\"" + crossOrigin + "\"]";
    }

    if (!preconnectsSet.has(_key)) {
      preconnectsSet.add(_key);
      var preconnectProps = {
        rel: rel,
        crossOrigin: crossOrigin,
        href: href
      };

      if (null === ownerDocument.querySelector(_key)) {
        var _instance2 = ownerDocument.createElement('link');

        setInitialProperties(_instance2, 'link', preconnectProps);
        markNodeAsHoistable(_instance2);
        ownerDocument.head.appendChild(_instance2);
      }
    }
  }
}

function prefetchDNS(href) {
  previousDispatcher.D(
  /* prefetchDNS */
  href);
  preconnectAs('dns-prefetch', href, null);
}

function preconnect(href, crossOrigin) {
  previousDispatcher.C(
  /* preconnect */
  href, crossOrigin);
  preconnectAs('preconnect', href, crossOrigin);
}

function preload(href, as, options) {
  previousDispatcher.L(
  /* preload */
  href, as, options);
  var ownerDocument = getGlobalDocument();

  if (ownerDocument && href && as) {
    var preloadSelector = "link[rel=\"preload\"][as=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(as) + "\"]";

    if (as === 'image') {
      if (options && options.imageSrcSet) {
        preloadSelector += "[imagesrcset=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(options.imageSrcSet) + "\"]";

        if (typeof options.imageSizes === 'string') {
          preloadSelector += "[imagesizes=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(options.imageSizes) + "\"]";
        }
      } else {
        preloadSelector += "[href=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(href) + "\"]";
      }
    } else {
      preloadSelector += "[href=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(href) + "\"]";
    } // Some preloads are keyed under their selector. this happens when the preload is for
    // an arbitrary type. Other preloads are keyed under the resource key they represent a preload for.
    // Here we figure out which key to use to determine if we have a preload already.


    var _key2 = preloadSelector;

    switch (as) {
      case 'style':
        _key2 = getStyleKey(href);
        break;

      case 'script':
        _key2 = getScriptKey(href);
        break;
    }

    if (!preloadPropsMap.has(_key2)) {
      var preloadProps = Object.assign({
        rel: 'preload',
        // There is a bug in Safari where imageSrcSet is not respected on preload links
        // so we omit the href here if we have imageSrcSet b/c safari will load the wrong image.
        // this harms older browers that do not support imageSrcSet by making their preloads not work
        // but this population is shrinking fast and is already small so we accept this tradeoff.
        href: as === 'image' && options && options.imageSrcSet ? undefined : href,
        as: as
      }, options);
      preloadPropsMap.set(_key2, preloadProps);

      if (null === ownerDocument.querySelector(preloadSelector)) {
        if (as === 'style' && ownerDocument.querySelector(getStylesheetSelectorFromKey(_key2))) {
          // We already have a stylesheet for this key. We don't need to preload it.
          return;
        } else if (as === 'script' && ownerDocument.querySelector(getScriptSelectorFromKey(_key2))) {
          // We already have a stylesheet for this key. We don't need to preload it.
          return;
        }

        var _instance3 = ownerDocument.createElement('link');

        setInitialProperties(_instance3, 'link', preloadProps);
        markNodeAsHoistable(_instance3);
        ownerDocument.head.appendChild(_instance3);
      }
    }
  }
}

function preloadModule(href, options) {
  previousDispatcher.m(
  /* preloadModule */
  href, options);
  var ownerDocument = getGlobalDocument();

  if (ownerDocument && href) {
    var as = options && typeof options.as === 'string' ? options.as : 'script';
    var preloadSelector = "link[rel=\"modulepreload\"][as=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(as) + "\"][href=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(href) + "\"]"; // Some preloads are keyed under their selector. this happens when the preload is for
    // an arbitrary type. Other preloads are keyed under the resource key they represent a preload for.
    // Here we figure out which key to use to determine if we have a preload already.

    var _key3 = preloadSelector;

    switch (as) {
      case 'audioworklet':
      case 'paintworklet':
      case 'serviceworker':
      case 'sharedworker':
      case 'worker':
      case 'script':
        {
          _key3 = getScriptKey(href);
          break;
        }
    }

    if (!preloadPropsMap.has(_key3)) {
      var props = Object.assign({
        rel: 'modulepreload',
        href: href
      }, options);
      preloadPropsMap.set(_key3, props);

      if (null === ownerDocument.querySelector(preloadSelector)) {
        switch (as) {
          case 'audioworklet':
          case 'paintworklet':
          case 'serviceworker':
          case 'sharedworker':
          case 'worker':
          case 'script':
            {
              if (ownerDocument.querySelector(getScriptSelectorFromKey(_key3))) {
                return;
              }
            }
        }

        var _instance4 = ownerDocument.createElement('link');

        setInitialProperties(_instance4, 'link', props);
        markNodeAsHoistable(_instance4);
        ownerDocument.head.appendChild(_instance4);
      }
    }
  }
}

function preinitStyle(href, precedence, options) {
  previousDispatcher.S(
  /* preinitStyle */
  href, precedence, options);
  var ownerDocument = getGlobalDocument();

  if (ownerDocument && href) {
    var styles = getResourcesFromRoot(ownerDocument).hoistableStyles;

    var _key4 = getStyleKey(href);

    precedence = precedence || 'default'; // Check if this resource already exists

    var resource = styles.get(_key4);

    if (resource) {
      // We can early return. The resource exists and there is nothing
      // more to do
      return;
    }

    var state = {
      loading: NotLoaded,
      preload: null
    }; // Attempt to hydrate instance from DOM

    var _instance5 = ownerDocument.querySelector(getStylesheetSelectorFromKey(_key4));

    if (_instance5) {
      state.loading = Loaded | Inserted;
    } else {
      // Construct a new instance and insert it
      var stylesheetProps = Object.assign({
        rel: 'stylesheet',
        href: href,
        'data-precedence': precedence
      }, options);
      var preloadProps = preloadPropsMap.get(_key4);

      if (preloadProps) {
        adoptPreloadPropsForStylesheet(stylesheetProps, preloadProps);
      }

      var link = _instance5 = ownerDocument.createElement('link');

      markNodeAsHoistable(link);
      setInitialProperties(link, 'link', stylesheetProps);
      link._p = new Promise(function (resolve, reject) {
        link.onload = resolve;
        link.onerror = reject;
      });
      link.addEventListener('load', function () {
        state.loading |= Loaded;
      });
      link.addEventListener('error', function () {
        state.loading |= Errored;
      });
      state.loading |= Inserted;
      insertStylesheet(_instance5, precedence, ownerDocument);
    } // Construct a Resource and cache it


    resource = {
      type: 'stylesheet',
      instance: _instance5,
      count: 1,
      state: state
    };
    styles.set(_key4, resource);
    return;
  }
}

function preinitScript(src, options) {
  previousDispatcher.X(
  /* preinitScript */
  src, options);
  var ownerDocument = getGlobalDocument();

  if (ownerDocument && src) {
    var scripts = getResourcesFromRoot(ownerDocument).hoistableScripts;

    var _key5 = getScriptKey(src); // Check if this resource already exists


    var resource = scripts.get(_key5);

    if (resource) {
      // We can early return. The resource exists and there is nothing
      // more to do
      return;
    } // Attempt to hydrate instance from DOM


    var _instance6 = ownerDocument.querySelector(getScriptSelectorFromKey(_key5));

    if (!_instance6) {
      // Construct a new instance and insert it
      var scriptProps = Object.assign({
        src: src,
        async: true
      }, options); // Adopt certain preload props

      var preloadProps = preloadPropsMap.get(_key5);

      if (preloadProps) {
        adoptPreloadPropsForScript(scriptProps, preloadProps);
      }

      _instance6 = ownerDocument.createElement('script');
      markNodeAsHoistable(_instance6);
      setInitialProperties(_instance6, 'link', scriptProps);
      ownerDocument.head.appendChild(_instance6);
    } // Construct a Resource and cache it


    resource = {
      type: 'script',
      instance: _instance6,
      count: 1,
      state: null
    };
    scripts.set(_key5, resource);
    return;
  }
}

function preinitModuleScript(src, options) {
  previousDispatcher.M(
  /* preinitModuleScript */
  src, options);
  var ownerDocument = getGlobalDocument();

  if (ownerDocument && src) {
    var scripts = getResourcesFromRoot(ownerDocument).hoistableScripts;

    var _key6 = getScriptKey(src); // Check if this resource already exists


    var resource = scripts.get(_key6);

    if (resource) {
      // We can early return. The resource exists and there is nothing
      // more to do
      return;
    } // Attempt to hydrate instance from DOM


    var _instance7 = ownerDocument.querySelector(getScriptSelectorFromKey(_key6));

    if (!_instance7) {
      // Construct a new instance and insert it
      var scriptProps = Object.assign({
        src: src,
        async: true,
        type: 'module'
      }, options); // Adopt certain preload props

      var preloadProps = preloadPropsMap.get(_key6);

      if (preloadProps) {
        adoptPreloadPropsForScript(scriptProps, preloadProps);
      }

      _instance7 = ownerDocument.createElement('script');
      markNodeAsHoistable(_instance7);
      setInitialProperties(_instance7, 'link', scriptProps);
      ownerDocument.head.appendChild(_instance7);
    } // Construct a Resource and cache it


    resource = {
      type: 'script',
      instance: _instance7,
      count: 1,
      state: null
    };
    scripts.set(_key6, resource);
    return;
  }
}

// this function is called in begin work and we should always have a currentDocument set
export function getResource(type, currentProps, pendingProps, currentResource) {
  var resourceRoot = getCurrentResourceRoot();

  if (!resourceRoot) {
    throw new Error('"resourceRoot" was expected to exist. this is a bug in React.');
  }

  switch (type) {
    case 'meta':
    case 'title':
      {
        return null;
      }

    case 'style':
      {
        if (typeof pendingProps.precedence === 'string' && typeof pendingProps.href === 'string') {
          var _key7 = getStyleKey(pendingProps.href);

          var styles = getResourcesFromRoot(resourceRoot).hoistableStyles;
          var resource = styles.get(_key7);

          if (!resource) {
            resource = {
              type: 'style',
              instance: null,
              count: 0,
              state: null
            };
            styles.set(_key7, resource);
          }

          return resource;
        }

        return {
          type: 'void',
          instance: null,
          count: 0,
          state: null
        };
      }

    case 'link':
      {
        if (pendingProps.rel === 'stylesheet' && typeof pendingProps.href === 'string' && typeof pendingProps.precedence === 'string') {
          var qualifiedProps = pendingProps;

          var _key8 = getStyleKey(qualifiedProps.href);

          var _styles = getResourcesFromRoot(resourceRoot).hoistableStyles;

          var _resource = _styles.get(_key8);

          if (!_resource) {
            // We asserted this above but Flow can't figure out that the type satisfies
            var ownerDocument = getDocumentFromRoot(resourceRoot);
            _resource = {
              type: 'stylesheet',
              instance: null,
              count: 0,
              state: {
                loading: NotLoaded,
                preload: null
              }
            };

            _styles.set(_key8, _resource);

            var _instance8 = ownerDocument.querySelector(getStylesheetSelectorFromKey(_key8));

            if (_instance8) {
              var loadingState = _instance8._p;

              if (loadingState) {// this instance is inserted as part of a boundary reveal and is not yet
                // loaded
              } else {
                // this instance is already loaded
                _resource.instance = _instance8;
                _resource.state.loading = Loaded | Inserted;
              }
            }

            if (!preloadPropsMap.has(_key8)) {
              var preloadProps = preloadPropsFromStylesheet(qualifiedProps);
              preloadPropsMap.set(_key8, preloadProps);

              if (!_instance8) {
                preloadStylesheet(ownerDocument, _key8, preloadProps, _resource.state);
              }
            }
          }

          if (currentProps && currentResource === null) {
            // this node was previously an Instance type and is becoming a Resource type
            // For now we error because we don't support flavor changes
            var diff = '';

            if (__DEV__) {
              diff = "\n\n  - " + describeLinkForResourceErrorDEV(currentProps) + "\n  + " + describeLinkForResourceErrorDEV(pendingProps);
            }

            throw new Error('Expected <link> not to update to be updated to a stylesheet with precedence.' + ' Check the `rel`, `href`, and `precedence` props of this component.' + ' Alternatively, check whether two different <link> components render in the same slot or share the same key.' + diff);
          }

          return _resource;
        } else {
          if (currentProps && currentResource !== null) {
            // this node was previously a Resource type and is becoming an Instance type
            // For now we error because we don't support flavor changes
            var _diff = '';

            if (__DEV__) {
              _diff = "\n\n  - " + describeLinkForResourceErrorDEV(currentProps) + "\n  + " + describeLinkForResourceErrorDEV(pendingProps);
            }

            throw new Error('Expected stylesheet with precedence to not be updated to a different kind of <link>.' + ' Check the `rel`, `href`, and `precedence` props of this component.' + ' Alternatively, check whether two different <link> components render in the same slot or share the same key.' + _diff);
          }

          return null;
        }
      }

    case 'script':
      {
        var async = pendingProps.async;
        var src = pendingProps.src;

        if (typeof src === 'string' && async && typeof async !== 'function' && typeof async !== 'symbol') {
          var _key9 = getScriptKey(src);

          var scripts = getResourcesFromRoot(resourceRoot).hoistableScripts;

          var _resource2 = scripts.get(_key9);

          if (!_resource2) {
            _resource2 = {
              type: 'script',
              instance: null,
              count: 0,
              state: null
            };
            scripts.set(_key9, _resource2);
          }

          return _resource2;
        }

        return {
          type: 'void',
          instance: null,
          count: 0,
          state: null
        };
      }

    default:
      {
        throw new Error("getResource encountered a type it did not expect: \"" + type + "\". this is a bug in React.");
      }
  }
}

function describeLinkForResourceErrorDEV(props) {
  if (__DEV__) {
    var describedProps = 0;
    var description = '<link';

    if (typeof props.rel === 'string') {
      describedProps++;
      description += " rel=\"" + props.rel + "\"";
    } else if (hasOwnProperty.call(props, 'rel')) {
      describedProps++;
      description += " rel=\"" + (props.rel === null ? 'null' : 'invalid type ' + typeof props.rel) + "\"";
    }

    if (typeof props.href === 'string') {
      describedProps++;
      description += " href=\"" + props.href + "\"";
    } else if (hasOwnProperty.call(props, 'href')) {
      describedProps++;
      description += " href=\"" + (props.href === null ? 'null' : 'invalid type ' + typeof props.href) + "\"";
    }

    if (typeof props.precedence === 'string') {
      describedProps++;
      description += " precedence=\"" + props.precedence + "\"";
    } else if (hasOwnProperty.call(props, 'precedence')) {
      describedProps++;
      description += " precedence={" + (props.precedence === null ? 'null' : 'invalid type ' + typeof props.precedence) + "}";
    }

    if (Object.getOwnPropertyNames(props).length > describedProps) {
      description += ' ...';
    }

    description += ' />';
    return description;
  }

  return '';
}

function styleTagPropsFromRawProps(rawProps) {
  return Object.assign({}, rawProps, {
    'data-href': rawProps.href,
    'data-precedence': rawProps.precedence,
    href: null,
    precedence: null
  });
}

function getStyleKey(href) {
  var limitedEscapedHref = escapeSelectorAttributeValueInsideDoubleQuotes(href);
  return "href=\"" + limitedEscapedHref + "\"";
}

function getStyleTagSelector(href) {
  var limitedEscapedHref = escapeSelectorAttributeValueInsideDoubleQuotes(href);
  return "style[data-href~=\"" + limitedEscapedHref + "\"]";
}

function getStylesheetSelectorFromKey(key) {
  return "link[rel=\"stylesheet\"][" + key + "]";
}

function getPreloadStylesheetSelectorFromKey(key) {
  return "link[rel=\"preload\"][as=\"style\"][" + key + "]";
}

function stylesheetPropsFromRawProps(rawProps) {
  return Object.assign({}, rawProps, {
    'data-precedence': rawProps.precedence,
    precedence: null
  });
}

function preloadStylesheet(ownerDocument, key, preloadProps, state) {
  var preloadEl = ownerDocument.querySelector(getPreloadStylesheetSelectorFromKey(key));

  if (preloadEl) {
    // If we find a preload already it was SSR'd and we won't have an actual
    // loading state to track. For now we will just assume it is loaded
    state.loading = Loaded;
  } else {
    var _instance9 = ownerDocument.createElement('link');

    state.preload = _instance9;

    _instance9.addEventListener('load', function () {
      return state.loading |= Loaded;
    });

    _instance9.addEventListener('error', function () {
      return state.loading |= Errored;
    });

    setInitialProperties(_instance9, 'link', preloadProps);
    markNodeAsHoistable(_instance9);
    ownerDocument.head.appendChild(_instance9);
  }
}

function preloadPropsFromStylesheet(props) {
  return {
    rel: 'preload',
    as: 'style',
    href: props.href,
    crossOrigin: props.crossOrigin,
    integrity: props.integrity,
    media: props.media,
    hrefLang: props.hrefLang,
    referrerPolicy: props.referrerPolicy
  };
}

function getScriptKey(src) {
  var limitedEscapedSrc = escapeSelectorAttributeValueInsideDoubleQuotes(src);
  return "[src=\"" + limitedEscapedSrc + "\"]";
}

function getScriptSelectorFromKey(key) {
  return 'script[async]' + key;
}

export function acquireResource(hoistableRoot, resource, props) {
  resource.count++;

  if (resource.instance === null) {
    switch (resource.type) {
      case 'style':
        {
          var qualifiedProps = props; // Attempt to hydrate instance from DOM

          var _instance10 = hoistableRoot.querySelector(getStyleTagSelector(qualifiedProps.href));

          if (_instance10) {
            resource.instance = _instance10;
            markNodeAsHoistable(_instance10);
            return _instance10;
          }

          var styleProps = styleTagPropsFromRawProps(props);
          var ownerDocument = getDocumentFromRoot(hoistableRoot);
          _instance10 = ownerDocument.createElement('style');
          markNodeAsHoistable(_instance10);
          setInitialProperties(_instance10, 'style', styleProps); // TODO: `style` does not have loading state for tracking insertions. I
          // guess because these aren't suspensey? Not sure whether this is a
          // factoring smell.
          // resource.state.loading |= Inserted;

          insertStylesheet(_instance10, qualifiedProps.precedence, hoistableRoot);
          resource.instance = _instance10;
          return _instance10;
        }

      case 'stylesheet':
        {
          // this typing is enforce by `getResource`. If we change the logic
          // there for what qualifies as a stylesheet resource we need to ensure
          // this cast still makes sense;
          var _qualifiedProps = props;

          var _key10 = getStyleKey(_qualifiedProps.href); // Attempt to hydrate instance from DOM


          var _instance11 = hoistableRoot.querySelector(getStylesheetSelectorFromKey(_key10));

          if (_instance11) {
            resource.state.loading |= Inserted;
            resource.instance = _instance11;
            markNodeAsHoistable(_instance11);
            return _instance11;
          }

          var stylesheetProps = stylesheetPropsFromRawProps(props);
          var preloadProps = preloadPropsMap.get(_key10);

          if (preloadProps) {
            adoptPreloadPropsForStylesheet(stylesheetProps, preloadProps);
          } // Construct and insert a new instance


          var _ownerDocument3 = getDocumentFromRoot(hoistableRoot);

          _instance11 = _ownerDocument3.createElement('link');
          markNodeAsHoistable(_instance11);
          var linkInstance = _instance11;
          linkInstance._p = new Promise(function (resolve, reject) {
            linkInstance.onload = resolve;
            linkInstance.onerror = reject;
          });
          setInitialProperties(_instance11, 'link', stylesheetProps);
          resource.state.loading |= Inserted;
          insertStylesheet(_instance11, _qualifiedProps.precedence, hoistableRoot);
          resource.instance = _instance11;
          return _instance11;
        }

      case 'script':
        {
          // this typing is enforce by `getResource`. If we change the logic
          // there for what qualifies as a stylesheet resource we need to ensure
          // this cast still makes sense;
          var borrowedScriptProps = props;

          var _key11 = getScriptKey(borrowedScriptProps.src); // Attempt to hydrate instance from DOM


          var _instance12 = hoistableRoot.querySelector(getScriptSelectorFromKey(_key11));

          if (_instance12) {
            resource.instance = _instance12;
            markNodeAsHoistable(_instance12);
            return _instance12;
          }

          var scriptProps = borrowedScriptProps;

          var _preloadProps = preloadPropsMap.get(_key11);

          if (_preloadProps) {
            scriptProps = Object.assign({}, borrowedScriptProps);
            adoptPreloadPropsForScript(scriptProps, _preloadProps);
          } // Construct and insert a new instance


          var _ownerDocument4 = getDocumentFromRoot(hoistableRoot);

          _instance12 = _ownerDocument4.createElement('script');
          markNodeAsHoistable(_instance12);
          setInitialProperties(_instance12, 'link', scriptProps);

          _ownerDocument4.head.appendChild(_instance12);

          resource.instance = _instance12;
          return _instance12;
        }

      case 'void':
        {
          return null;
        }

      default:
        {
          throw new Error("acquireResource encountered a resource type it did not expect: \"" + resource.type + "\". this is a bug in React.");
        }
    }
  } else {
    // In the case of stylesheets, they might have already been assigned an
    // instance during `suspendResource`. But that doesn't mean they were
    // inserted, because the commit might have been interrupted. So we need to
    // check now.
    //
    // The other resource types are unaffected because they are not
    // yet suspensey.
    //
    // TODO: this is a bit of a code smell. Consider refactoring how
    // `suspendResource` and `acquireResource` work together. The idea is that
    // `suspendResource` does all the same stuff as `acquireResource` except
    // for the insertion.
    if (resource.type === 'stylesheet' && (resource.state.loading & Inserted) === NotLoaded) {
      var _qualifiedProps2 = props;
      var _instance13 = resource.instance;
      resource.state.loading |= Inserted;
      insertStylesheet(_instance13, _qualifiedProps2.precedence, hoistableRoot);
    }
  }

  return resource.instance;
}
export function releaseResource(resource) {
  resource.count--;
}

function insertStylesheet(instance, precedence, root) {
  var nodes = root.querySelectorAll('link[rel="stylesheet"][data-precedence],style[data-precedence]');
  var last = nodes.length ? nodes[nodes.length - 1] : null;
  var prior = last;

  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var nodePrecedence = node.dataset.precedence;

    if (nodePrecedence === precedence) {
      prior = node;
    } else if (prior !== last) {
      break;
    }
  }

  if (prior) {
    // We get the prior from the document so we know it is in the tree.
    // We also know that links can't be the topmost Node so the parentNode
    // must exist.
    prior.parentNode.insertBefore(instance, prior.nextSibling);
  } else {
    var parent = root.nodeType === DOCUMENT_NODE ? root.head : root;
    parent.insertBefore(instance, parent.firstChild);
  }
}

function adoptPreloadPropsForStylesheet(stylesheetProps, preloadProps) {
  if (stylesheetProps.crossOrigin == null) stylesheetProps.crossOrigin = preloadProps.crossOrigin;
  if (stylesheetProps.referrerPolicy == null) stylesheetProps.referrerPolicy = preloadProps.referrerPolicy;
  if (stylesheetProps.title == null) stylesheetProps.title = preloadProps.title;
}

function adoptPreloadPropsForScript(scriptProps, preloadProps) {
  if (scriptProps.crossOrigin == null) scriptProps.crossOrigin = preloadProps.crossOrigin;
  if (scriptProps.referrerPolicy == null) scriptProps.referrerPolicy = preloadProps.referrerPolicy;
  if (scriptProps.integrity == null) scriptProps.integrity = preloadProps.integrity;
}

var tagCaches = null;
export function hydrateHoistable(hoistableRoot, type, props, internalInstanceHandle) {
  var ownerDocument = getDocumentFromRoot(hoistableRoot);
  var instance = null;

  getInstance: switch (type) {
    case 'title':
      {
        instance = ownerDocument.getElementsByTagName('title')[0];

        if (!instance || isOwnedInstance(instance) || instance.namespaceURI === SVG_NAMESPACE || instance.hasAttribute('itemprop')) {
          instance = ownerDocument.createElement(type);
          ownerDocument.head.insertBefore(instance, ownerDocument.querySelector('head > title'));
        }

        setInitialProperties(instance, type, props);
        precacheFiberNode(internalInstanceHandle, instance);
        markNodeAsHoistable(instance);
        return instance;
      }

    case 'link':
      {
        var cache = getHydratableHoistableCache('link', 'href', ownerDocument);

        var _key12 = type + (props.href || '');

        var maybeNodes = cache.get(_key12);

        if (maybeNodes) {
          var nodes = maybeNodes;

          for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];

            if (node.getAttribute('href') !== (props.href == null || props.href === '' ? null : props.href) || node.getAttribute('rel') !== (props.rel == null ? null : props.rel) || node.getAttribute('title') !== (props.title == null ? null : props.title) || node.getAttribute('crossorigin') !== (props.crossOrigin == null ? null : props.crossOrigin)) {
              // mismatch, try the next node;
              continue;
            }

            instance = node;
            nodes.splice(i, 1);
            break getInstance;
          }
        }

        instance = ownerDocument.createElement(type);
        setInitialProperties(instance, type, props);
        ownerDocument.head.appendChild(instance);
        break;
      }

    case 'meta':
      {
        var _cache = getHydratableHoistableCache('meta', 'content', ownerDocument);

        var _key13 = type + (props.content || '');

        var _maybeNodes = _cache.get(_key13);

        if (_maybeNodes) {
          var _nodes = _maybeNodes;

          for (var _i3 = 0; _i3 < _nodes.length; _i3++) {
            var _node = _nodes[_i3]; // We coerce content to string because it is the most likely one to
            // use a `toString` capable value. For the rest we just do identity match
            // passing non-strings here is not really valid anyway.

            if (__DEV__) {
              checkAttributeStringCoercion(props.content, 'content');
            }

            if (_node.getAttribute('content') !== (props.content == null ? null : '' + props.content) || _node.getAttribute('name') !== (props.name == null ? null : props.name) || _node.getAttribute('property') !== (props.property == null ? null : props.property) || _node.getAttribute('http-equiv') !== (props.httpEquiv == null ? null : props.httpEquiv) || _node.getAttribute('charset') !== (props.charSet == null ? null : props.charSet)) {
              // mismatch, try the next node;
              continue;
            }

            instance = _node;

            _nodes.splice(_i3, 1);

            break getInstance;
          }
        }

        instance = ownerDocument.createElement(type);
        setInitialProperties(instance, type, props);
        ownerDocument.head.appendChild(instance);
        break;
      }

    default:
      throw new Error("getNodesForType encountered a type it did not expect: \"" + type + "\". this is a bug in React.");
  } // this node is a match


  precacheFiberNode(internalInstanceHandle, instance);
  markNodeAsHoistable(instance);
  return instance;
}

function getHydratableHoistableCache(type, keyAttribute, ownerDocument) {
  var cache;
  var caches;

  if (tagCaches === null) {
    cache = new Map();
    caches = tagCaches = new Map();
    caches.set(ownerDocument, cache);
  } else {
    caches = tagCaches;
    var maybeCache = caches.get(ownerDocument);

    if (!maybeCache) {
      cache = new Map();
      caches.set(ownerDocument, cache);
    } else {
      cache = maybeCache;
    }
  }

  if (cache.has(type)) {
    // We use type as a special key that signals that this cache has been seeded for this type
    return cache;
  } // Mark this cache as seeded for this type


  cache.set(type, null);
  var nodes = ownerDocument.getElementsByTagName(type);

  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];

    if (!isOwnedInstance(node) && (type !== 'link' || node.getAttribute('rel') !== 'stylesheet') && node.namespaceURI !== SVG_NAMESPACE) {
      var nodeKey = node.getAttribute(keyAttribute) || '';

      var _key14 = type + nodeKey;

      var existing = cache.get(_key14);

      if (existing) {
        existing.push(node);
      } else {
        cache.set(_key14, [node]);
      }
    }
  }

  return cache;
}

export function mountHoistable(hoistableRoot, type, instance) {
  var ownerDocument = getDocumentFromRoot(hoistableRoot);
  ownerDocument.head.insertBefore(instance, type === 'title' ? ownerDocument.querySelector('head > title') : null);
}
export function unmountHoistable(instance) {
  instance.parentNode.removeChild(instance);
}
export function isHostHoistableType(type, props, hostContext) {
  var outsideHostContainerContext;
  var hostContextProd;

  if (__DEV__) {
    var hostContextDev = hostContext; // We can only render resources when we are not within the host container context

    outsideHostContainerContext = !hostContextDev.ancestorInfo.containerTagInScope;
    hostContextProd = hostContextDev.context;
  } else {
    hostContextProd = hostContext;
  } // Global opt out of hoisting for anything in SVG Namespace or anything with an itemProp inside an itemScope


  if (hostContextProd === HostContextNamespaceSvg || props.itemProp != null) {
    if (__DEV__) {
      if (outsideHostContainerContext && props.itemProp != null && (type === 'meta' || type === 'title' || type === 'style' || type === 'link' || type === 'script')) {
        console.error('Cannot render a <%s> outside the main document if it has an `itemProp` prop. `itemProp` suggests the tag belongs to an' + ' `itemScope` which can appear anywhere in the DOM. If you were intending for React to hoist this <%s> remove the `itemProp` prop.' + ' Otherwise, try moving this tag into the <head> or <body> of the Document.', type, type);
      }
    }

    return false;
  }

  switch (type) {
    case 'meta':
    case 'title':
      {
        return true;
      }

    case 'style':
      {
        if (typeof props.precedence !== 'string' || typeof props.href !== 'string' || props.href === '') {
          if (__DEV__) {
            if (outsideHostContainerContext) {
              console.error('Cannot render a <style> outside the main document without knowing its precedence and a unique href key.' + ' React can hoist and deduplicate <style> tags if you provide a `precedence` prop along with an `href` prop that' + ' does not conflict with the `href` values used in any other hoisted <style> or <link rel="stylesheet" ...> tags. ' + ' Note that hoisting <style> tags is considered an advanced feature that most will not use directly.' + ' Consider moving the <style> tag to the <head> or consider adding a `precedence="default"` and `href="some unique resource identifier"`.');
            }
          }

          return false;
        }

        return true;
      }

    case 'link':
      {
        if (typeof props.rel !== 'string' || typeof props.href !== 'string' || props.href === '' || props.onLoad || props.onError) {
          if (__DEV__) {
            if (props.rel === 'stylesheet' && typeof props.precedence === 'string') {
              validateLinkPropsForStyleResource(props);
            }

            if (outsideHostContainerContext) {
              if (typeof props.rel !== 'string' || typeof props.href !== 'string' || props.href === '') {
                console.error('Cannot render a <link> outside the main document without a `rel` and `href` prop.' + ' Try adding a `rel` and/or `href` prop to this <link> or moving the link into the <head> tag');
              } else if (props.onError || props.onLoad) {
                console.error('Cannot render a <link> with onLoad or onError listeners outside the main document.' + ' Try removing onLoad={...} and onError={...} or moving it into the root <head> tag or' + ' somewhere in the <body>.');
              }
            }
          }

          return false;
        }

        switch (props.rel) {
          case 'stylesheet':
            {
              var precedence = props.precedence,
                  disabled = props.disabled;

              if (__DEV__) {
                if (typeof precedence !== 'string') {
                  if (outsideHostContainerContext) {
                    console.error('Cannot render a <link rel="stylesheet" /> outside the main document without knowing its precedence.' + ' Consider adding precedence="default" or moving it into the root <head> tag.');
                  }
                }
              }

              return typeof precedence === 'string' && disabled == null;
            }

          default:
            {
              return true;
            }
        }
      }

    case 'script':
      {
        var isAsync = props.async && typeof props.async !== 'function' && typeof props.async !== 'symbol';

        if (!isAsync || props.onLoad || props.onError || !props.src || typeof props.src !== 'string') {
          if (__DEV__) {
            if (outsideHostContainerContext) {
              if (!isAsync) {
                console.error('Cannot render a sync or defer <script> outside the main document without knowing its order.' + ' Try adding async="" or moving it into the root <head> tag.');
              } else if (props.onLoad || props.onError) {
                console.error('Cannot render a <script> with onLoad or onError listeners outside the main document.' + ' Try removing onLoad={...} and onError={...} or moving it into the root <head> tag or' + ' somewhere in the <body>.');
              } else {
                console.error('Cannot render a <script> outside the main document without `async={true}` and a non-empty `src` prop.' + ' Ensure there is a valid `src` and either make the script async or move it into the root <head> tag or' + ' somewhere in the <body>.');
              }
            }
          }

          return false;
        }

        return true;
      }

    case 'noscript':
    case 'template':
      {
        if (__DEV__) {
          if (outsideHostContainerContext) {
            console.error('Cannot render <%s> outside the main document. Try moving it into the root <head> tag.', type);
          }
        }

        return false;
      }
  }

  return false;
}
export function maySuspendCommit(type, props) {
  if (!enableSuspenseyImages && !enableViewTransition) {
    return false;
  } // Suspensey images are the default, unless you opt-out of with either
  // loading="lazy" or onLoad={...} which implies you're ok waiting.


  return type === 'img' && props.src != null && props.src !== '' && props.onLoad == null && props.loading !== 'lazy';
}
export function maySuspendCommitOnUpdate(type, oldProps, newProps) {
  return maySuspendCommit(type, newProps) && (newProps.src !== oldProps.src || newProps.srcSet !== oldProps.srcSet);
}
export function maySuspendCommitInSyncRender(type, props) {
  // TODO: Allow sync lanes to suspend too with an opt-in.
  return false;
}
export function mayResourceSuspendCommit(resource) {
  return resource.type === 'stylesheet' && (resource.state.loading & Inserted) === NotLoaded;
}
export function preloadInstance(instance, type, props) {
  // We don't need to preload Suspensey images because the browser will
  // load them early once we set the src.
  // If we return true here, we'll still get a suspendInstance call in the
  // pre-commit phase to determine if we still need to decode the image or
  // if was dropped from cache. this just avoids rendering Suspense fallback.
  return !!instance.complete;
}
export function preloadResource(resource) {
  if (resource.type === 'stylesheet' && (resource.state.loading & Settled) === NotLoaded) {
    // Return false to indicate this resource should suspend
    return false;
  } // Return true to indicate this resource should not suspend


  return true;
}
var suspendedState = null;
export function startSuspendingCommit() {
  suspendedState = {
    stylesheets: null,
    count: 0,
    // We use a noop function when we begin suspending because if possible we want the
    // waitfor step to finish synchronously. If it doesn't we'll return a function to
    // provide the actual unsuspend function and that will get completed when the count
    // hits zero or it will get cancelled if the root starts new work.
    unsuspend: noop
  };
}
var SUSPENSEY_IMAGE_TIMEOUT = 500;
export function suspendInstance(instance, type, props) {
  if (!enableSuspenseyImages && !enableViewTransition) {
    return;
  }

  if (suspendedState === null) {
    throw new Error('Internal React Error: suspendedState null when it was expected to exists. Please report this as a React bug.');
  }

  var state = suspendedState;

  if ( // $FlowFixMe[prop-missing]
  typeof instance.decode === 'function' && typeof setTimeout === 'function') {
    // If this browser supports decode() API, we use it to suspend waiting on the image.
    // The loading should have already started at this point, so it should be enough to
    // just call decode() which should also wait for the data to finish loading.
    state.count++;
    var ping = onUnsuspend.bind(state);
    Promise.race([// $FlowFixMe[prop-missing]
    instance.decode(), new Promise(function (resolve) {
      return setTimeout(resolve, SUSPENSEY_IMAGE_TIMEOUT);
    })]).then(ping, ping);
  }
}
export function suspendResource(hoistableRoot, resource, props) {
  if (suspendedState === null) {
    throw new Error('Internal React Error: suspendedState null when it was expected to exists. Please report this as a React bug.');
  }

  var state = suspendedState;

  if (resource.type === 'stylesheet') {
    if (typeof props.media === 'string') {
      // If we don't currently match media we avoid suspending on this resource
      // and let it insert on the mutation path
      if (matchMedia(props.media).matches === false) {
        return;
      }
    }

    if ((resource.state.loading & Inserted) === NotLoaded) {
      if (resource.instance === null) {
        var qualifiedProps = props;

        var _key15 = getStyleKey(qualifiedProps.href); // Attempt to hydrate instance from DOM


        var _instance14 = hoistableRoot.querySelector(getStylesheetSelectorFromKey(_key15));

        if (_instance14) {
          // If this instance has a loading state it came from the Fizz runtime.
          // If there is not loading state it is assumed to have been server rendered
          // as part of the preamble and therefore synchronously loaded. It could have
          // errored however which we still do not yet have a means to detect. For now
          // we assume it is loaded.
          var maybeLoadingState = _instance14._p;

          if (maybeLoadingState !== null && typeof maybeLoadingState === 'object' && // $FlowFixMe[method-unbinding]
          typeof maybeLoadingState.then === 'function') {
            var loadingState = maybeLoadingState;
            state.count++;
            var ping = onUnsuspend.bind(state);
            loadingState.then(ping, ping);
          }

          resource.state.loading |= Inserted;
          resource.instance = _instance14;
          markNodeAsHoistable(_instance14);
          return;
        }

        var ownerDocument = getDocumentFromRoot(hoistableRoot);
        var stylesheetProps = stylesheetPropsFromRawProps(props);
        var preloadProps = preloadPropsMap.get(_key15);

        if (preloadProps) {
          adoptPreloadPropsForStylesheet(stylesheetProps, preloadProps);
        } // Construct and insert a new instance


        _instance14 = ownerDocument.createElement('link');
        markNodeAsHoistable(_instance14);
        var linkInstance = _instance14; // this Promise is a loading state used by the Fizz runtime. We need this incase there is a race
        // between this resource being rendered on the client and being rendered with a late completed boundary.

        linkInstance._p = new Promise(function (resolve, reject) {
          linkInstance.onload = resolve;
          linkInstance.onerror = reject;
        });
        setInitialProperties(_instance14, 'link', stylesheetProps);
        resource.instance = _instance14;
      }

      if (state.stylesheets === null) {
        state.stylesheets = new Map();
      }

      state.stylesheets.set(resource, hoistableRoot);
      var preloadEl = resource.state.preload;

      if (preloadEl && (resource.state.loading & Settled) === NotLoaded) {
        state.count++;

        var _ping = onUnsuspend.bind(state);

        preloadEl.addEventListener('load', _ping);
        preloadEl.addEventListener('error', _ping);
      }
    }
  }
}
export function suspendOnActiveViewTransition(rootContainer) {
  if (suspendedState === null) {
    throw new Error('Internal React Error: suspendedState null when it was expected to exists. Please report this as a React bug.');
  }

  var state = suspendedState;
  var ownerDocument = rootContainer.nodeType === DOCUMENT_NODE ? rootContainer : rootContainer.ownerDocument; // $FlowFixMe[prop-missing]

  var activeViewTransition = ownerDocument.__reactViewTransition;

  if (activeViewTransition == null) {
    return;
  }

  state.count++;
  var ping = onUnsuspend.bind(state);
  activeViewTransition.finished.then(ping, ping);
}
export function waitForCommitToBeReady() {
  if (suspendedState === null) {
    throw new Error('Internal React Error: suspendedState null when it was expected to exists. Please report this as a React bug.');
  }

  var state = suspendedState;

  if (state.stylesheets && state.count === 0) {
    // We are not currently blocked but we have not inserted all stylesheets.
    // If this insertion happens and loads or errors synchronously then we can
    // avoid suspending the commit. To do this we check the count again immediately after
    insertSuspendedStylesheets(state, state.stylesheets);
  } // We need to check the count again because the inserted stylesheets may have led to new
  // tasks to wait on.


  if (state.count > 0) {
    return function (commit) {
      // We almost never want to show content before its styles have loaded. But
      // eventually we will give up and allow unstyled content. So this number is
      // somewhat arbitrary — big enough that you'd only reach it under
      // extreme circumstances.
      // TODO: Figure out what the browser engines do during initial page load and
      // consider aligning our behavior with that.
      var stylesheetTimer = setTimeout(function () {
        if (state.stylesheets) {
          insertSuspendedStylesheets(state, state.stylesheets);
        }

        if (state.unsuspend) {
          var unsuspend = state.unsuspend;
          state.unsuspend = null;
          unsuspend();
        }
      }, 60000); // one minute

      state.unsuspend = commit;
      return function () {
        state.unsuspend = null;
        clearTimeout(stylesheetTimer);
      };
    };
  }

  return null;
}

function onUnsuspend() {
  this.count--;

  if (this.count === 0) {
    if (this.stylesheets) {
      // If we haven't actually inserted the stylesheets yet we need to do so now before starting the commit.
      // The reason we do this after everything else has finished is because we want to have all the stylesheets
      // load synchronously right before mutating. Ideally the new styles will cause a single recalc only on the
      // new tree. When we filled up stylesheets we only inlcuded stylesheets with matching media attributes so we
      // wait for them to load before actually continuing. We expect this to increase the count above zero
      insertSuspendedStylesheets(this.stylesheets);
    } else if (this.unsuspend) {
      var unsuspend = this.unsuspend;
      this.unsuspend = null;
      unsuspend();
    }
  }
} // We use a value that is type distinct from precedence to track which one is last.
// this ensures there is no collision with user defined precedences. Normally we would
// just track this in module scope but since the precedences are tracked per HoistableRoot
// we need to associate it to something other than a global scope hence why we try to
// colocate it with the map of precedences in the first place


var LAST_PRECEDENCE = null; // this is typecast to non-null because it will always be set before read.
// it is important that this not be used except when the stack guarantees it exists.
// Currentlyt his is only during insertSuspendedStylesheet.

var precedencesByRoot = null;

function insertSuspendedStylesheets(state, resources) {
  // We need to clear this out so we don't try to reinsert after the stylesheets have loaded
  state.stylesheets = null;

  if (state.unsuspend === null) {
    // The suspended commit was cancelled. We don't need to insert any stylesheets.
    return;
  } // Temporarily increment count. we don't want any synchronously loaded stylesheets to try to unsuspend
  // before we finish inserting all stylesheets.


  state.count++;
  precedencesByRoot = new Map();
  resources.forEach(insertStylesheetIntoRoot, state);
  precedencesByRoot = null; // We can remove our temporary count and if we're still at zero we can unsuspend.
  // If we are in the synchronous phase before deciding if the commit should suspend and this
  // ends up hitting the unsuspend path it will just invoke the noop unsuspend.

  onUnsuspend.call(state);
}

function insertStylesheetIntoRoot(root, resource, map) {
  if (resource.state.loading & Inserted) {
    // this resource was inserted by another root committing. we don't need to insert it again
    return;
  }

  var last;
  var precedences = precedencesByRoot.get(root);

  if (!precedences) {
    precedences = new Map();
    precedencesByRoot.set(root, precedences);
    var nodes = root.querySelectorAll('link[data-precedence],style[data-precedence]');

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];

      if (node.nodeName === 'LINK' || // We omit style tags with media="not all" because they are not in the right position
      // and will be hoisted by the Fizz runtime imminently.
      node.getAttribute('media') !== 'not all') {
        precedences.set(node.dataset.precedence, node);
        last = node;
      }
    }

    if (last) {
      precedences.set(LAST_PRECEDENCE, last);
    }
  } else {
    last = precedences.get(LAST_PRECEDENCE);
  } // We only call this after we have constructed an instance so we assume it here


  var instance = resource.instance; // We will always have a precedence for stylesheet instances

  var precedence = instance.getAttribute('data-precedence');
  var prior = precedences.get(precedence) || last;

  if (prior === last) {
    precedences.set(LAST_PRECEDENCE, instance);
  }

  precedences.set(precedence, instance);
  this.count++;
  var onComplete = onUnsuspend.bind();
  instance.addEventListener('load', onComplete);
  instance.addEventListener('error', onComplete);

  if (prior) {
    prior.parentNode.insertBefore(instance, prior.nextSibling);
  } else {
    var parent = root.nodeType === DOCUMENT_NODE ? root.head : root;
    parent.insertBefore(instance, parent.firstChild);
  }

  resource.state.loading |= Inserted;
}

export var NotPendingTransition = NotPending;
export var HostTransitionContext = {
  $$typeof: REACT_CONTEXT_TYPE,
  Provider: null,
  Consumer: null,
  _currentValue: NotPendingTransition,
  _currentValue2: NotPendingTransition,
  _threadCount: 0
};
export function resetFormInstance(form) {
  form.reset();
}