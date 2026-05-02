import type { PropsWithChildren } from "react";
import type { ViewProps } from "react-native";
import type { StateReactTag, StateViewID } from "react-native-ios-utilities";
import type { RNIContextMenuButtonNativeViewProps } from "./RNIContextMenuButtonNativeView";
import type { MenuElementConfig } from "../../types/MenuConfig";
export type RNIContextMenuButtonRef = {
    getViewID: () => StateViewID;
    getReactTag: () => StateReactTag;
    presentMenu: () => Promise<void>;
    dismissMenu: () => Promise<void>;
    provideDeferredElements: (deferredID: string, menuItems: Array<MenuElementConfig>) => Promise<void>;
};
export type RNIContextMenuButtonInheritedOptionalProps = Partial<Pick<RNIContextMenuButtonNativeViewProps, 'menuConfig' | 'onDidSetViewID'>>;
export type RNIContextMenuButtonInheritedRequiredProps = Required<Pick<RNIContextMenuButtonNativeViewProps, 'isContextMenuEnabled' | 'isMenuPrimaryAction' | 'onMenuWillShow' | 'onMenuWillHide' | 'onMenuWillCancel' | 'onMenuDidShow' | 'onMenuDidHide' | 'onMenuDidCancel' | 'onRequestDeferredElement' | 'onPressMenuItem'>>;
export type RNIContextMenuButtonInheritedProps = RNIContextMenuButtonInheritedOptionalProps & RNIContextMenuButtonInheritedRequiredProps;
export type RNIContextMenuButtonBaseProps = {};
export type RNIContextMenuButtonProps = PropsWithChildren<RNIContextMenuButtonInheritedProps & RNIContextMenuButtonBaseProps & ViewProps>;
//# sourceMappingURL=RNIContextMenuButtonTypes.d.ts.map