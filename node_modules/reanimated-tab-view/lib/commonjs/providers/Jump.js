"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useJumpContext = exports.JumpContextProvider = void 0;
var _react = _interopRequireWildcard(require("react"));
var _Internal = require("./Internal");
var _reactNativeReanimated = require("react-native-reanimated");
var _common = require("../constants/common");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const JumpContext = /*#__PURE__*/(0, _react.createContext)({
  isJumping: false,
  setIsJumping: _common.noop,
  jumpEndRouteIndexSV: {
    value: null
  },
  smoothJumpStartRouteIndex: 0,
  setSmoothJumpStartRouteIndex: _common.noop,
  smoothJumpStartRouteIndexSV: {
    value: 0
  },
  smoothJumpStartRouteTranslationXSV: {
    value: 0
  }
});
const JumpContextProvider = exports.JumpContextProvider = /*#__PURE__*/_react.default.memo(function JumpContextProvider({
  children
}) {
  //#region variables
  const {
    initialRouteIndex
  } = (0, _Internal.useInternalContext)();
  const jumpEndRouteIndexSV = (0, _reactNativeReanimated.useSharedValue)(null);
  const [isJumping, setIsJumping] = (0, _react.useState)(false);
  const [smoothJumpStartRouteIndex, setSmoothJumpStartRouteIndex] = (0, _react.useState)(initialRouteIndex);
  const smoothJumpStartRouteIndexSV = (0, _reactNativeReanimated.useSharedValue)(initialRouteIndex);
  const smoothJumpStartRouteTranslationXSV = (0, _reactNativeReanimated.useSharedValue)(0);
  //#endregion

  const value = (0, _react.useMemo)(() => ({
    isJumping,
    setIsJumping,
    smoothJumpStartRouteIndex,
    setSmoothJumpStartRouteIndex,
    smoothJumpStartRouteIndexSV,
    smoothJumpStartRouteTranslationXSV,
    jumpEndRouteIndexSV
  }), [isJumping, smoothJumpStartRouteIndex, smoothJumpStartRouteIndexSV, smoothJumpStartRouteTranslationXSV, jumpEndRouteIndexSV]);
  return /*#__PURE__*/_react.default.createElement(JumpContext.Provider, {
    value: value
  }, children);
});
const useJumpContext = () => (0, _react.useContext)(JumpContext);
exports.useJumpContext = useJumpContext;
//# sourceMappingURL=Jump.js.map