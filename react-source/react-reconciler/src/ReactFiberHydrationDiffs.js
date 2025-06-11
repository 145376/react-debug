/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
import { HostComponent, HostHoistable, HostSingleton, LazyComponent, ActivityComponent, SuspenseComponent, SuspenseListComponent, FunctionComponent, ForwardRef, SimpleMemoComponent, ClassComponent, HostText } from './ReactWorkTags';
import { enableSrcObject } from 'shared/ReactFeatureFlags';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import assign from 'shared/assign';
import getComponentNameFromType from 'shared/getComponentNameFromType';
import isArray from 'shared/isArray';
var maxRowLength = 120;
var idealDepth = 15;

function findNotableNode(node, indent) {
  if (node.serverProps === undefined && node.serverTail.length === 0 && node.children.length === 1 && node.distanceFromLeaf > 3 && node.distanceFromLeaf > idealDepth - indent) {
    // This is not an interesting node for contextual purposes so we can skip it.
    var child = node.children[0];
    return findNotableNode(child, indent);
  }

  return node;
}

function indentation(indent) {
  return '  ' + '  '.repeat(indent);
}

function added(indent) {
  return '+ ' + '  '.repeat(indent);
}

function removed(indent) {
  return '- ' + '  '.repeat(indent);
}

function describeFiberType(fiber) {
  switch (fiber.tag) {
    case HostHoistable:
    case HostSingleton:
    case HostComponent:
      return fiber.type;

    case LazyComponent:
      return 'Lazy';

    case ActivityComponent:
      return 'Activity';

    case SuspenseComponent:
      return 'Suspense';

    case SuspenseListComponent:
      return 'SuspenseList';

    case FunctionComponent:
    case SimpleMemoComponent:
      var fn = fiber.type;
      return fn.displayName || fn.name || null;

    case ForwardRef:
      var render = fiber.type.render;
      return render.displayName || render.name || null;

    case ClassComponent:
      var ctr = fiber.type;
      return ctr.displayName || ctr.name || null;

    default:
      // Skip
      return null;
  }
}

