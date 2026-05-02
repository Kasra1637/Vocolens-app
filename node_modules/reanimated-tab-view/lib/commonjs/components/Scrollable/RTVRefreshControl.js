"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RTVRefreshControl = void 0;
var _react = _interopRequireDefault(require("react"));
var _reactNative = require("react-native");
var _useRefreshControl = require("../../hooks/scrollable/useRefreshControl");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
const RTVRefreshControl = exports.RTVRefreshControl = /*#__PURE__*/_react.default.memo(function RTVRefreshControl(props) {
  const {
    progressViewOffset
  } = (0, _useRefreshControl.useRefreshControl)();
  return /*#__PURE__*/_react.default.createElement(_reactNative.RefreshControl, _extends({}, props, {
    progressViewOffset: progressViewOffset
  }));
});
//# sourceMappingURL=RTVRefreshControl.js.map