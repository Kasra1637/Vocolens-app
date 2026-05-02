"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useInternalContext = exports.InternalContextProvider = void 0;
var _react = _interopRequireWildcard(require("react"));
var _common = require("../constants/common");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const InternalContext = /*#__PURE__*/(0, _react.createContext)({
  tabViewCarouselRef: {
    current: null
  },
  animatedRouteIndex: {
    value: 0
  },
  initialRouteIndex: 0,
  currentRouteIndex: 0,
  routes: [],
  noOfRoutes: 0,
  tabViewLayout: {
    width: 0,
    height: 0
  },
  tabViewHeaderLayout: {
    width: 0,
    height: 0
  },
  tabBarLayout: {
    width: 0,
    height: 0
  },
  tabViewCarouselLayout: {
    width: 0,
    height: 0
  },
  setCurrentRouteIndex: _common.noop,
  jumpTo: _common.noop,
  setTabViewLayout: _common.noop,
  setTabViewHeaderLayout: _common.noop,
  setTabBarLayout: _common.noop,
  setTabViewCarouselLayout: _common.noop
});
const InternalContextProvider = exports.InternalContextProvider = /*#__PURE__*/_react.default.memo(function InternalContextProvider({
  children,
  value
}) {
  return /*#__PURE__*/_react.default.createElement(InternalContext.Provider, {
    value: value
  }, children);
});
const useInternalContext = () => (0, _react.useContext)(InternalContext);
exports.useInternalContext = useInternalContext;
//# sourceMappingURL=Internal.js.map