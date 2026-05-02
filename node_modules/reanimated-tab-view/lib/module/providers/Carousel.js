import React, { createContext, useContext, useMemo } from 'react';
import { useInternalContext } from './Internal';
import { useSharedValue } from 'react-native-reanimated';
import { usePropsContext } from './Props';
const CarouselContext = /*#__PURE__*/createContext({
  translationPerSceneContainer: 0,
  swipeTranslationXSV: {
    value: 0
  },
  currentRouteIndexSV: {
    value: 0
  }
});
export const CarouselContextProvider = /*#__PURE__*/React.memo(function CarouselContextProvider({
  children
}) {
  //#region context
  const {
    navigationState,
    sceneContainerGap
  } = usePropsContext();
  const {
    tabViewLayout,
    initialRouteIndex
  } = useInternalContext();
  //#endregion

  //#region variables
  const translationPerSceneContainer = useMemo(() => tabViewLayout.width + sceneContainerGap, [tabViewLayout.width, sceneContainerGap]);
  const swipeTranslationXSV = useSharedValue(-navigationState.index * translationPerSceneContainer);
  const currentRouteIndexSV = useSharedValue(initialRouteIndex);
  //endregion

  const value = useMemo(() => ({
    translationPerSceneContainer,
    swipeTranslationXSV,
    currentRouteIndexSV
  }), [translationPerSceneContainer, swipeTranslationXSV, currentRouteIndexSV]);
  return /*#__PURE__*/React.createElement(CarouselContext.Provider, {
    value: value
  }, children);
});
export const useCarouselContext = () => useContext(CarouselContext);
//# sourceMappingURL=Carousel.js.map