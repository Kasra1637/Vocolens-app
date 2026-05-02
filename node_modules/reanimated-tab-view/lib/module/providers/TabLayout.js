import React, { createContext, useContext, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { noop } from '../constants/common';
const TabLayoutContext = /*#__PURE__*/createContext({
  routeIndexToTabContentWidthMap: {},
  setRouteIndexToTabContentWidthMap: noop,
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
export const TabLayoutContextProvider = /*#__PURE__*/React.memo(function TabLayoutContextProvider({
  children
}) {
  const [routeIndexToTabContentWidthMap, setRouteIndexToTabContentWidthMap] = useState({});
  const routeIndexToTabWidthMapSV = useSharedValue({});
  const routeIndexToTabOffsetMapSV = useSharedValue({});
  const routeIndexToTabContentWidthMapSV = useSharedValue({});
  return /*#__PURE__*/React.createElement(TabLayoutContext.Provider, {
    value: {
      routeIndexToTabContentWidthMap,
      setRouteIndexToTabContentWidthMap,
      routeIndexToTabWidthMapSV,
      routeIndexToTabOffsetMapSV,
      routeIndexToTabContentWidthMapSV
    }
  }, children);
});
export const useTabLayoutContext = () => useContext(TabLayoutContext);
//# sourceMappingURL=TabLayout.js.map