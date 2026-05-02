"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RNIDetachedView = void 0;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _RNIDetachedNativeView = require("./RNIDetachedNativeView");
var _DetachedSubviewsMap = require("./DetachedSubviewsMap");
var _Helpers = require("../../misc/Helpers");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const RNIDetachedView = exports.RNIDetachedView = /*#__PURE__*/React.forwardRef((props, ref) => {
  const [viewID, setViewID] = React.useState();
  const [reactTag, setReactTag] = React.useState();
  const [isDetachedInNative, setIsDetachedInNative] = React.useState(false);
  const [detachedSubviewsMap, setDetachedSubviewsMap] = React.useState({});
  React.useImperativeHandle(ref, () => ({
    getReactTag: () => {
      return reactTag;
    },
    getViewID: () => {
      return viewID;
    },
    getDetachedSubviewsMap: () => {
      return detachedSubviewsMap;
    },
    attachToWindow: async commandArgs => {
      if (viewID == null) return;
      const module = _Helpers.Helpers.getRNIUtilitiesModule();
      setIsDetachedInNative(true);
      await module.viewCommandRequest(/* viewID     : */viewID, /* commandName: */'attachToWindow', /* commandArgs: */commandArgs);
    },
    presentInModal: async commandArgs => {
      if (viewID == null) return;
      const module = _Helpers.Helpers.getRNIUtilitiesModule();
      setIsDetachedInNative(true);
      await module.viewCommandRequest(/* viewID     : */viewID, /* commandName: */'presentInModal', /* commandArgs: */commandArgs);
    }
  }));
  const shouldEnableDebugBackgroundColors = props.shouldEnableDebugBackgroundColors ?? false;
  const shouldImmediatelyDetach = props.shouldImmediatelyDetach ?? false;
  const isDetached = shouldImmediatelyDetach || isDetachedInNative;
  const reactChildrenCount = React.Children.count(props.children);
  const children = React.Children.map(props.children, child => {
    return /*#__PURE__*/React.cloneElement(child, {
      isParentDetached: isDetached,
      shouldEnableDebugBackgroundColors,
      detachedSubviewsMap
    });
  });
  return /*#__PURE__*/React.createElement(_RNIDetachedNativeView.RNIDetachedNativeView, _extends({}, props, {
    style: [isDetached && styles.detachedView, shouldEnableDebugBackgroundColors && styles.detachedViewDebug, props.style],
    reactChildrenCount: reactChildrenCount,
    onDidSetViewID: event => {
      var _props$onDidSetViewID;
      setViewID(event.nativeEvent.viewID);
      setReactTag(event.nativeEvent.reactTag);
      (_props$onDidSetViewID = props.onDidSetViewID) === null || _props$onDidSetViewID === void 0 || _props$onDidSetViewID.call(props, event);
      event.stopPropagation();
    },
    onViewDidDetachFromParent: event => {
      var _props$onViewDidDetac;
      (_props$onViewDidDetac = props.onViewDidDetachFromParent) === null || _props$onViewDidDetac === void 0 || _props$onViewDidDetac.call(props, event);
      event.stopPropagation();
      setIsDetachedInNative(true);
    },
    onContentViewDidDetach: event => {
      var _props$onContentViewD;
      (_props$onContentViewD = props.onContentViewDidDetach) === null || _props$onContentViewD === void 0 || _props$onContentViewD.call(props, event);
      event.stopPropagation();
      const detachedSubviewViewID = event.nativeEvent.viewID;
      const prevEntry = detachedSubviewsMap[detachedSubviewViewID];
      setDetachedSubviewsMap({
        ...detachedSubviewsMap,
        [detachedSubviewViewID]: {
          ..._DetachedSubviewsMap.DEFAULT_DETACHED_SUBVIEW_ENTRY,
          ...prevEntry,
          didDetachFromOriginalParent: true
        }
      });
    }
  }), children);
});
const styles = _reactNative.StyleSheet.create({
  detachedView: {
    position: 'absolute',
    pointerEvents: 'none',
    opacity: 0
  },
  detachedViewDebug: {
    backgroundColor: 'rgba(255,0,0,0.3)'
  }
});
//# sourceMappingURL=RNIDetachedView.js.map