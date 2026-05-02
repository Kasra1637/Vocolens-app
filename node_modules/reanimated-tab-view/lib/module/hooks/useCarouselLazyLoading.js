import { useCallback, useMemo, useState } from 'react';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { useInternalContext } from '../providers/Internal';
import { usePropsContext } from '../providers/Props';
import { useWindowedCarouselRouteIndices } from './useCarousel';
import { useJumpContext } from '../providers/Jump';
import { useCarouselContext } from '../providers/Carousel';
export const useCarouselLazyLoading = () => {
  const {
    renderMode
  } = usePropsContext();
  const {
    initialRouteIndex
  } = useInternalContext();
  const {
    smoothJumpStartRouteIndex
  } = useJumpContext();
  const {
    currentRouteIndexSV
  } = useCarouselContext();
  const routeIndicesRangeToRenderForWindowed = useWindowedCarouselRouteIndices();
  const [lazyLoadedRouteIndices, setLazyLoadedRouteIndices] = useState([initialRouteIndex]);
  const appendTolazyLoadedRouteIndices = useCallback(index => {
    setLazyLoadedRouteIndices(prev => {
      if (!prev.includes(index)) {
        return [...prev, index];
      }
      return prev;
    });
  }, []);
  useAnimatedReaction(() => currentRouteIndexSV.value, index => {
    runOnJS(appendTolazyLoadedRouteIndices)(index);
  }, []);
  const handleSceneMount = useCallback(index => {
    setLazyLoadedRouteIndices(prev => {
      if (!prev.includes(index)) {
        return [...prev, index];
      }
      return prev;
    });
  }, []);
  const isLazyLoadingEnabled = useMemo(() => renderMode === 'lazy', [renderMode]);
  const computeShouldRenderRoute = useCallback(index => {
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
//# sourceMappingURL=useCarouselLazyLoading.js.map