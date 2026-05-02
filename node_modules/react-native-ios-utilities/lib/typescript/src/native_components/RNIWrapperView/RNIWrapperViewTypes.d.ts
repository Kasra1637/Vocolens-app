import type { PropsWithChildren } from "react";
import type { ViewProps } from "react-native";
import type { RNIWrapperNativeViewProps } from "./RNIWrapperNativeView";
import type { StateReactTag, StateViewID } from '../../types/SharedStateTypes';
export type RNIWrapperViewRef = {
    getViewID: () => StateViewID;
    getReactTag: () => StateReactTag;
};
export type RNIWrapperViewInheritedOptionalProps = Partial<Pick<RNIWrapperNativeViewProps, 'onDidSetViewID' | 'onViewWillRecycle' | 'onRawNativeEvent' | 'rawDataForNative'>>;
export type RNIWrapperViewBaseProps = {
    debugShouldEnableLogging?: boolean;
};
export type RNIWrapperViewProps = PropsWithChildren<RNIWrapperViewInheritedOptionalProps & RNIWrapperViewBaseProps & ViewProps>;
//# sourceMappingURL=RNIWrapperViewTypes.d.ts.map