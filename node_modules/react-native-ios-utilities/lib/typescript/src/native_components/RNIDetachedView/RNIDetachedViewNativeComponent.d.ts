import type { BubblingEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
import type { HostComponent, ViewProps } from 'react-native';
export interface NativeProps extends ViewProps {
    rawDataForNative?: string;
    onDidSetViewID?: BubblingEventHandler<{}>;
    onViewWillRecycle?: BubblingEventHandler<{}>;
    onRawNativeEvent?: BubblingEventHandler<{}>;
    shouldImmediatelyDetach?: boolean;
    reactChildrenCount: Int32;
    onContentViewDidDetach?: BubblingEventHandler<{}>;
    onViewDidDetachFromParent?: BubblingEventHandler<{}>;
}
declare const _default: HostComponent<NativeProps>;
export default _default;
//# sourceMappingURL=RNIDetachedViewNativeComponent.d.ts.map