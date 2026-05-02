import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../misc/Colors';
export const CardBody = props => {
  return /*#__PURE__*/React.createElement(View, {
    style: [styles.cardBodyContainer, props.style]
  }, props.children);
};
const styles = StyleSheet.create({
  cardBodyContainer: {
    paddingHorizontal: 12,
    paddingVertical: 15,
    marginHorizontal: 10,
    marginVertical: 10,
    backgroundColor: Colors.PURPLE[50],
    borderRadius: 10
  }
});
//# sourceMappingURL=CardBody.js.map