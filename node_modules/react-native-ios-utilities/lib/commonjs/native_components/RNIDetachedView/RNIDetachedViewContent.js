"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RNIDetachedViewContent = RNIDetachedViewContent;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _RNIWrapperView = require("../../native_components/RNIWrapperView");
var _DetachedSubviewsMap = require("./DetachedSubviewsMap");
var _LibEnv = require("../../constants/LibEnv");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function RNIDetachedViewContent(props) {
  var _props$detachedSubvie;
  const [viewID, setViewID] = React.useState();
  const wrapperStyle = [props.shouldEnableDebugBackgroundColors && styles.wrapperViewDebug, props.contentContainerStyle];
  const detachedSubviewEntry = (viewID != null ? (_props$detachedSubvie = props.detachedSubviewsMap) === null || _props$detachedSubvie === void 0 ? void 0 : _props$detachedSubvie[viewID] : undefined) ?? _DetachedSubviewsMap.DEFAULT_DETACHED_SUBVIEW_ENTRY;
  const didDetach = (props.isParentDetached ?? false) || detachedSubviewEntry.didDetachFromOriginalParent;
  return /*#__PURE__*/React.createElement(_RNIWrapperView.RNIWrapperView, _extends({}, props, {
    style: [...(_LibEnv.IS_USING_NEW_ARCH ? wrapperStyle : []), didDetach ? styles.wrapperViewDetached : styles.wrapperViewAttached, props.style],
    onDidSetViewID: event => {
      var _props$onDidSetViewID, _props$onDidSetViewID2;
      (_props$onDidSetViewID = props.onDidSetViewID) === null || _props$onDidSetViewID === void 0 || _props$onDidSetViewID.call(props, event);
      setViewID(event.nativeEvent.viewID);
      (_props$onDidSetViewID2 = props.onDidSetViewID) === null || _props$onDidSetViewID2 === void 0 || _props$onDidSetViewID2.call(props, event);
      event.stopPropagation();
    }
  }), _LibEnv.IS_USING_NEW_ARCH ? props.children : /*#__PURE__*/React.createElement(_reactNative.View, {
    style: [styles.innerWrapperContainerForPaper, ...wrapperStyle]
  }, props.children));
}
;
const styles = _reactNative.StyleSheet.create({
  wrapperViewAttached: {},
  wrapperViewDetached: {},
  wrapperViewDebug: {
    backgroundColor: 'rgba(255,0,255,0.3)'
  },
  innerWrapperContainerForPaper: {
    flex: 1
  }
});
//# sourceMappingURL=RNIDetachedViewContent.js.map