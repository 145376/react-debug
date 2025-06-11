/* eslint-disable dot-notation */
// Shared implementation and constants between the inline script and external
// runtime instruction sets.
var ELEMENT_NODE = 1;
var COMMENT_NODE = 8;
var ACTIVITY_START_DATA = '&';
var ACTIVITY_END_DATA = '/&';
var SUSPENSE_START_DATA = '$';
var SUSPENSE_END_DATA = '/$';
var SUSPENSE_PENDING_START_DATA = '$?';
var SUSPENSE_QUEUED_START_DATA = '$~';
var SUSPENSE_FALLBACK_START_DATA = '$!';
var SUSPENSEY_FONT_TIMEOUT = 500; // TODO: Symbols that are referenced outside this module use dynamic accessor
// notation instead of dot notation to prevent Closure's advanced compilation
// mode from renaming. We could use extern files instead, but I couldn't get it
// working. Closure converts it to a dot access anyway, though, so it's not an
// urgent issue.

export function revealCompletedBoundaries(batch) {
  window['$RT'] = performance.now();

  for (var i = 0; i < batch.length; i += 2) {
    var suspenseIdNode = batch[i];
    var contentNode = batch[i + 1]; // Clear all the existing children. This is complicated because
    // there can be embedded Suspense boundaries in the fallback.
    // This is similar to clearSuspenseBoundary in ReactFiberConfigDOM.
    // TODO: We could avoid this if we never emitted suspense boundaries in fallback trees.
    // They never hydrate anyway. However, currently we support incrementally loading the fallback.

    var parentInstance = suspenseIdNode.parentNode;

    if (!parentInstance) {
      // We may have client-rendered this boundary already. Skip it.
      continue;
    } // Find the boundary around the fallback. This is always the previous node.


    var suspenseNode = suspenseIdNode.previousSibling;
    var node = suspenseIdNode;
    var depth = 0;

    do {
      if (node && node.nodeType === COMMENT_NODE) {
        var data = node.data;

        if (data === SUSPENSE_END_DATA || data === ACTIVITY_END_DATA) {
          if (depth === 0) {
            break;
          } else {
            depth--;
          }
        } else if (data === SUSPENSE_START_DATA || data === SUSPENSE_PENDING_START_DATA || data === SUSPENSE_QUEUED_START_DATA || data === SUSPENSE_FALLBACK_START_DATA || data === ACTIVITY_START_DATA) {
          depth++;
        }
      }

      var nextNode = node.nextSibling;
      parentInstance.removeChild(node);
      node = nextNode;
    } while (node);

    var endOfBoundary = node; // Insert all the children from the contentNode between the start and end of suspense boundary.

    while (contentNode.firstChild) {
      parentInstance.insertBefore(contentNode.firstChild, endOfBoundary);
    }

    suspenseNode.data = SUSPENSE_START_DATA;

    if (suspenseNode['_reactRetry']) {
      suspenseNode['_reactRetry']();
    }
  }

  batch.length = 0;
}
export function revealCompletedBoundariesWithViewTransitions(revealBoundaries, batch) {
  var shouldStartViewTransition = false;
  var autoNameIdx = 0;
  var restoreQueue = [];

  function applyViewTransitionName(element, classAttributeName) {
    var className = element.getAttribute(classAttributeName);

    if (!className) {
      return;
    } // Add any elements we apply a name to a queue to be reverted when we start.


    var elementStyle = element.style;
    restoreQueue.push(element, elementStyle['viewTransitionName'], elementStyle['viewTransitionClass']);

    if (className !== 'auto') {
      elementStyle['viewTransitionClass'] = className;
    }

    var name = element.getAttribute('vt-name');

    if (!name) {
      // Auto-generate a name for this one.
      // TODO: We don't have a prefix to pick from here but maybe we don't need it
      // since it's only applicable temporarily during this specific animation.
      var idPrefix = '';
      name = "\xAB" + idPrefix + 'T' + autoNameIdx++ + "\xBB";
    }

    elementStyle['viewTransitionName'] = name;
    shouldStartViewTransition = true;
  }

  try {
    var existingTransition = document['__reactViewTransition'];

    if (existingTransition) {
      // Retry after the previous ViewTransition finishes.
      existingTransition.finished.finally(window['$RV'].bind(null, batch));
      return;
    } // First collect all entering names that might form pairs exiting names.


    var appearingViewTransitions = new Map();

    for (var i = 1; i < batch.length; i += 2) {
      var contentNode = batch[i];
      var appearingElements = contentNode.querySelectorAll('[vt-share]');

      for (var j = 0; j < appearingElements.length; j++) {
        var appearingElement = appearingElements[j];
        appearingViewTransitions.set(appearingElement.getAttribute('vt-name'), appearingElement);
      }
    } // Next we'll find the nodes that we're going to animate and apply names to them..


    for (var _i = 0; _i < batch.length; _i += 2) {
      var suspenseIdNode = batch[_i];
      var parentInstance = suspenseIdNode.parentNode;

      if (!parentInstance) {
        // We may have client-rendered this boundary already. Skip it.
        continue;
      }

      var parentRect = parentInstance.getBoundingClientRect();

      if (!parentRect.left && !parentRect.top && !parentRect.width && !parentRect.height) {
        // If the parent instance is display: none then we don't animate this boundary.
        // This can happen when this boundary is actually a child of a different boundary that
        // isn't yet revealed or is about to be revealed, but in that case that boundary
        // should do the exit/enter and not this one. Conveniently this also lets us skip
        // this if it's just in a hidden tree in general.
        // TODO: Should we skip it if it's out of viewport? It's possible that it gets
        // brought into the viewport by changing size.
        // TODO: There's a another case where an inner boundary is inside a fallback that
        // is about to be deleted. In that case we should not run exit animations on the inner.
        continue;
      } // Apply exit animations to the immediate elements inside the fallback.


      var node = suspenseIdNode;
      var depth = 0;

      while (node) {
        if (node.nodeType === COMMENT_NODE) {
          var data = node.data;

          if (data === SUSPENSE_END_DATA) {
            if (depth === 0) {
              break;
            } else {
              depth--;
            }
          } else if (data === SUSPENSE_START_DATA || data === SUSPENSE_PENDING_START_DATA || data === SUSPENSE_QUEUED_START_DATA || data === SUSPENSE_FALLBACK_START_DATA) {
            depth++;
          }
        } else if (node.nodeType === ELEMENT_NODE) {
          var exitElement = node;
          var exitName = exitElement.getAttribute('vt-name');
          var pairedElement = appearingViewTransitions.get(exitName);
          applyViewTransitionName(exitElement, pairedElement ? 'vt-share' : 'vt-exit');

          if (pairedElement) {
            // Activate the other side as well.
            applyViewTransitionName(pairedElement, 'vt-share');
            appearingViewTransitions.set(exitName, null); // mark claimed
          } // Next we'll look inside this element for pairs to trigger "share".


          var disappearingElements = exitElement.querySelectorAll('[vt-share]');

          for (var _j = 0; _j < disappearingElements.length; _j++) {
            var disappearingElement = disappearingElements[_j];
            var name = disappearingElement.getAttribute('vt-name');

            var _appearingElement = appearingViewTransitions.get(name);

            if (_appearingElement) {
              applyViewTransitionName(disappearingElement, 'vt-share');
              applyViewTransitionName(_appearingElement, 'vt-share');
              appearingViewTransitions.set(name, null); // mark claimed
            }
          }
        }

        node = node.nextSibling;
      } // Apply enter animations to the new nodes about to be inserted.


      var _contentNode = batch[_i + 1];
      var enterElement = _contentNode.firstElementChild;

      while (enterElement) {
        var paired = appearingViewTransitions.get(enterElement.getAttribute('vt-name')) === null;

        if (!paired) {
          applyViewTransitionName(enterElement, 'vt-enter');
        }

        enterElement = enterElement.nextElementSibling;
      } // Apply update animations to any parents and siblings that might be affected.


      var ancestorElement = parentInstance;

      do {
        var childElement = ancestorElement.firstElementChild;

        while (childElement) {
          // TODO: Bail out if we can
          var updateClassName = childElement.getAttribute('vt-update');

          if (updateClassName && updateClassName !== 'none' && !restoreQueue.includes(childElement)) {
            // If we have already handled this element as part of another exit/enter/share, don't override.
            applyViewTransitionName(childElement, 'vt-update');
          }

          childElement = childElement.nextElementSibling;
        }
      } while ((ancestorElement = ancestorElement.parentNode) && ancestorElement.nodeType === ELEMENT_NODE && ancestorElement.getAttribute('vt-update') !== 'none');
    }

    if (shouldStartViewTransition) {
      var transition = document['__reactViewTransition'] = document['startViewTransition']({
        update: function () {
          revealBoundaries(batch, // Force layout to trigger font loading, we pass the actual value to trick minifiers.
          document.documentElement.clientHeight);
          return Promise.race([// Block on fonts finishing loading before revealing these boundaries.
          document.fonts.ready, new Promise(function (resolve) {
            return setTimeout(resolve, SUSPENSEY_FONT_TIMEOUT);
          })]);
        },
        types: [] // TODO: Add a hard coded type for Suspense reveals.

      });
      transition.ready.finally(function () {
        // Restore all the names/classes that we applied to what they were before.
        // We do it in reverse order in case there were duplicates so the first one wins.
        for (var _i2 = restoreQueue.length - 3; _i2 >= 0; _i2 -= 3) {
          var element = restoreQueue[_i2];
          var elementStyle = element.style;
          var previousName = restoreQueue[_i2 + 1];
          elementStyle['viewTransitionName'] = previousName;
          var previousClassName = restoreQueue[_i2 + 1];
          elementStyle['viewTransitionClass'] = previousClassName;

          if (element.getAttribute('style') === '') {
            element.removeAttribute('style');
          }
        }
      });
      transition.finished.finally(function () {
        if (document['__reactViewTransition'] === transition) {
          document['__reactViewTransition'] = null;
        }
      }); // Queue any future completions into its own batch since they won't have been
      // snapshotted by this one.

      window['$RB'] = [];
      return;
    } // Fall through to reveal.

  } catch (x) {// Fall through to reveal.
  } // ViewTransitions v2 not supported or no ViewTransitions found. Reveal immediately.


  revealBoundaries(batch);
}
export function clientRenderBoundary(suspenseBoundaryID, errorDigest, errorMsg, errorStack, errorComponentStack) {
  // Find the fallback's first element.
  var suspenseIdNode = document.getElementById(suspenseBoundaryID);

  if (!suspenseIdNode) {
    // The user must have already navigated away from this tree.
    // E.g. because the parent was hydrated.
    return;
  } // Find the boundary around the fallback. This is always the previous node.


  var suspenseNode = suspenseIdNode.previousSibling; // Tag it to be client rendered.

  suspenseNode.data = SUSPENSE_FALLBACK_START_DATA; // assign error metadata to first sibling

  var dataset = suspenseIdNode.dataset;
  if (errorDigest) dataset['dgst'] = errorDigest;
  if (errorMsg) dataset['msg'] = errorMsg;
  if (errorStack) dataset['stck'] = errorStack;
  if (errorComponentStack) dataset['cstck'] = errorComponentStack; // Tell React to retry it if the parent already hydrated.

  if (suspenseNode['_reactRetry']) {
    suspenseNode['_reactRetry']();
  }
}
var FALLBACK_THROTTLE_MS = 300;
export function completeBoundary(suspenseBoundaryID, contentID) {
  var contentNodeOuter = document.getElementById(contentID);

  if (!contentNodeOuter) {
    // If the client has failed hydration we may have already deleted the streaming
    // segments. The server may also have emitted a complete instruction but cancelled
    // the segment. Regardless we can ignore this case.
    return;
  } // We'll detach the content node so that regardless of what happens next we don't leave in the tree.
  // This might also help by not causing recalcing each time we move a child from here to the target.


  contentNodeOuter.parentNode.removeChild(contentNodeOuter); // Find the fallback's first element.

  var suspenseIdNodeOuter = document.getElementById(suspenseBoundaryID);

  if (!suspenseIdNodeOuter) {
    // The user must have already navigated away from this tree.
    // E.g. because the parent was hydrated. That's fine there's nothing to do
    // but we have to make sure that we already deleted the container node.
    return;
  } // Mark this Suspense boundary as queued so we know not to client render it
  // at the end of document load.


  var suspenseNodeOuter = suspenseIdNodeOuter.previousSibling;
  suspenseNodeOuter.data = SUSPENSE_QUEUED_START_DATA; // Queue this boundary for the next batch

  window['$RB'].push(suspenseIdNodeOuter, contentNodeOuter);

  if (window['$RB'].length === 2) {
    // This is the first time we've pushed to the batch. We need to schedule a callback
    // to flush the batch. This is delayed by the throttle heuristic.
    var globalMostRecentFallbackTime = typeof window['$RT'] !== 'number' ? 0 : window['$RT'];
    var msUntilTimeout = globalMostRecentFallbackTime + FALLBACK_THROTTLE_MS - performance.now(); // We always schedule the flush in a timer even if it's very low or negative to allow
    // for multiple completeBoundary calls that are already queued to have a chance to
    // make the batch.

    setTimeout(window['$RV'].bind(null, window['$RB']), msUntilTimeout);
  }
}
export function completeBoundaryWithStyles(suspenseBoundaryID, contentID, stylesheetDescriptors) {
  var precedences = new Map();
  var thisDocument = document;
  var lastResource, node; // Seed the precedence list with existing resources and collect hoistable style tags

  var nodes = thisDocument.querySelectorAll('link[data-precedence],style[data-precedence]');
  var styleTagsToHoist = [];

  for (var _i3 = 0; node = nodes[_i3++];) {
    if (node.getAttribute('media') === 'not all') {
      styleTagsToHoist.push(node);
    } else {
      if (node.tagName === 'LINK') {
        window['$RM'].set(node.getAttribute('href'), node);
      }

      precedences.set(node.dataset['precedence'], lastResource = node);
    }
  }

  var i = 0;
  var dependencies = [];
  var href, precedence, attr, loadingState, resourceEl, media;

  function cleanupWith(cb) {
    this['_p'] = null;
    cb();
  } // Sheets Mode


  var sheetMode = true;

  while (true) {
    if (sheetMode) {
      // Sheet Mode iterates over the stylesheet arguments and constructs them if new or checks them for
      // dependency if they already existed
      var stylesheetDescriptor = stylesheetDescriptors[i++];

      if (!stylesheetDescriptor) {
        // enter <style> Mode
        sheetMode = false;
        i = 0;
        continue;
      }

      var avoidInsert = false;
      var j = 0;
      href = stylesheetDescriptor[j++];

      if (resourceEl = window['$RM'].get(href)) {
        // We have an already inserted stylesheet.
        loadingState = resourceEl['_p'];
        avoidInsert = true;
      } else {
        // We haven't already processed this href so we need to construct a stylesheet and hoist it
        // We construct it here and attach a loadingState. We also check whether it matches
        // media before we include it in the dependency array.
        resourceEl = thisDocument.createElement('link');
        resourceEl.href = href;
        resourceEl.rel = 'stylesheet';
        resourceEl.dataset['precedence'] = precedence = stylesheetDescriptor[j++];

        while (attr = stylesheetDescriptor[j++]) {
          resourceEl.setAttribute(attr, stylesheetDescriptor[j++]);
        }

        loadingState = resourceEl['_p'] = new Promise(function (resolve, reject) {
          resourceEl.onload = cleanupWith.bind(resourceEl, resolve);
          resourceEl.onerror = cleanupWith.bind(resourceEl, reject);
        }); // Save this resource element so we can bailout if it is used again

        window['$RM'].set(href, resourceEl);
      }

      media = resourceEl.getAttribute('media');

      if (loadingState && (!media || window['matchMedia'](media).matches)) {
        dependencies.push(loadingState);
      }

      if (avoidInsert) {
        // We have a link that is already in the document. We don't want to fall through to the insert path
        continue;
      }
    } else {
      // <style> mode iterates over not-yet-hoisted <style> tags with data-precedence and hoists them.
      resourceEl = styleTagsToHoist[i++];

      if (!resourceEl) {
        // we are done with all style tags
        break;
      }

      precedence = resourceEl.getAttribute('data-precedence');
      resourceEl.removeAttribute('media');
    } // resourceEl is either a newly constructed <link rel="stylesheet" ...> or a <style> tag requiring hoisting


    var prior = precedences.get(precedence) || lastResource;

    if (prior === lastResource) {
      lastResource = resourceEl;
    }

    precedences.set(precedence, resourceEl); // Finally, we insert the newly constructed instance at an appropriate location
    // in the Document.

    if (prior) {
      prior.parentNode.insertBefore(resourceEl, prior.nextSibling);
    } else {
      var head = thisDocument.head;
      head.insertBefore(resourceEl, head.firstChild);
    }
  }

  var suspenseIdNodeOuter = document.getElementById(suspenseBoundaryID);

  if (suspenseIdNodeOuter) {
    // Mark this Suspense boundary as queued so we know not to client render it
    // at the end of document load.
    var suspenseNodeOuter = suspenseIdNodeOuter.previousSibling;
    suspenseNodeOuter.data = SUSPENSE_QUEUED_START_DATA;
  }

  Promise.all(dependencies).then(window['$RC'].bind(null, suspenseBoundaryID, contentID), window['$RX'].bind(null, suspenseBoundaryID, 'CSS failed to load'));
}
export function completeSegment(containerID, placeholderID) {
  var segmentContainer = document.getElementById(containerID);
  var placeholderNode = document.getElementById(placeholderID); // We always expect both nodes to exist here because, while we might
  // have navigated away from the main tree, we still expect the detached
  // tree to exist.

  segmentContainer.parentNode.removeChild(segmentContainer);

  while (segmentContainer.firstChild) {
    placeholderNode.parentNode.insertBefore(segmentContainer.firstChild, placeholderNode);
  }

  placeholderNode.parentNode.removeChild(placeholderNode);
} // This is the exact URL string we expect that Fizz renders if we provide a function action.
// We use this for hydration warnings. It needs to be in sync with Fizz. Maybe makes sense
// as a shared module for that reason.

