"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireDefault(require("react"));
var _reactNative = require("react-native");
var _reactNativeReanimated = require("react-native-reanimated");
var _useTabLayout = require("../hooks/useTabLayout");
var _Internal = require("../providers/Internal");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const TabContentContainer = /*#__PURE__*/_react.default.memo(props => {
  const {
    index,
    style,
    children: renderTabContent
  } = props;
  const {
    animatedRouteIndex
  } = (0, _Internal.useInternalContext)();
  const {
    handleTabContentLayout
  } = (0, _useTabLayout.useHandleTabContentLayout)(index);
  const activePercentSV = (0, _reactNativeReanimated.useDerivedValue)(() => {
    return Math.min(100, 100 * Math.abs(animatedRouteIndex.value - index));
  });
  return /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    onLayout: handleTabContentLayout,
    style: [styles.tabBarItem, style]
  }, renderTabContent(activePercentSV));
});
var _default = exports.default = TabContentContainer;
const styles = _reactNative.StyleSheet.create({
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center'
  }
});
//# sourceMappingURL=TabContentContainer.js.map