/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
export function setSrcObject(domElement, tag, value) {
  // We optimistically create the URL regardless of object type. This lets us
  // support cross-realms and any type that the browser supports like new types.
  var url = URL.createObjectURL(value);
  var loadEvent = tag === 'img' ? 'load' : 'loadstart';

  var cleanUp = function () {
    // Once the object has started loading, then it's already collected by the
    // browser and it won't refer to it by the URL anymore so we can now revoke it.
    URL.revokeObjectURL(url);
    domElement.removeEventListener(loadEvent, cleanUp);
    domElement.removeEventListener('error', cleanUp);
  };

  domElement.addEventListener(loadEvent, cleanUp);
  domElement.addEventListener('error', cleanUp);
  domElement.setAttribute('src', url);
}