"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RNIWrapperView = void 0;
var React = _interopRequireWildcard(require("react"));
var _RNIWrapperNativeView = require("./RNIWrapperNativeView");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const RNIWrapperView = exports.RNIWrapperView = /*#__PURE__*/React.forwardRef((props, ref) => {
  const [viewID, setViewID] = React.useState();
  const [reactTag, setReactTag] = React.useState();
  React.useImperativeHandle(ref, () => ({
    getReactTag: () => {
      return reactTag;
    },
    getViewID: () => {
      return viewID;
    }
  }));
  return /*#__PURE__*/React.createElement(_RNIWrapperNativeView.RNIWrapperNativeView, _extends({}, props, {
    onDidSetViewID: event => {
      var _props$onDidSetViewID;
      setViewID(event.nativeEvent.viewID);
      setReactTag(event.nativeEvent.reactTag);
      (_props$onDidSetViewID = props.onDidSetViewID) === null || _props$onDidSetViewID === void 0 || _props$onDidSetViewID.call(props, event);
      event.stopPropagation();
    }
  }), props.children);
});
//# sourceMappingURL=RNIWrapperView.js.map