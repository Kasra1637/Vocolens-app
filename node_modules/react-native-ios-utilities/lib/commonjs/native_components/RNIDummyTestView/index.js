"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _RNIDummyTestNativeView = require("./RNIDummyTestNativeView");
Object.keys(_RNIDummyTestNativeView).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _RNIDummyTestNativeView[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _RNIDummyTestNativeView[key];
    }
  });
});
var _RNIDummyTestViewModule = require("./RNIDummyTestViewModule");
Object.keys(_RNIDummyTestViewModule).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _RNIDummyTestViewModule[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _RNIDummyTestViewModule[key];
    }
  });
});
//# sourceMappingURL=index.js.map