var needsEscaping = /["'&<>\n\t]|^\s|\s$/;

function describeTextNode(content, maxLength) {
  if (needsEscaping.test(content)) {
    var encoded = JSON.stringify(content);

    if (encoded.length > maxLength - 2) {
      if (maxLength < 8) {
        return '{"..."}';
      }

      return '{' + encoded.slice(0, maxLength - 7) + '..."}';
    }

    return '{' + encoded + '}';
  } else {
    if (content.length > maxLength) {
      if (maxLength < 5) {
        return '{"..."}';
      }

      return content.slice(0, maxLength - 3) + '...';
    }

    return content;
  }
}

function describeTextDiff(clientText, serverProps, indent) {
  var maxLength = maxRowLength - indent * 2;

  if (serverProps === null) {
    return added(indent) + describeTextNode(clientText, maxLength) + '\n';
  } else if (typeof serverProps === 'string') {
    var serverText = serverProps;
    var firstDiff = 0;

    for (; firstDiff < serverText.length && firstDiff < clientText.length; firstDiff++) {
      if (serverText.charCodeAt(firstDiff) !== clientText.charCodeAt(firstDiff)) {
        break;
      }
    }

    if (firstDiff > maxLength - 8 && firstDiff > 10) {
      // The first difference between the two strings would be cut off, so cut off in
      // the beginning instead.
      clientText = '...' + clientText.slice(firstDiff - 8);
      serverText = '...' + serverText.slice(firstDiff - 8);
    }

    return added(indent) + describeTextNode(clientText, maxLength) + '\n' + removed(indent) + describeTextNode(serverText, maxLength) + '\n';
  } else {
    return indentation(indent) + describeTextNode(clientText, maxLength) + '\n';
  }
}

function objectName(object) {
  // $FlowFixMe[method-unbinding]
  var name = Object.prototype.toString.call(object);
  return name.replace(/^\[object (.*)\]$/, function (m, p0) {
    return p0;
  });
}

function describeValue(value, maxLength) {
  switch (typeof value) {
    case 'string':
      {
        var encoded = JSON.stringify(value);

        if (encoded.length > maxLength) {
          if (maxLength < 5) {
            return '"..."';
          }

          return encoded.slice(0, maxLength - 4) + '..."';
        }

        return encoded;
      }

    case 'object':
      {
        if (value === null) {
          return 'null';
        }

        if (isArray(value)) {
          return '[...]';
        }

        if (value.$$typeof === REACT_ELEMENT_TYPE) {
          var type = getComponentNameFromType(value.type);
          return type ? '<' + type + '>' : '<...>';
        }

        var name = objectName(value);

        if (name === 'Object') {
          var properties = '';
          maxLength -= 2;

          for (var _propName in value) {
            if (!value.hasOwnProperty(_propName)) {
              continue;
            }

            var jsonPropName = JSON.stringify(_propName);

            if (jsonPropName !== '"' + _propName + '"') {
              _propName = jsonPropName;
            }

            maxLength -= _propName.length - 2;
            var propValue = describeValue(value[_propName], maxLength < 15 ? maxLength : 15);
            maxLength -= propValue.length;

            if (maxLength < 0) {
              properties += properties === '' ? '...' : ', ...';
              break;
            }

            properties += (properties === '' ? '' : ',') + _propName + ':' + propValue;
          }

          return '{' + properties + '}';
        } else if (enableSrcObject && (name === 'Blob' || name === 'File')) {
          return name + ':' + value.type;
        }

        return name;
      }

    case 'function':
      {
        var _name = value.displayName || value.name;

        return _name ? 'function ' + _name : 'function';
      }

    default:
      // eslint-disable-next-line react-internal/safe-string-coercion
      return String(value);
  }
}

function describePropValue(value, maxLength) {
  if (typeof value === 'string' && !needsEscaping.test(value)) {
    if (value.length > maxLength - 2) {
      if (maxLength < 5) {
        return '"..."';
      }

      return '"' + value.slice(0, maxLength - 5) + '..."';
    }

    return '"' + value + '"';
  }

  return '{' + describeValue(value, maxLength - 2) + '}';
}

function describeCollapsedElement(type, props, indent) {
  // This function tries to fit the props into a single line for non-essential elements.
  // We also ignore children because we're not going deeper.
  var maxLength = maxRowLength - indent * 2 - type.length - 2;
  var content = '';

  for (var _propName2 in props) {
    if (!props.hasOwnProperty(_propName2)) {
      continue;
    }

    if (_propName2 === 'children') {
      // Ignored.
      continue;
    }

    var propValue = describePropValue(props[_propName2], 15);
    maxLength -= _propName2.length + propValue.length + 2;

    if (maxLength < 0) {
      content += ' ...';
      break;
    }

    content += ' ' + _propName2 + '=' + propValue;
  }

  return indentation(indent) + '<' + type + content + '>\n';
}

function describeExpandedElement(type, props, rowPrefix) {
  // This function tries to fit the props into a single line for non-essential elements.
  // We also ignore children because we're not going deeper.
  var remainingRowLength = maxRowLength - rowPrefix.length - type.length; // We add the properties to a set so we can choose later whether we'll put it on one
  // line or multiple lines.

  var properties = [];

  for (var _propName3 in props) {
    if (!props.hasOwnProperty(_propName3)) {
      continue;
    }

    if (_propName3 === 'children') {
      // Ignored.
      continue;
    }

    var maxLength = maxRowLength - rowPrefix.length - _propName3.length - 1;
    var propValue = describePropValue(props[_propName3], maxLength);
    remainingRowLength -= _propName3.length + propValue.length + 2;
    properties.push(_propName3 + '=' + propValue);
  }

  if (properties.length === 0) {
    return rowPrefix + '<' + type + '>\n';
  } else if (remainingRowLength > 0) {
    // We can fit all on one row.
    return rowPrefix + '<' + type + ' ' + properties.join(' ') + '>\n';
  } else {
    // Split into one row per property:
    return rowPrefix + '<' + type + '\n' + rowPrefix + '  ' + properties.join('\n' + rowPrefix + '  ') + '\n' + rowPrefix + '>\n';
  }
}

function describePropertiesDiff(clientObject, serverObject, indent) {
  var properties = '';
  var remainingServerProperties = assign({}, serverObject);

  for (var _propName4 in clientObject) {
    if (!clientObject.hasOwnProperty(_propName4)) {
      continue;
    }

    delete remainingServerProperties[_propName4];
    var maxLength = maxRowLength - indent * 2 - _propName4.length - 2;
    var clientValue = clientObject[_propName4];
    var clientPropValue = describeValue(clientValue, maxLength);

    if (serverObject.hasOwnProperty(_propName4)) {
      var serverValue = serverObject[_propName4];
      var serverPropValue = describeValue(serverValue, maxLength);
      properties += added(indent) + _propName4 + ': ' + clientPropValue + '\n';
      properties += removed(indent) + _propName4 + ': ' + serverPropValue + '\n';
    } else {
      properties += added(indent) + _propName4 + ': ' + clientPropValue + '\n';
    }
  }

  for (var _propName5 in remainingServerProperties) {
    if (!remainingServerProperties.hasOwnProperty(_propName5)) {
      continue;
    }

    var _maxLength = maxRowLength - indent * 2 - _propName5.length - 2;

    var _serverValue = remainingServerProperties[_propName5];

    var _serverPropValue = describeValue(_serverValue, _maxLength);

    properties += removed(indent) + _propName5 + ': ' + _serverPropValue + '\n';
  }

  return properties;
}

function describeElementDiff(type, clientProps, serverProps, indent) {
  var content = ''; // Maps any previously unmatched lower case server prop name to its full prop name

  var serverPropNames = new Map();

  for (var _propName6 in serverProps) {
    if (!serverProps.hasOwnProperty(_propName6)) {
      continue;
    }

    serverPropNames.set(_propName6.toLowerCase(), _propName6);
  }

  if (serverPropNames.size === 1 && serverPropNames.has('children')) {
    content += describeExpandedElement(type, clientProps, indentation(indent));
  } else {
    for (var _propName7 in clientProps) {
      if (!clientProps.hasOwnProperty(_propName7)) {
        continue;
      }

      if (_propName7 === 'children') {
        // Handled below.
        continue;
      }

      var maxLength = maxRowLength - (indent + 1) * 2 - _propName7.length - 1;
      var serverPropName = serverPropNames.get(_propName7.toLowerCase());

      if (serverPropName !== undefined) {
        serverPropNames.delete(_propName7.toLowerCase()); // There's a diff here.

        var clientValue = clientProps[_propName7];
        var serverValue = serverProps[serverPropName];
        var clientPropValue = describePropValue(clientValue, maxLength);
        var serverPropValue = describePropValue(serverValue, maxLength);

        if (typeof clientValue === 'object' && clientValue !== null && typeof serverValue === 'object' && serverValue !== null && objectName(clientValue) === 'Object' && objectName(serverValue) === 'Object' && ( // Only do the diff if the object has a lot of keys or was shortened.
        Object.keys(clientValue).length > 2 || Object.keys(serverValue).length > 2 || clientPropValue.indexOf('...') > -1 || serverPropValue.indexOf('...') > -1)) {
          // We're comparing two plain objects. We can diff the nested objects instead.
          content += indentation(indent + 1) + _propName7 + '={{\n' + describePropertiesDiff(clientValue, serverValue, indent + 2) + indentation(indent + 1) + '}}\n';
        } else {
          content += added(indent + 1) + _propName7 + '=' + clientPropValue + '\n';
          content += removed(indent + 1) + _propName7 + '=' + serverPropValue + '\n';
        }
      } else {
        // Considered equal.
        content += indentation(indent + 1) + _propName7 + '=' + describePropValue(clientProps[_propName7], maxLength) + '\n';
      }
    }

    serverPropNames.forEach(function (propName) {
      if (propName === 'children') {
        // Handled below.
        return;
      }

      var maxLength = maxRowLength - (indent + 1) * 2 - propName.length - 1;
      content += removed(indent + 1) + propName + '=' + describePropValue(serverProps[propName], maxLength) + '\n';
    });

    if (content === '') {
      // No properties
      content = indentation(indent) + '<' + type + '>\n';
    } else {
      // Had properties
      content = indentation(indent) + '<' + type + '\n' + content + indentation(indent) + '>\n';
    }
  }

  var serverChildren = serverProps.children;
  var clientChildren = clientProps.children;

  if (typeof serverChildren === 'string' || typeof serverChildren === 'number' || typeof serverChildren === 'bigint') {
    // There's a diff of the children.
    // $FlowFixMe[unsafe-addition]
    var serverText = '' + serverChildren;
    var clientText = '';

    if (typeof clientChildren === 'string' || typeof clientChildren === 'number' || typeof clientChildren === 'bigint') {
      // $FlowFixMe[unsafe-addition]
      clientText = '' + clientChildren;
    }

    content += describeTextDiff(clientText, serverText, indent + 1);
  } else if (typeof clientChildren === 'string' || typeof clientChildren === 'number' || typeof clientChildren === 'bigint') {
    if (serverChildren == null) {
      // This is a new string child.
      // $FlowFixMe[unsafe-addition]
      content += describeTextDiff('' + clientChildren, null, indent + 1);
    } else {
      // The client has children but it's not considered a difference from the server.
      // $FlowFixMe[unsafe-addition]
      content += describeTextDiff('' + clientChildren, undefined, indent + 1);
    }
  }

  return content;
}

function describeSiblingFiber(fiber, indent) {
  var type = describeFiberType(fiber);

  if (type === null) {
    // Skip this type of fiber. We currently treat this as a fragment
    // so it's just part of the parent's children.
    var flatContent = '';
    var childFiber = fiber.child;

    while (childFiber) {
      flatContent += describeSiblingFiber(childFiber, indent);
      childFiber = childFiber.sibling;
    }

    return flatContent;
  }

  return indentation(indent) + '<' + type + '>' + '\n';
}

function describeNode(node, indent) {
  var skipToNode = findNotableNode(node, indent);

  if (skipToNode !== node && (node.children.length !== 1 || node.children[0] !== skipToNode)) {
    return indentation(indent) + '...\n' + describeNode(skipToNode, indent + 1);
  } // Prefix with any server components for context


  var parentContent = '';
  var debugInfo = node.fiber._debugInfo;

  if (debugInfo) {
    for (var i = 0; i < debugInfo.length; i++) {
      var serverComponentName = debugInfo[i].name;

      if (typeof serverComponentName === 'string') {
        parentContent += indentation(indent) + '<' + serverComponentName + '>' + '\n';
        indent++;
      }
    }
  } // Self


  var selfContent = ''; // We use the pending props since we might be generating a diff before the complete phase
  // when something throws.

  var clientProps = node.fiber.pendingProps;

  if (node.fiber.tag === HostText) {
    // Text Node
    selfContent = describeTextDiff(clientProps, node.serverProps, indent);
    indent++;
  } else {
    var type = describeFiberType(node.fiber);

    if (type !== null) {
      // Element Node
      if (node.serverProps === undefined) {
        // Just a reference node for context.
        selfContent = describeCollapsedElement(type, clientProps, indent);
        indent++;
      } else if (node.serverProps === null) {
        selfContent = describeExpandedElement(type, clientProps, added(indent));
        indent++;
      } else if (typeof node.serverProps === 'string') {
        if (__DEV__) {
          console.error('Should not have matched a non HostText fiber to a Text node. This is a bug in React.');
        }
      } else {
        selfContent = describeElementDiff(type, clientProps, node.serverProps, indent);
        indent++;
      }
    }
  } // Compute children


  var childContent = '';
  var childFiber = node.fiber.child;
  var diffIdx = 0;

  while (childFiber && diffIdx < node.children.length) {
    var childNode = node.children[diffIdx];

    if (childNode.fiber === childFiber) {
      // This was a match in the diff.
      childContent += describeNode(childNode, indent);
      diffIdx++;
    } else {
      // This is an unrelated previous sibling.
      childContent += describeSiblingFiber(childFiber, indent);
    }

    childFiber = childFiber.sibling;
  }

  if (childFiber && node.children.length > 0) {
    // If we had any further siblings after the last mismatch, we can't be sure if it's
    // actually a valid match since it might not have found a match. So we exclude next
    // siblings to avoid confusion.
    childContent += indentation(indent) + '...' + '\n';
  } // Deleted tail nodes


  var serverTail = node.serverTail;

  if (node.serverProps === null) {
    indent--;
  }

  for (var _i = 0; _i < serverTail.length; _i++) {
    var tailNode = serverTail[_i];

    if (typeof tailNode === 'string') {
      // Removed text node
      childContent += removed(indent) + describeTextNode(tailNode, maxRowLength - indent * 2) + '\n';
    } else {
      // Removed element
      childContent += describeExpandedElement(tailNode.type, tailNode.props, removed(indent));
    }
  }

  return parentContent + selfContent + childContent;
}

export function describeDiff(rootNode) {
  try {
    return '\n\n' + describeNode(rootNode, 0);
  } catch (x) {
    return '';
  }
}