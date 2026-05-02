import React from 'react';
import { type RNIContextMenuViewRef } from '../../native_components/RNIContextMenuView';
import type { ContextMenuViewProps, ContextMenuViewState, ContextMenuEventEmitter } from './ContextMenuViewTypes';
import type { MenuElementConfig } from '../../types/MenuConfig';
export declare const NATIVE_ID_KEYS: {
    detachedView: string;
    contextMenuPreview: string;
    contextMenuAuxiliaryPreview: string;
};
export declare class ContextMenuView extends React.PureComponent<ContextMenuViewProps, ContextMenuViewState> {
    static defaultProps: {
        useActionSheetFallback: boolean;
    };
    nativeRef: RNIContextMenuViewRef;
    emitter: ContextMenuEventEmitter;
    constructor(props: ContextMenuViewProps);
    private getProps;
    dismissMenu: () => Promise<void>;
    provideDeferredElements: (deferredID: string, menuItems: MenuElementConfig[]) => Promise<void>;
    presentMenu: () => Promise<void>;
    showAuxiliaryPreviewAsPopover: () => Promise<void>;
    private _handleGetRefToContextMenuView;
    private _handleOnMenuWillCreate;
    private _handleOnMenuWillShow;
    private _handleOnMenuWillHide;
    private _handleOnMenuWillCancel;
    private _handleOnMenuDidShow;
    private _handleOnMenuDidHide;
    private _handleOnMenuDidCancel;
    private _handleOnRequestDeferredElement;
    private _handleOnMenuAuxiliaryPreviewWillShow;
    private _handleOnMenuAuxiliaryPreviewDidShow;
    private _handleOnPressMenuItem;
    private _handleOnPressMenuPreview;
    render(): import("react/jsx-runtime").JSX.Element;
}
//# sourceMappingURL=ContextMenuView.d.ts.map