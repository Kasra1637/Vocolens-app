import * as React from 'react';
import { View } from 'react-native';
export function Spacer(props) {
  return /*#__PURE__*/React.createElement(View, {
    style: {
      marginTop: props.space ?? 15
    }
  });
}
;
export function SpacerLine(props) {
  const spacerLineStyle = {
    paddingTop: props.space ?? 12,
    borderBottomWidth: props.lineThickness ?? 1,
    borderBottomColor: 'rgba(0,0,0,0.15)'
  };
  return /*#__PURE__*/React.createElement(View, {
    style: spacerLineStyle
  });
}
;
//# sourceMappingURL=Spacer.js.map