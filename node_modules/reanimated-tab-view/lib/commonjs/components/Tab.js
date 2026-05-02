"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _reactNativeReanimated = _interopRequireDefault(require("react-native-reanimated"));
var _useTabLayout = require("../hooks/useTabLayout");
var _Internal = require("../providers/Internal");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const AnimatedPressable = _reactNativeReanimated.default.createAnimatedComponent(_reactNative.Pressable);
const Tab = /*#__PURE__*/_react.default.memo(({
  index,
  route,
  style,
  children,
  onTabPress,
  onTabLongPress
}) => {
  const {
    jumpTo
  } = (0, _Internal.useInternalContext)();
  const {
    handleTabLayout
  } = (0, _useTabLayout.useHandleTabLayout)(index);
  const handlePressTabItem = (0, _react.useCallback)(() => {
    const scene = {
      route
    };
    onTabPress === null || onTabPress === void 0 || onTabPress(scene);
    jumpTo(route.key);
  }, [jumpTo, onTabPress, route]);
  const handleLongPressTabItem = (0, _react.useCallback)(() => {
    const scene = {
      route
    };
    onTabLongPress === null || onTabLongPress === void 0 || onTabLongPress(scene);
    jumpTo(route.key);
  }, [jumpTo, onTabLongPress, route]);
  return /*#__PURE__*/_react.default.createElement(AnimatedPressable, {
    onLayout: handleTabLayout,
    onPress: handlePressTabItem,
    onLongPress: handleLongPressTabItem,
    style: style
  }, children);
});
var _default = exports.default = Tab;
//# sourceMappingURL=Tab.js.map