"use strict";

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RNIContextMenuButton } from "../../native_components/RNIContextMenuButton/index.js";
import { ContextMenuView } from "../ContextMenuView/index.js";
import { ContextMenuButtonContext } from "../../context/ContextMenuButtonContext.js";
import { LIB_ENV } from "../../constants/LibEnv.js";
import { jsx as _jsx } from "react/jsx-runtime";
export class ContextMenuButton extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      menuVisible: false
    };
  }
  getProps = () => {
    const {
      menuConfig,
      isContextMenuEnabled,
      isMenuPrimaryAction,
      onMenuWillShow,
      onMenuWillHide,
      onMenuWillCancel,
      onMenuDidShow,
      onMenuDidHide,
      onMenuDidCancel,
      onPressMenuItem,
      onRequestDeferredElement,
      ...viewProps
    } = this.props;
    return {
      // A. Provide default values to props...
      isContextMenuEnabled: isContextMenuEnabled ?? true,
      isMenuPrimaryAction: isMenuPrimaryAction ?? true,
      // B. Pass down props...
      menuConfig,
      onMenuWillShow,
      onMenuWillHide,
      onMenuWillCancel,
      onMenuDidShow,
      onMenuDidHide,
      onMenuDidCancel,
      onPressMenuItem,
      onRequestDeferredElement,
      // C. Move all the default view-related
      //    props here...
      viewProps
    };
  };
  presentMenu = async () => {
    if (!LIB_ENV.isContextMenuViewSupported) return;
    await this.nativeRef.presentMenu();
  };
  dismissMenu = async () => {
    if (!LIB_ENV.isContextMenuButtonSupported) return;
    this.nativeRef.dismissMenu();
  };
  provideDeferredElements = async (deferredID, menuItems) => {
    if (!LIB_ENV.isContextMenuViewSupported) return;
    this.nativeRef.provideDeferredElements(deferredID, menuItems);
  };
  _handleGetRefToContextMenuButton = () => {
    return this;
  };
  _handleOnMenuWillShow = event => {
    this.props.onMenuWillShow?.(event);
    event.stopPropagation();
    this.setState({
      menuVisible: true
    });
  };
  _handleOnMenuWillHide = event => {
    this.props.onMenuWillHide?.(event);
    event.stopPropagation();
    this.setState({
      menuVisible: false
    });
  };
  _handleOnMenuWillCancel = event => {
    this.props.onMenuWillCancel?.(event);
    event.stopPropagation();
  };
  _handleOnMenuDidShow = event => {
    this.props.onMenuDidShow?.(event);
    event.stopPropagation();
  };
  _handleOnMenuDidHide = event => {
    this.props.onMenuDidHide?.(event);
    event.stopPropagation();
  };
  _handleOnMenuDidCancel = event => {
    this.props.onMenuDidCancel?.(event);

    // guard: event is a native event
    if (event.isUsingActionSheetFallback) return;
    event.stopPropagation();
  };
  _handleOnPressMenuItem = event => {
    this.props.onPressMenuItem?.(event);
    event.stopPropagation();
  };
  _handleOnRequestDeferredElement = event => {
    const {
      onRequestDeferredElement
    } = this.props;
    const {
      deferredID
    } = event.nativeEvent;
    onRequestDeferredElement?.(deferredID, items => {
      this.provideDeferredElements(deferredID, items);
    });
  };
  render() {
    const props = this.getProps();
    const state = this.state;
    const shouldUseContextMenuButton = LIB_ENV.isContextMenuButtonSupported;
    const shouldUseContextMenuView = !LIB_ENV.isContextMenuButtonSupported && LIB_ENV.isContextMenuViewSupported;

    // TODO: Rename to 'sharedProps'
    const nativeComponentProps = {
      menuConfig: props.menuConfig,
      isContextMenuEnabled: props.isContextMenuEnabled,
      isMenuPrimaryAction: props.isMenuPrimaryAction,
      // event handlers
      onMenuWillShow: this._handleOnMenuWillShow,
      onMenuWillHide: this._handleOnMenuWillHide,
      onMenuDidShow: this._handleOnMenuDidShow,
      onMenuDidHide: this._handleOnMenuDidHide,
      onMenuDidCancel: this._handleOnMenuDidCancel,
      onMenuWillCancel: this._handleOnMenuWillCancel,
      onPressMenuItem: this._handleOnPressMenuItem,
      onRequestDeferredElement: this._handleOnRequestDeferredElement
    };
    const contents = shouldUseContextMenuButton ?
    /*#__PURE__*/
    // A - Use 'RNIContextMenuButton'
    _jsx(RNIContextMenuButton, {
      ...props.viewProps,
      ...nativeComponentProps,
      ref: r => {
        this.nativeRef = r;
      },
      style: [styles.menuButton, props.viewProps.style],
      children: props.viewProps.children
    }) : shouldUseContextMenuView ?
    /*#__PURE__*/
    // B - Use 'ContextMenuView' Fallback
    _jsx(ContextMenuView, {
      ...props.viewProps,
      ...nativeComponentProps,
      onRequestDeferredElement: props.onRequestDeferredElement,
      children: props.viewProps.children
    }) :
    /*#__PURE__*/
    // C - Use Regular View
    _jsx(View, {
      ...props.viewProps,
      children: this.props.children
    });
    return /*#__PURE__*/_jsx(ContextMenuButtonContext.Provider, {
      value: {
        getRefToContextMenuButton: this._handleGetRefToContextMenuButton,
        isMenuVisible: state.menuVisible
      },
      children: contents
    });
  }
}
;
const styles = StyleSheet.create({
  menuButton: {
    backgroundColor: 'transparent'
  }
});
//# sourceMappingURL=ContextMenuButton.js.map