import type { BubblingEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
import type { HostComponent, ViewProps } from 'react-native';
export interface NativeProps extends ViewProps {
    rawDataForNative?: string;
    onDidSetViewID?: BubblingEventHandler<{}>;
    onViewWillRecycle?: BubblingEventHandler<{}>;
    onRawNativeEvent?: BubblingEventHandler<{}>;
}
declare const _default: HostComponent<NativeProps>;
export default _default;
//# sourceMappingURL=RNIWrapperViewNativeComponent.d.ts.map