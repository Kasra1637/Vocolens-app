"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useCarouselLazyLoading = void 0;
var _react = require("react");
var _reactNativeReanimated = require("react-native-reanimated");
var _Internal = require("../providers/Internal");
var _Props = require("../providers/Props");
var _useCarousel = require("./useCarousel");
var _Jump = require("../providers/Jump");
var _Carousel = require("../providers/Carousel");
const useCarouselLazyLoading = () => {
  const {
    renderMode
  } = (0, _Props.usePropsContext)();
  const {
    initialRouteIndex
  } = (0, _Internal.useInternalContext)();
  const {
    smoothJumpStartRouteIndex
  } = (0, _Jump.useJumpContext)();
  const {
    currentRouteIndexSV
  } = (0, _Carousel.useCarouselContext)();
  const routeIndicesRangeToRenderForWindowed = (0, _useCarousel.useWindowedCarouselRouteIndices)();
  const [lazyLoadedRouteIndices, setLazyLoadedRouteIndices] = (0, _react.useState)([initialRouteIndex]);
  const appendTolazyLoadedRouteIndices = (0, _react.useCallback)(index => {
    setLazyLoadedRouteIndices(prev => {
      if (!prev.includes(index)) {
        return [...prev, index];
      }
      return prev;
    });
  }, []);
  (0, _reactNativeReanimated.useAnimatedReaction)(() => currentRouteIndexSV.value, index => {
    (0, _reactNativeReanimated.runOnJS)(appendTolazyLoadedRouteIndices)(index);
  }, []);
  const handleSceneMount = (0, _react.useCallback)(index => {
    setLazyLoadedRouteIndices(prev => {
      if (!prev.includes(index)) {
        return [...prev, index];
      }
      return prev;
    });
  }, []);
  const isLazyLoadingEnabled = (0, _react.useMemo)(() => renderMode === 'lazy', [renderMode]);
  const computeShouldRenderRoute = (0, _react.useCallback)(index => {
    if (renderMode === 'windowed') {
      return index >= routeIndicesRangeToRenderForWindowed.minRouteIndex && index <= routeIndicesRangeToRenderForWindowed.maxRouteIndex || index === smoothJumpStartRouteIndex;
    }
    if (renderMode === 'lazy') {
      return lazyLoadedRouteIndices.includes(index);
    }
    return true;
  }, [routeIndicesRangeToRenderForWindowed, lazyLoadedRouteIndices, renderMode, smoothJumpStartRouteIndex]);
  return {
    isLazyLoadingEnabled,
    handleSceneMount,
    computeShouldRenderRoute
  };
};
exports.useCarouselLazyLoading = useCarouselLazyLoading;
//# sourceMappingURL=useCarouselLazyLoading.js.map