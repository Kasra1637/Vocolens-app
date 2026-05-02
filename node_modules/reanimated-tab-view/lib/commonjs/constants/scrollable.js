"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ScrollableType = exports.SHOULD_RENDER_ABSOLUTE_HEADER = exports.GestureSource = exports.DECELERATION_RATE_FOR_SCROLLVIEW = void 0;
var _reactNative = require("react-native");
const DECELERATION_RATE_FOR_SCROLLVIEW = exports.DECELERATION_RATE_FOR_SCROLLVIEW = _reactNative.Platform.select({
  ios: 0.9998,
  android: 0.9985,
  default: 1
});
let GestureSource = exports.GestureSource = /*#__PURE__*/function (GestureSource) {
  GestureSource["PAN"] = "PAN";
  GestureSource["SCROLL"] = "SCROLL";
  return GestureSource;
}({});
let ScrollableType = exports.ScrollableType = /*#__PURE__*/function (ScrollableType) {
  ScrollableType["SCROLL_VIEW"] = "SCROLL_VIEW";
  ScrollableType["FLAT_LIST"] = "FLAT_LIST";
  ScrollableType["VIRTUALIZED_LIST"] = "VIRTUALIZED_LIST";
  ScrollableType["SECTION_LIST"] = "SECTION_LIST";
  ScrollableType["FLASH_LIST"] = "FLASH_LIST";
  return ScrollableType;
}({});
const SHOULD_RENDER_ABSOLUTE_HEADER = exports.SHOULD_RENDER_ABSOLUTE_HEADER = _reactNative.Platform.OS === 'android';
//# sourceMappingURL=scrollable.js.map