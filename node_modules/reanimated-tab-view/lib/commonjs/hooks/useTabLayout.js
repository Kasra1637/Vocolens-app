"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useHandleTabLayout = exports.useHandleTabContentLayout = void 0;
var _react = require("react");
var _TabLayout = require("../providers/TabLayout");
var _reactNativeReanimated = require("react-native-reanimated");
var _Internal = require("../providers/Internal");
const useHandleTabLayout = index => {
  const {
    noOfRoutes
  } = (0, _Internal.useInternalContext)();
  const {
    routeIndexToTabWidthMapSV,
    routeIndexToTabOffsetMapSV
  } = (0, _TabLayout.useTabLayoutContext)();
  const handleTabLayout = (0, _react.useCallback)(({
    nativeEvent
  }) => {
    function updateTabWidthAndOffset() {
      'worklet';

      const {
        width
      } = nativeEvent.layout;
      const prevWidth = routeIndexToTabWidthMapSV.value[index] ?? 0;
      if (width !== prevWidth) {
        routeIndexToTabWidthMapSV.value = {
          ...routeIndexToTabWidthMapSV.value,
          [index]: width
        };
        let prevRouteIndexOffset = 0;
        for (let i = 0; i <= noOfRoutes; i += 1) {
          const prevRouteIndexWidth = routeIndexToTabWidthMapSV.value[i - 1] ?? 0;
          const currentRouteIndexOffset = prevRouteIndexOffset + prevRouteIndexWidth;
          routeIndexToTabOffsetMapSV.value = {
            ...routeIndexToTabOffsetMapSV.value,
            [i]: currentRouteIndexOffset
          };
          prevRouteIndexOffset = currentRouteIndexOffset;
        }
      }
    }
    (0, _reactNativeReanimated.runOnUI)(updateTabWidthAndOffset)();
  }, [routeIndexToTabWidthMapSV, index, noOfRoutes, routeIndexToTabOffsetMapSV]);
  return {
    handleTabLayout
  };
};
exports.useHandleTabLayout = useHandleTabLayout;
const useHandleTabContentLayout = index => {
  const {
    setRouteIndexToTabContentWidthMap,
    routeIndexToTabContentWidthMapSV
  } = (0, _TabLayout.useTabLayoutContext)();
  const updateTabContentWidthMap = (0, _react.useCallback)(width => {
    setRouteIndexToTabContentWidthMap(prev => ({
      ...prev,
      [index]: width
    }));
  }, [index, setRouteIndexToTabContentWidthMap]);
  const handleTabContentLayout = (0, _react.useCallback)(({
    nativeEvent
  }) => {
    function updateTabContentWidthAndOffset() {
      'worklet';

      const {
        width
      } = nativeEvent.layout;
      const prevWidth = routeIndexToTabContentWidthMapSV.value[index] ?? 0;
      if (width !== prevWidth) {
        routeIndexToTabContentWidthMapSV.value = {
          ...routeIndexToTabContentWidthMapSV.value,
          [index]: width
        };
        (0, _reactNativeReanimated.runOnJS)(updateTabContentWidthMap)(width);
      }
    }
    (0, _reactNativeReanimated.runOnUI)(updateTabContentWidthAndOffset)();
  }, [index, routeIndexToTabContentWidthMapSV, updateTabContentWidthMap]);
  return {
    handleTabContentLayout
  };
};
exports.useHandleTabContentLayout = useHandleTabContentLayout;
//# sourceMappingURL=useTabLayout.js.map