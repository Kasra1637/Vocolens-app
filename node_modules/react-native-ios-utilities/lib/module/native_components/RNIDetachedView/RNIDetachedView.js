function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import * as React from 'react';
import { StyleSheet } from 'react-native';
import { RNIDetachedNativeView } from './RNIDetachedNativeView';
import { DEFAULT_DETACHED_SUBVIEW_ENTRY } from './DetachedSubviewsMap';
import { Helpers } from '../../misc/Helpers';
export const RNIDetachedView = /*#__PURE__*/React.forwardRef((props, ref) => {
  const [viewID, setViewID] = React.useState();
  const [reactTag, setReactTag] = React.useState();
  const [isDetachedInNative, setIsDetachedInNative] = React.useState(false);
  const [detachedSubviewsMap, setDetachedSubviewsMap] = React.useState({});
  React.useImperativeHandle(ref, () => ({
    getReactTag: () => {
      return reactTag;
    },
    getViewID: () => {
      return viewID;
    },
    getDetachedSubviewsMap: () => {
      return detachedSubviewsMap;
    },
    attachToWindow: async commandArgs => {
      if (viewID == null) return;
      const module = Helpers.getRNIUtilitiesModule();
      setIsDetachedInNative(true);
      await module.viewCommandRequest(/* viewID     : */viewID, /* commandName: */'attachToWindow', /* commandArgs: */commandArgs);
    },
    presentInModal: async commandArgs => {
      if (viewID == null) return;
      const module = Helpers.getRNIUtilitiesModule();
      setIsDetachedInNative(true);
      await module.viewCommandRequest(/* viewID     : */viewID, /* commandName: */'presentInModal', /* commandArgs: */commandArgs);
    }
  }));
  const shouldEnableDebugBackgroundColors = props.shouldEnableDebugBackgroundColors ?? false;
  const shouldImmediatelyDetach = props.shouldImmediatelyDetach ?? false;
  const isDetached = shouldImmediatelyDetach || isDetachedInNative;
  const reactChildrenCount = React.Children.count(props.children);
  const children = React.Children.map(props.children, child => {
    return /*#__PURE__*/React.cloneElement(child, {
      isParentDetached: isDetached,
      shouldEnableDebugBackgroundColors,
      detachedSubviewsMap
    });
  });
  return /*#__PURE__*/React.createElement(RNIDetachedNativeView, _extends({}, props, {
    style: [isDetached && styles.detachedView, shouldEnableDebugBackgroundColors && styles.detachedViewDebug, props.style],
    reactChildrenCount: reactChildrenCount,
    onDidSetViewID: event => {
      var _props$onDidSetViewID;
      setViewID(event.nativeEvent.viewID);
      setReactTag(event.nativeEvent.reactTag);
      (_props$onDidSetViewID = props.onDidSetViewID) === null || _props$onDidSetViewID === void 0 || _props$onDidSetViewID.call(props, event);
      event.stopPropagation();
    },
    onViewDidDetachFromParent: event => {
      var _props$onViewDidDetac;
      (_props$onViewDidDetac = props.onViewDidDetachFromParent) === null || _props$onViewDidDetac === void 0 || _props$onViewDidDetac.call(props, event);
      event.stopPropagation();
      setIsDetachedInNative(true);
    },
    onContentViewDidDetach: event => {
      var _props$onContentViewD;
      (_props$onContentViewD = props.onContentViewDidDetach) === null || _props$onContentViewD === void 0 || _props$onContentViewD.call(props, event);
      event.stopPropagation();
      const detachedSubviewViewID = event.nativeEvent.viewID;
      const prevEntry = detachedSubviewsMap[detachedSubviewViewID];
      setDetachedSubviewsMap({
        ...detachedSubviewsMap,
        [detachedSubviewViewID]: {
          ...DEFAULT_DETACHED_SUBVIEW_ENTRY,
          ...prevEntry,
          didDetachFromOriginalParent: true
        }
      });
    }
  }), children);
});
const styles = StyleSheet.create({
  detachedView: {
    position: 'absolute',
    pointerEvents: 'none',
    opacity: 0
  },
  detachedViewDebug: {
    backgroundColor: 'rgba(255,0,0,0.3)'
  }
});
//# sourceMappingURL=RNIDetachedView.js.map