var EXPECTED_FORM_ACTION_URL = // eslint-disable-next-line no-script-url
"javascript:throw new Error('React form unexpectedly submitted.')";
export function listenToFormSubmissionsForReplaying() {
  // A global replay queue ensures actions are replayed in order.
  // This event listener should be above the React one. That way when
  // we preventDefault in React's handling we also prevent this event
  // from queing it. Since React listens to the root and the top most
  // container you can use is the document, the window is fine.
  // eslint-disable-next-line no-restricted-globals
  addEventListener('submit', function (event) {
    if (event.defaultPrevented) {
      // We let earlier events to prevent the action from submitting.
      return;
    }

    var form = event.target;
    var submitter = event['submitter'];
    var action = form.action;
    var formDataSubmitter = submitter;

    if (submitter) {
      var submitterAction = submitter.getAttribute('formAction');

      if (submitterAction != null) {
        // The submitter overrides the action.
        action = submitterAction; // If the submitter overrides the action, and it passes the test below,
        // that means that it was a function action which conceptually has no name.
        // Therefore, we exclude the submitter from the formdata.

        formDataSubmitter = null;
      }
    }

    if (action !== EXPECTED_FORM_ACTION_URL) {
      // The form is a regular form action, we can bail.
      return;
    } // Prevent native navigation.
    // This will also prevent other React's on the same page from listening.


    event.preventDefault(); // Take a snapshot of the FormData at the time of the event.

    var formData;

    if (formDataSubmitter) {
      // The submitter's value should be included in the FormData.
      // It should be in the document order in the form.
      // Since the FormData constructor invokes the formdata event it also
      // needs to be available before that happens so after construction it's too
      // late. We use a temporary fake node for the duration of this event.
      // TODO: FormData takes a second argument that it's the submitter but this
      // is fairly new so not all browsers support it yet. Switch to that technique
      // when available.
      var temp = document.createElement('input');
      temp.name = formDataSubmitter.name;
      temp.value = formDataSubmitter.value;
      formDataSubmitter.parentNode.insertBefore(temp, formDataSubmitter);
      formData = new FormData(form);
      temp.parentNode.removeChild(temp);
    } else {
      formData = new FormData(form);
    } // Queue for replaying later. This field could potentially be shared with multiple
    // Reacts on the same page since each one will preventDefault for the next one.
    // This means that this protocol is shared with any React version that shares the same
    // javascript: URL placeholder value. So we might not be the first to declare it.
    // We attach it to the form's root node, which is the shared environment context
    // where we preserve sequencing and where we'll pick it up from during hydration.
    // If there's no ownerDocument, then this is the document.


    var root = form.ownerDocument || form;
    (root['$$reactFormReplay'] = root['$$reactFormReplay'] || []).push(form, submitter, formData);
  });
}