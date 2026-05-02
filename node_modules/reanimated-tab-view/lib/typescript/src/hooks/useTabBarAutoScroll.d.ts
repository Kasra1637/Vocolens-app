import type { FlatList } from 'react-native-gesture-handler';
import type { Layout } from '../types/common';
import { type RefObject } from 'react';
type AutoScrollToRouteIndexParams = {
    shouldScrollToIndex: boolean;
    animated: boolean;
};
export declare const useTabBarAutoScroll: (flatListRef: RefObject<FlatList>, currentRouteIndex: number, layout: Layout) => {
    autoScrollToRouteIndex: (routeIndex: number, params?: Partial<AutoScrollToRouteIndexParams>) => void;
    handleScrollToIndexFailed: ({ index: routeIndex }: {
        index: number;
    }) => void;
};
export {};
//# sourceMappingURL=useTabBarAutoScroll.d.ts.map