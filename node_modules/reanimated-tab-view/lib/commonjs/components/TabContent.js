"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TabContent = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _reactNativeReanimated = _interopRequireWildcard(require("react-native-reanimated"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const DEFAULT_ACTIVE_COLOR = 'rgba(255, 255, 255, 1)';
const DEFAULT_INACTIVE_COLOR = 'rgba(255, 255, 255, 0.7)';
const TabContent = exports.TabContent = /*#__PURE__*/_react.default.memo(props => {
  const {
    activePercentage,
    activeColor,
    inactiveColor,
    label,
    labelStyle
  } = props;
  const animatedActiveLabelStyle = (0, _reactNativeReanimated.useAnimatedStyle)(() => {
    return {
      opacity: Math.max(0, 1 - activePercentage.value / 100)
    };
  }, [activePercentage]);
  const animatedInactiveLabelStyle = (0, _reactNativeReanimated.useAnimatedStyle)(() => {
    return {
      opacity: activePercentage.value / 100
    };
  }, [activePercentage]);
  const activeLabel = (0, _react.useMemo)(() => {
    const activeColorStyle = activeColor ? {
      color: activeColor
    } : {};
    return /*#__PURE__*/_react.default.createElement(_reactNativeReanimated.default.Text, {
      style: [styles.activeLabel, animatedActiveLabelStyle, activeColorStyle, labelStyle]
    }, label);
  }, [activeColor, animatedActiveLabelStyle, label, labelStyle]);
  const inactiveLabel = (0, _react.useMemo)(() => {
    const inactiveColorStyle = inactiveColor ? {
      color: inactiveColor
    } : {};
    return /*#__PURE__*/_react.default.createElement(_reactNativeReanimated.default.Text, {
      style: [styles.inactiveLabel, animatedInactiveLabelStyle, inactiveColorStyle, labelStyle]
    }, label);
  }, [inactiveColor, animatedInactiveLabelStyle, label, labelStyle]);
  return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, activeLabel, inactiveLabel);
});
const styles = _reactNative.StyleSheet.create({
  activeLabel: {
    color: DEFAULT_ACTIVE_COLOR
  },
  inactiveLabel: {
    position: 'absolute',
    color: DEFAULT_INACTIVE_COLOR
  }
});
//# sourceMappingURL=TabContent.js.map