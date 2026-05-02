"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NATIVE_ID_KEYS = exports.ContextMenuView = void 0;
var _react = _interopRequireDefault(require("react"));
var _reactNative = require("react-native");
var _tsEventEmitter = require("@dominicstop/ts-event-emitter");
var _reactNativeIosUtilities = require("react-native-ios-utilities");
var _index = require("../../native_components/RNIContextMenuView/index.js");
var _ContextMenuViewContext = require("../../context/ContextMenuViewContext.js");
var _LibEnv = require("../../constants/LibEnv.js");
var Helpers = _interopRequireWildcard(require("../../functions/Helpers.js"));
var _jsxRuntime = require("react/jsx-runtime");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const NATIVE_ID_KEYS = exports.NATIVE_ID_KEYS = {
  detachedView: 'detachedView',
  contextMenuPreview: 'contextMenuPreview',
  contextMenuAuxiliaryPreview: 'contextMenuAuxiliaryPreview'
};
class ContextMenuView extends _react.default.PureComponent {
  static defaultProps = {
    useActionSheetFallback: !_LibEnv.LIB_ENV.isContextMenuViewSupported
  };
  constructor(props) {
    super(props);
    this.state = {
      menuVisible: false,
      mountPreview: false
    };
    this.emitter = new _tsEventEmitter.TSEventEmitter();
  }
  getProps = () => {
    const {
      menuConfig,
      previewConfig,
      auxiliaryPreviewConfig,
      shouldUseDiscoverabilityTitleAsFallbackValueForSubtitle,
      shouldWaitForMenuToHideBeforeFiringOnPressMenuItem,
      shouldEnableAggressiveCleanup,
      shouldCleanupOnComponentWillUnmountForMenuPreview,
      shouldCleanupOnComponentWillUnmountForAuxPreview,
      isAuxiliaryPreviewEnabled,
      isContextMenuEnabled,
      shouldPreventLongPressGestureFromPropagating,
      // internal
      debugShouldEnableLogging,
      // event props
      onMenuWillShow,
      onMenuWillHide,
      onMenuWillCancel,
      onMenuDidShow,
      onMenuDidHide,
      onMenuDidCancel,
      onRequestDeferredElement,
      onMenuAuxiliaryPreviewWillShow,
      onMenuAuxiliaryPreviewDidShow,
      onPressMenuItem,
      onPressMenuPreview,
      lazyPreview,
      // render props
      renderPreview,
      renderAuxiliaryPreview: renderAuxillaryPreview,
      ...viewProps
    } = this.props;
    return {
      // A. Provide default values to props...
      lazyPreview: lazyPreview ?? true,
      shouldUseDiscoverabilityTitleAsFallbackValueForSubtitle: shouldUseDiscoverabilityTitleAsFallbackValueForSubtitle ?? true,
      shouldWaitForMenuToHideBeforeFiringOnPressMenuItem: shouldWaitForMenuToHideBeforeFiringOnPressMenuItem ?? true,
      shouldEnableAggressiveCleanup: shouldEnableAggressiveCleanup ?? true,
      isAuxiliaryPreviewEnabled: isAuxiliaryPreviewEnabled ?? true,
      isContextMenuEnabled: isContextMenuEnabled ?? true,
      shouldPreventLongPressGestureFromPropagating: shouldPreventLongPressGestureFromPropagating ?? true,
      debugShouldEnableLogging: debugShouldEnableLogging ?? _LibEnv.LIB_ENV.shouldEnableLogging,
      // B. Pass down props...
      shouldCleanupOnComponentWillUnmountForMenuPreview,
      shouldCleanupOnComponentWillUnmountForAuxPreview,
      menuConfig,
      previewConfig,
      auxiliaryPreviewConfig,
      // C. Pass down, and group event props...
      eventProps: {
        onMenuWillShow,
        onMenuWillHide,
        onMenuWillCancel,
        onMenuDidShow,
        onMenuDidHide,
        onMenuDidCancel,
        onRequestDeferredElement,
        onMenuAuxiliaryPreviewWillShow,
        onMenuAuxiliaryPreviewDidShow,
        onPressMenuItem,
        onPressMenuPreview
      },
      // D. Pass down, and group render props
      renderProps: {
        renderPreview,
        renderAuxillaryPreview
      },
      // E. Move all the default view-related
      //    props here...
      viewProps
    };
  };
  dismissMenu = async () => {
    if (!_LibEnv.LIB_ENV.isContextMenuViewSupported) return;
    await this.nativeRef.dismissMenu();
  };
  provideDeferredElements = async (deferredID, menuItems) => {
    if (!_LibEnv.LIB_ENV.isContextMenuViewSupported) return;
    await this.nativeRef.provideDeferredElements(deferredID, menuItems);
  };
  presentMenu = async () => {
    if (!_LibEnv.LIB_ENV.isContextMenuViewSupported) return;
    await this.nativeRef.presentMenu();
  };
  showAuxiliaryPreviewAsPopover = async () => {
    if (!_LibEnv.LIB_ENV.isContextMenuViewSupported) return;
    await Helpers.setStateAsync(this, () => ({
      mountPreview: true
    }));
    await this.nativeRef.showAuxiliaryPreviewAsPopover();
  };
  _handleGetRefToContextMenuView = () => {
    return this;
  };
  _handleOnMenuWillCreate = event => {
    this.setState({
      mountPreview: true
    });
    event.stopPropagation();
  };
  _handleOnMenuWillShow = event => {
    this.props.onMenuWillShow?.(event);
    event.stopPropagation();
    this.setState({
      menuVisible: true,
      mountPreview: true
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
    this.emitter.emit('onMenuDidHide', event);
    event.stopPropagation();
    event.persist();
    this.setState({
      mountPreview: false
    });
  };
  _handleOnMenuDidCancel = event => {
    this.props.onMenuDidCancel?.(event);

    // guard: event is a native event
    if (event.isUsingActionSheetFallback) return;
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
  _handleOnMenuAuxiliaryPreviewWillShow = event => {
    this.props.onMenuAuxiliaryPreviewWillShow?.(event);
    event.stopPropagation();
  };
  _handleOnMenuAuxiliaryPreviewDidShow = event => {
    this.props.onMenuAuxiliaryPreviewDidShow?.(event);
    event.stopPropagation();
  };
  _handleOnPressMenuItem = async event => {
    const props = this.getProps();
    const eventProps = props.eventProps;
    event.stopPropagation();
    event.persist();
    const isKeepsMenuPresentedEnabled = event.nativeEvent.menuAttributes?.includes('keepsMenuPresented');
    const shouldWaitForMenuToHide = !isKeepsMenuPresentedEnabled && props.shouldWaitForMenuToHideBeforeFiringOnPressMenuItem;
    try {
      if (shouldWaitForMenuToHide) {
        // wait for `onMenuDidHide`
        await Helpers.promiseWithTimeout(1000, new Promise(resolve => {
          this.emitter.once('onMenuDidHide', () => {
            resolve();
          });
        }));
        eventProps.onPressMenuItem?.(event);
      } else {
        eventProps.onPressMenuItem?.(event);
      }
      ;
    } catch (error) {
      eventProps.onPressMenuItem?.(event);
      console.log('_handleOnPressMenuItem - Promise waiting for `onMenuDidHide`' + ' has timed out');
    }
    ;
  };
  _handleOnPressMenuPreview = event => {
    this.props.onPressMenuPreview?.(event);
    event.stopPropagation();
  };
  render() {
    const props = this.getProps();
    const state = this.state;
    const shouldUseContextMenuView = _LibEnv.LIB_ENV.isContextMenuViewSupported;
    const isUsingCustomPreview = props.renderProps.renderPreview != null;
    const shouldMountPreviewContent = state.mountPreview || !props.lazyPreview;
    const isUsingAuxillaryPreview = props.renderProps.renderAuxillaryPreview != null;
    const shouldMountAuxPreviewContent = state.mountPreview || !props.lazyPreview;
    const shouldMountDetachedView = isUsingCustomPreview || isUsingAuxillaryPreview;
    props.debugShouldEnableLogging && console.log("ContextMenuView.render", `\n - isUsingCustomPreview: ${isUsingCustomPreview}`, `\n - shouldMountPreviewContent: ${shouldMountPreviewContent}`, `\n - isUsingAuxillaryPreview: ${isUsingAuxillaryPreview}`, `\n - shouldMountAuxPreviewContent: ${shouldMountAuxPreviewContent}`, `\n - shouldMountDetachedView: ${shouldMountDetachedView}`, `\n`);
    const contents = shouldUseContextMenuView ?
    /*#__PURE__*/
    // A - Use Context Menu View
    (0, _jsxRuntime.jsxs)(_index.RNIContextMenuView, {
      ...props.viewProps,
      ref: ref => {
        this.nativeRef = ref;
      },
      style: [styles.menuView, props.viewProps.style],
      menuConfig: props.menuConfig,
      previewConfig: props.previewConfig,
      auxiliaryPreviewConfig: props.auxiliaryPreviewConfig,
      isContextMenuEnabled: props.isContextMenuEnabled,
      shouldUseDiscoverabilityTitleAsFallbackValueForSubtitle: props.shouldUseDiscoverabilityTitleAsFallbackValueForSubtitle,
      isAuxiliaryPreviewEnabled: props.isAuxiliaryPreviewEnabled,
      shouldPreventLongPressGestureFromPropagating: props.shouldPreventLongPressGestureFromPropagating,
      debugShouldEnableLogging: props.debugShouldEnableLogging

      // Events: `onPress`-Related
      ,
      onMenuWillShow: this._handleOnMenuWillShow,
      onMenuWillHide: this._handleOnMenuWillHide,
      onMenuWillCancel: this._handleOnMenuWillCancel,
      onMenuDidShow: this._handleOnMenuDidShow,
      onMenuDidHide: this._handleOnMenuDidHide,
      onMenuDidCancel: this._handleOnMenuDidCancel,
      onRequestDeferredElement: this._handleOnRequestDeferredElement,
      onMenuWillCreate: this._handleOnMenuWillCreate

      // Events: "Aux. Preview"-Related
      ,
      onMenuAuxiliaryPreviewWillShow: this._handleOnMenuAuxiliaryPreviewWillShow,
      onMenuAuxiliaryPreviewDidShow: this._handleOnMenuAuxiliaryPreviewDidShow

      // Events: `onPress`-Related
      ,
      onPressMenuItem: this._handleOnPressMenuItem,
      onPressMenuPreview: this._handleOnPressMenuPreview,
      children: [shouldMountDetachedView && /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNativeIosUtilities.RNIDetachedView, {
        nativeID: NATIVE_ID_KEYS.detachedView,
        shouldImmediatelyDetach: true,
        children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_react.default.Fragment, {
          children: isUsingCustomPreview && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNativeIosUtilities.RNIDetachedViewContent, {
            nativeID: NATIVE_ID_KEYS.contextMenuPreview,
            children: shouldMountPreviewContent && props.renderProps.renderPreview?.()
          })
        }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_react.default.Fragment, {
          children: isUsingAuxillaryPreview && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNativeIosUtilities.RNIDetachedViewContent, {
            nativeID: NATIVE_ID_KEYS.contextMenuAuxiliaryPreview,
            children: shouldMountAuxPreviewContent && props.renderProps.renderAuxillaryPreview?.()
          })
        })]
      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
        children: props.viewProps.children
      })]
    }) :
    /*#__PURE__*/
    // B - Use Regular View
    (0, _jsxRuntime.jsx)(_reactNative.View, {
      ...props.viewProps,
      children: this.props.children
    });
    return /*#__PURE__*/(0, _jsxRuntime.jsx)(_ContextMenuViewContext.ContextMenuViewContext.Provider, {
      value: {
        getRefToContextMenuView: this._handleGetRefToContextMenuView,
        isMenuVisible: state.menuVisible
      },
      children: contents
    });
  }
}
exports.ContextMenuView = ContextMenuView;
;
const styles = _reactNative.StyleSheet.create({
  menuView: {
    backgroundColor: 'transparent'
  }
});
//# sourceMappingURL=ContextMenuView.js.map