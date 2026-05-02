"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ContextMenuButton = void 0;
var _react = _interopRequireDefault(require("react"));
var _reactNative = require("react-native");
var _index = require("../../native_components/RNIContextMenuButton/index.js");
var _index2 = require("../ContextMenuView/index.js");
var _ContextMenuButtonContext = require("../../context/ContextMenuButtonContext.js");
var _LibEnv = require("../../constants/LibEnv.js");
var _jsxRuntime = require("react/jsx-runtime");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class ContextMenuButton extends _react.default.PureComponent {
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
    if (!_LibEnv.LIB_ENV.isContextMenuViewSupported) return;
    await this.nativeRef.presentMenu();
  };
  dismissMenu = async () => {
    if (!_LibEnv.LIB_ENV.isContextMenuButtonSupported) return;
    this.nativeRef.dismissMenu();
  };
  provideDeferredElements = async (deferredID, menuItems) => {
    if (!_LibEnv.LIB_ENV.isContextMenuViewSupported) return;
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
    const shouldUseContextMenuButton = _LibEnv.LIB_ENV.isContextMenuButtonSupported;
    const shouldUseContextMenuView = !_LibEnv.LIB_ENV.isContextMenuButtonSupported && _LibEnv.LIB_ENV.isContextMenuViewSupported;

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
    (0, _jsxRuntime.jsx)(_index.RNIContextMenuButton, {
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
    (0, _jsxRuntime.jsx)(_index2.ContextMenuView, {
      ...props.viewProps,
      ...nativeComponentProps,
      onRequestDeferredElement: props.onRequestDeferredElement,
      children: props.viewProps.children
    }) :
    /*#__PURE__*/
    // C - Use Regular View
    (0, _jsxRuntime.jsx)(_reactNative.View, {
      ...props.viewProps,
      children: this.props.children
    });
    return /*#__PURE__*/(0, _jsxRuntime.jsx)(_ContextMenuButtonContext.ContextMenuButtonContext.Provider, {
      value: {
        getRefToContextMenuButton: this._handleGetRefToContextMenuButton,
        isMenuVisible: state.menuVisible
      },
      children: contents
    });
  }
}
exports.ContextMenuButton = ContextMenuButton;
;
const styles = _reactNative.StyleSheet.create({
  menuButton: {
    backgroundColor: 'transparent'
  }
});
//# sourceMappingURL=ContextMenuButton.js.map