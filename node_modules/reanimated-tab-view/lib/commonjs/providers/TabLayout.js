"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useTabLayoutContext = exports.TabLayoutContextProvider = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNativeReanimated = require("react-native-reanimated");
var _common = require("../constants/common");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const TabLayoutContext = /*#__PURE__*/(0, _react.createContext)({
  routeIndexToTabContentWidthMap: {},
  setRouteIndexToTabContentWidthMap: _common.noop,
  routeIndexToTabWidthMapSV: {
    value: {}
  },
  routeIndexToTabOffsetMapSV: {
    value: {}
  },
  routeIndexToTabContentWidthMapSV: {
    value: {}
  }
});
const TabLayoutContextProvider = exports.TabLayoutContextProvider = /*#__PURE__*/_react.default.memo(function TabLayoutContextProvider({
  children
}) {
  const [routeIndexToTabContentWidthMap, setRouteIndexToTabContentWidthMap] = (0, _react.useState)({});
  const routeIndexToTabWidthMapSV = (0, _reactNativeReanimated.useSharedValue)({});
  const routeIndexToTabOffsetMapSV = (0, _reactNativeReanimated.useSharedValue)({});
  const routeIndexToTabContentWidthMapSV = (0, _reactNativeReanimated.useSharedValue)({});
  return /*#__PURE__*/_react.default.createElement(TabLayoutContext.Provider, {
    value: {
      routeIndexToTabContentWidthMap,
      setRouteIndexToTabContentWidthMap,
      routeIndexToTabWidthMapSV,
      routeIndexToTabOffsetMapSV,
      routeIndexToTabContentWidthMapSV
    }
  }, children);
});
const useTabLayoutContext = () => (0, _react.useContext)(TabLayoutContext);
exports.useTabLayoutContext = useTabLayoutContext;
//# sourceMappingURL=TabLayout.js.map