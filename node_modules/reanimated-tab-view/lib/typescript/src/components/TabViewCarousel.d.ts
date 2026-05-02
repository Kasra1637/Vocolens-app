import React from 'react';
import type { TabViewCarouselProps } from '../types/TabViewCarousel';
export type CarouselImperativeHandle = {
    jumpToRoute: (route: string) => void;
};
declare const TabViewCarousel: React.MemoExoticComponent<React.ForwardRefExoticComponent<TabViewCarouselProps & React.RefAttributes<CarouselImperativeHandle>>>;
export default TabViewCarousel;
//# sourceMappingURL=TabViewCarousel.d.ts.map