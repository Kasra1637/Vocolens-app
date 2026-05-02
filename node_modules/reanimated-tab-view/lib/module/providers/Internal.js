import React, { createContext, useContext } from 'react';
import { noop } from '../constants/common';
const InternalContext = /*#__PURE__*/createContext({
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
  setCurrentRouteIndex: noop,
  jumpTo: noop,
  setTabViewLayout: noop,
  setTabViewHeaderLayout: noop,
  setTabBarLayout: noop,
  setTabViewCarouselLayout: noop
});
export const InternalContextProvider = /*#__PURE__*/React.memo(function InternalContextProvider({
  children,
  value
}) {
  return /*#__PURE__*/React.createElement(InternalContext.Provider, {
    value: value
  }, children);
});
export const useInternalContext = () => useContext(InternalContext);
//# sourceMappingURL=Internal.js.map