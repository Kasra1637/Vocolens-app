import React from 'react';
import { type SharedValue } from 'react-native-reanimated';
type JumpContext = {
    isJumping: boolean;
    setIsJumping: (val: boolean) => void;
    jumpEndRouteIndexSV: SharedValue<number | null>;
    smoothJumpStartRouteIndex: number;
    setSmoothJumpStartRouteIndex: (index: number) => void;
    smoothJumpStartRouteIndexSV: SharedValue<number>;
    smoothJumpStartRouteTranslationXSV: SharedValue<number>;
};
declare const JumpContext: React.Context<JumpContext>;
export declare const JumpContextProvider: React.NamedExoticComponent<object>;
export declare const useJumpContext: () => JumpContext;
export {};
//# sourceMappingURL=Jump.d.ts.map