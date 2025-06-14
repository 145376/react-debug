/**
 * This file is compiled to a standalone browser script by rollup and loaded by Fizz
 *  clients. Therefore, it should be fast and not have many external dependencies.
 * 
 */

/* eslint-disable dot-notation */
// Imports are resolved statically by the closure compiler in release bundles
// and by rollup in jest unit tests
import './fizz-instruction-set/ReactDOMFizzInstructionSetExternalRuntime';

if (document.body != null) {
  if (document.readyState === 'loading') {
    installFizzInstrObserver(document.body);
  } // $FlowFixMe[incompatible-cast]


  handleExistingNodes(document.body);
} else {
  // Document must be loading -- body may not exist yet if the fizz external
  // runtime is sent in <head> (e.g. as a preinit resource)
  // $FlowFixMe[recursive-definition]
  var domBodyObserver = new MutationObserver(function () {
    // We expect the body node to be stable once parsed / created
    if (document.body != null) {
      if (document.readyState === 'loading') {
        installFizzInstrObserver(document.body);
      } // $FlowFixMe[incompatible-cast]


      handleExistingNodes(document.body); // We can call disconnect without takeRecord here,
      // since we only expect a single document.body

      domBodyObserver.disconnect();
    }
  }); // documentElement must already exist at this point

  domBodyObserver.observe(document.documentElement, {
    childList: true
  });
}

function handleExistingNodes(target) {
  var existingNodes = target.querySelectorAll('template');

  for (var i = 0; i < existingNodes.length; i++) {
    handleNode(existingNodes[i]);
  }
}

function installFizzInstrObserver(target) {
  var handleMutations = function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var addedNodes = mutations[i].addedNodes;

      for (var j = 0; j < addedNodes.length; j++) {
        if (addedNodes[j].parentNode) {
          handleNode(addedNodes[j]);
        }
      }
    }
  };

  var fizzInstrObserver = new MutationObserver(handleMutations); // We assume that instruction data nodes are eventually appended to the
  // body, even if Fizz is streaming to a shell / subtree.

  fizzInstrObserver.observe(target, {
    childList: true
  });
  window.addEventListener('DOMContentLoaded', function () {
    handleMutations(fizzInstrObserver.takeRecords());
    fizzInstrObserver.disconnect();
  });
}

function handleNode(node_) {
  // $FlowFixMe[incompatible-cast]
  if (node_.nodeType !== 1 || !node_.dataset) {
    return;
  } // $FlowFixMe[incompatible-cast]


  var node = node_;
  var dataset = node.dataset;

  if (dataset['rxi'] != null) {
    window['$RX'](dataset['bid'], dataset['dgst'], dataset['msg'], dataset['stck'], dataset['cstck']);
    node.remove();
  } else if (dataset['rri'] != null) {
    // Convert styles here, since its type is Array<Array<string>>
    window['$RR'](dataset['bid'], dataset['sid'], JSON.parse(dataset['sty']));
    node.remove();
  } else if (dataset['rci'] != null) {
    window['$RC'](dataset['bid'], dataset['sid']);
    node.remove();
  } else if (dataset['rsi'] != null) {
    window['$RS'](dataset['sid'], dataset['pid']);
    node.remove();
  }
}