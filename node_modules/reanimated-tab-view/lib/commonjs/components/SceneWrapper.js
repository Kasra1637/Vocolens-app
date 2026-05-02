"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireDefault(require("react"));
var _reactNative = require("react-native");
var _reactNativeReanimated = _interopRequireWildcard(require("react-native-reanimated"));
var _Props = require("../providers/Props");
var _Jump = require("../providers/Jump");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const SceneWrapper = /*#__PURE__*/_react.default.memo(({
  routeIndex,
  children
}) => {
  const {
    jumpMode
  } = (0, _Props.usePropsContext)();
  const {
    smoothJumpStartRouteIndexSV,
    jumpEndRouteIndexSV,
    smoothJumpStartRouteTranslationXSV
  } = (0, _Jump.useJumpContext)();
  const sceneWrapperAnimatedStyle = (0, _reactNativeReanimated.useAnimatedStyle)(() => {
    if (jumpMode !== 'smooth') {
      return {
        transform: [{
          translateX: 0
        }],
        opacity: 1
      };
    }
    const isPrevRoute = routeIndex === smoothJumpStartRouteIndexSV.value;
    const isInBetweenPrevAndJumpRoute = jumpEndRouteIndexSV.value == null ? false : routeIndex > Math.min(smoothJumpStartRouteIndexSV.value, jumpEndRouteIndexSV.value) && routeIndex < Math.max(smoothJumpStartRouteIndexSV.value, jumpEndRouteIndexSV.value);
    return {
      transform: [{
        translateX: isPrevRoute ? smoothJumpStartRouteTranslationXSV.value : 0
      }],
      opacity: !isInBetweenPrevAndJumpRoute ? 1 : 0
    };
  }, [routeIndex, jumpMode, smoothJumpStartRouteTranslationXSV]);
  return /*#__PURE__*/_react.default.createElement(_reactNativeReanimated.default.View, {
    style: [styles.prevRouteSceneWrapper, sceneWrapperAnimatedStyle]
  }, children);
});
const styles = _reactNative.StyleSheet.create({
  prevRouteSceneWrapper: {
    width: '100%',
    height: '100%'
  }
});
var _default = exports.default = SceneWrapper;
//# sourceMappingURL=SceneWrapper.js.map