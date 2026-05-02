import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { CarouselImperativeHandle } from '../components/TabViewCarousel';
import type { Layout, Route } from '../types/common';
type InternalContext = {
    tabViewCarouselRef: React.RefObject<CarouselImperativeHandle>;
    animatedRouteIndex: SharedValue<number>;
    initialRouteIndex: number;
    currentRouteIndex: number;
    setCurrentRouteIndex: (index: number) => void;
    routes: Route[];
    noOfRoutes: number;
    tabViewLayout: Layout;
    tabViewHeaderLayout: Layout;
    tabBarLayout: Layout;
    tabViewCarouselLayout: Layout;
    jumpTo: (routeKey: string) => void;
    setTabViewLayout: React.Dispatch<React.SetStateAction<Layout>>;
    setTabViewHeaderLayout: React.Dispatch<React.SetStateAction<Layout>>;
    setTabBarLayout: React.Dispatch<React.SetStateAction<Layout>>;
    setTabViewCarouselLayout: React.Dispatch<React.SetStateAction<Layout>>;
};
declare const InternalContext: React.Context<InternalContext>;
type InternalContextProviderProps = {
    value: InternalContext;
};
export declare const InternalContextProvider: React.NamedExoticComponent<React.PropsWithChildren<InternalContextProviderProps>>;
export declare const useInternalContext: () => InternalContext;
export {};
//# sourceMappingURL=Internal.d.ts.map