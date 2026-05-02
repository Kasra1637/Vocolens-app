"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useCarouselContext = exports.CarouselContextProvider = void 0;
var _react = _interopRequireWildcard(require("react"));
var _Internal = require("./Internal");
var _reactNativeReanimated = require("react-native-reanimated");
var _Props = require("./Props");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const CarouselContext = /*#__PURE__*/(0, _react.createContext)({
  translationPerSceneContainer: 0,
  swipeTranslationXSV: {
    value: 0
  },
  currentRouteIndexSV: {
    value: 0
  }
});
const CarouselContextProvider = exports.CarouselContextProvider = /*#__PURE__*/_react.default.memo(function CarouselContextProvider({
  children
}) {
  //#region context
  const {
    navigationState,
    sceneContainerGap
  } = (0, _Props.usePropsContext)();
  const {
    tabViewLayout,
    initialRouteIndex
  } = (0, _Internal.useInternalContext)();
  //#endregion

  //#region variables
  const translationPerSceneContainer = (0, _react.useMemo)(() => tabViewLayout.width + sceneContainerGap, [tabViewLayout.width, sceneContainerGap]);
  const swipeTranslationXSV = (0, _reactNativeReanimated.useSharedValue)(-navigationState.index * translationPerSceneContainer);
  const currentRouteIndexSV = (0, _reactNativeReanimated.useSharedValue)(initialRouteIndex);
  //endregion

  const value = (0, _react.useMemo)(() => ({
    translationPerSceneContainer,
    swipeTranslationXSV,
    currentRouteIndexSV
  }), [translationPerSceneContainer, swipeTranslationXSV, currentRouteIndexSV]);
  return /*#__PURE__*/_react.default.createElement(CarouselContext.Provider, {
    value: value
  }, children);
});
const useCarouselContext = () => (0, _react.useContext)(CarouselContext);
exports.useCarouselContext = useCarouselContext;
//# sourceMappingURL=Carousel.js.map