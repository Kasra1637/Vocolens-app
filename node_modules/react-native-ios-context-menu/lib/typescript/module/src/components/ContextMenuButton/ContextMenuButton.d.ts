import React from 'react';
import type { ContextMenuButtonProps, ContextMenuButtonState } from './ContextMenuButtonTypes';
import type { MenuElementConfig } from '../../types/MenuConfig';
export declare class ContextMenuButton extends React.PureComponent<ContextMenuButtonProps, ContextMenuButtonState> {
    private nativeRef;
    constructor(props: ContextMenuButtonProps);
    private getProps;
    presentMenu: () => Promise<void>;
    dismissMenu: () => Promise<void>;
    provideDeferredElements: (deferredID: string, menuItems: MenuElementConfig[]) => Promise<void>;
    private _handleGetRefToContextMenuButton;
    private _handleOnMenuWillShow;
    private _handleOnMenuWillHide;
    private _handleOnMenuWillCancel;
    private _handleOnMenuDidShow;
    private _handleOnMenuDidHide;
    private _handleOnMenuDidCancel;
    private _handleOnPressMenuItem;
    private _handleOnRequestDeferredElement;
    render(): import("react/jsx-runtime").JSX.Element;
}
//# sourceMappingURL=ContextMenuButton.d.ts.map