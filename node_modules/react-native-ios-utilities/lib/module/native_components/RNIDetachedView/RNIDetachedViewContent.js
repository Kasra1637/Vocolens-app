function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { RNIWrapperView } from '../../native_components/RNIWrapperView';
import { DEFAULT_DETACHED_SUBVIEW_ENTRY } from './DetachedSubviewsMap';
import { IS_USING_NEW_ARCH } from '../../constants/LibEnv';
export function RNIDetachedViewContent(props) {
  var _props$detachedSubvie;
  const [viewID, setViewID] = React.useState();
  const wrapperStyle = [props.shouldEnableDebugBackgroundColors && styles.wrapperViewDebug, props.contentContainerStyle];
  const detachedSubviewEntry = (viewID != null ? (_props$detachedSubvie = props.detachedSubviewsMap) === null || _props$detachedSubvie === void 0 ? void 0 : _props$detachedSubvie[viewID] : undefined) ?? DEFAULT_DETACHED_SUBVIEW_ENTRY;
  const didDetach = (props.isParentDetached ?? false) || detachedSubviewEntry.didDetachFromOriginalParent;
  return /*#__PURE__*/React.createElement(RNIWrapperView, _extends({}, props, {
    style: [...(IS_USING_NEW_ARCH ? wrapperStyle : []), didDetach ? styles.wrapperViewDetached : styles.wrapperViewAttached, props.style],
    onDidSetViewID: event => {
      var _props$onDidSetViewID, _props$onDidSetViewID2;
      (_props$onDidSetViewID = props.onDidSetViewID) === null || _props$onDidSetViewID === void 0 || _props$onDidSetViewID.call(props, event);
      setViewID(event.nativeEvent.viewID);
      (_props$onDidSetViewID2 = props.onDidSetViewID) === null || _props$onDidSetViewID2 === void 0 || _props$onDidSetViewID2.call(props, event);
      event.stopPropagation();
    }
  }), IS_USING_NEW_ARCH ? props.children : /*#__PURE__*/React.createElement(View, {
    style: [styles.innerWrapperContainerForPaper, ...wrapperStyle]
  }, props.children));
}
;
const styles = StyleSheet.create({
  wrapperViewAttached: {},
  wrapperViewDetached: {},
  wrapperViewDebug: {
    backgroundColor: 'rgba(255,0,255,0.3)'
  },
  innerWrapperContainerForPaper: {
    flex: 1
  }
});
//# sourceMappingURL=RNIDetachedViewContent.js.map