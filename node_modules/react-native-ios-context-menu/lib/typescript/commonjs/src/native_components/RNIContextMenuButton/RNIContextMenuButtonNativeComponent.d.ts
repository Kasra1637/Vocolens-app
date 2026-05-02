import type { BubblingEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
import type { HostComponent, ViewProps } from 'react-native';
export interface NativeProps extends ViewProps {
    isMenuPrimaryAction?: boolean;
    onDidSetViewID?: BubblingEventHandler<{}>;
    menuConfig?: string;
    isContextMenuEnabled?: boolean;
    onMenuWillShow?: BubblingEventHandler<{}>;
    onMenuDidShow?: BubblingEventHandler<{}>;
    onMenuWillHide?: BubblingEventHandler<{}>;
    onMenuDidHide?: BubblingEventHandler<{}>;
    onMenuWillCancel?: BubblingEventHandler<{}>;
    onMenuDidCancel?: BubblingEventHandler<{}>;
    onRequestDeferredElement?: BubblingEventHandler<{}>;
    onPressMenuItem?: BubblingEventHandler<{}>;
}
declare const _default: HostComponent<NativeProps>;
export default _default;
//# sourceMappingURL=RNIContextMenuButtonNativeComponent.d.ts.map