export declare const useCarouselSwipePanGesture: (updateCurrentRouteIndex: (value: number) => void, handleSwipeStart: () => void, handleSwipeEnd: () => void) => import("react-native-gesture-handler/lib/typescript/handlers/gestures/panGesture").PanGesture;
export declare const useCarouselJumpToIndex: (updateCurrentRouteIndex: (value: number) => void) => (key: string) => void;
export declare const useCarouselSwipeTranslationAnimatedStyle: () => {
    transform: {
        translateX: number;
    }[];
};
//# sourceMappingURL=useCarouselSwipe.d.ts.map