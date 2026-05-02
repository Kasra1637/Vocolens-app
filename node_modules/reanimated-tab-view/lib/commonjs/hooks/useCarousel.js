"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useWindowedCarouselRouteIndices = void 0;
var _react = require("react");
var _carousel = require("../constants/carousel");
var _Internal = require("../providers/Internal");
const useWindowedCarouselRouteIndices = () => {
  const {
    noOfRoutes,
    currentRouteIndex
  } = (0, _Internal.useInternalContext)();
  const minRouteIndex = 0;
  const maxRouteIndex = noOfRoutes - 1;
  const routeIndicesRangeToRenderForWindowed = (0, _react.useMemo)(() => {
    return {
      minRouteIndex: Math.max(minRouteIndex, currentRouteIndex - _carousel.NUM_NEARBY_ROUTES_TO_RENDER),
      maxRouteIndex: Math.min(maxRouteIndex, currentRouteIndex + _carousel.NUM_NEARBY_ROUTES_TO_RENDER)
    };
  }, [currentRouteIndex, minRouteIndex, maxRouteIndex]);
  return routeIndicesRangeToRenderForWindowed;
};
exports.useWindowedCarouselRouteIndices = useWindowedCarouselRouteIndices;
//# sourceMappingURL=useCarousel.js.map