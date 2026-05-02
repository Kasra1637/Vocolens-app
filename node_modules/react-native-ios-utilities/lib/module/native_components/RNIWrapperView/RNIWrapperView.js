function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import * as React from 'react';
import { RNIWrapperNativeView } from './RNIWrapperNativeView';
export const RNIWrapperView = /*#__PURE__*/React.forwardRef((props, ref) => {
  const [viewID, setViewID] = React.useState();
  const [reactTag, setReactTag] = React.useState();
  React.useImperativeHandle(ref, () => ({
    getReactTag: () => {
      return reactTag;
    },
    getViewID: () => {
      return viewID;
    }
  }));
  return /*#__PURE__*/React.createElement(RNIWrapperNativeView, _extends({}, props, {
    onDidSetViewID: event => {
      var _props$onDidSetViewID;
      setViewID(event.nativeEvent.viewID);
      setReactTag(event.nativeEvent.reactTag);
      (_props$onDidSetViewID = props.onDidSetViewID) === null || _props$onDidSetViewID === void 0 || _props$onDidSetViewID.call(props, event);
      event.stopPropagation();
    }
  }), props.children);
});
//# sourceMappingURL=RNIWrapperView.js.map