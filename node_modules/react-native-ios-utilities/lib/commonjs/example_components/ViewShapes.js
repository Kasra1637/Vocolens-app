"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CircleView = CircleView;
exports.TriangleView = TriangleView;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function TriangleView(props) {
  const {
    width,
    height,
    color
  } = props;
  const shapeWidth = width ?? (height == null ? width : 30);
  const shapeHeight = height ?? (width == null ? height : 30);
  const containerStyle = {
    borderLeftWidth: shapeHeight,
    borderRightWidth: shapeHeight,
    borderBottomWidth: shapeWidth,
    borderBottomColor: color ?? "red"
  };
  return /*#__PURE__*/React.createElement(_reactNative.View, {
    style: [styles.triangleContainer, containerStyle, props.style]
  }, props.children);
}
;
function CircleView(props) {
  const size = props.size ?? 30;
  const containerStyle = {
    height: size,
    aspectRatio: 1,
    borderRadius: size / 2,
    backgroundColor: props.color ?? 'white'
  };
  return /*#__PURE__*/React.createElement(_reactNative.View, {
    style: [containerStyle, props.style]
  }, props.children);
}
;
const styles = _reactNative.StyleSheet.create({
  triangleContainer: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent"
  }
});
//# sourceMappingURL=ViewShapes.js.map