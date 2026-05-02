"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LIB_ENV = exports.IS_PLATFORM_IOS = exports.IOS_VERSION = void 0;
var _reactNative = require("react-native");
// @ts-ignore
const IOS_VERSION = exports.IOS_VERSION = parseInt(_reactNative.Platform.Version, 10);
const IS_PLATFORM_IOS = exports.IS_PLATFORM_IOS = _reactNative.Platform.OS === 'ios';
const LIB_ENV = exports.LIB_ENV = {
  isContextMenuButtonSupported: IS_PLATFORM_IOS && IOS_VERSION >= 14,
  isContextMenuViewSupported: IS_PLATFORM_IOS && IOS_VERSION >= 13,
  shouldEnableLogging: false,
  shouldEnableDetachedView: true
};
//# sourceMappingURL=LibEnv.js.map