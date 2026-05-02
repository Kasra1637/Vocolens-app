function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
import React from 'react';
import { RefreshControl } from 'react-native';
import { useRefreshControl } from '../../hooks/scrollable/useRefreshControl';
export const RTVRefreshControl = /*#__PURE__*/React.memo(function RTVRefreshControl(props) {
  const {
    progressViewOffset
  } = useRefreshControl();
  return /*#__PURE__*/React.createElement(RefreshControl, _extends({}, props, {
    progressViewOffset: progressViewOffset
  }));
});
//# sourceMappingURL=RTVRefreshControl.js.map