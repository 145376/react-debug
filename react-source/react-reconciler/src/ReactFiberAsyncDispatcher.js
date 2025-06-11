/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
import { readContext } from "./ReactFiberNewContext";
import { CacheContext } from "./ReactFiberCacheComponent";
import { current as currentOwner } from "./ReactCurrentFiber";

function getCacheForType(resourceType) {
  var cache = readContext(CacheContext);
  var cacheForType = cache.data.get(resourceType);

  if (cacheForType === undefined) {
    cacheForType = resourceType();
    cache.data.set(resourceType, cacheForType);
  }

  return cacheForType;
}

export var DefaultAsyncDispatcher = {
  getCacheForType: getCacheForType,
};

// if (__DEV__) {
//   DefaultAsyncDispatcher.getOwner = function () {
//     return currentOwner;
//   };
// }
