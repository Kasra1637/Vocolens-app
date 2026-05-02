import React from 'react';
import { type SharedValue } from 'react-native-reanimated';
type CarouselContext = {
    translationPerSceneContainer: number;
    swipeTranslationXSV: SharedValue<number>;
    currentRouteIndexSV: SharedValue<number>;
};
declare const CarouselContext: React.Context<CarouselContext>;
export declare const CarouselContextProvider: React.NamedExoticComponent<object>;
export declare const useCarouselContext: () => CarouselContext;
export {};
//# sourceMappingURL=Carousel.d.ts.map