import * as React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Colors } from '../misc/Colors';

/**
 * ```
 * ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 
 *   Label              Value │
 * └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 
 * ```
 */
export function CardRowLabelDisplay(props) {
  return /*#__PURE__*/React.createElement(View, {
    style: styles.cardRowLabelDisplayContainer
  }, /*#__PURE__*/React.createElement(Text, {
    style: styles.cardRowLabelDisplayLabelText
  }, props.label ?? 'Current Value'), /*#__PURE__*/React.createElement(Text, {
    style: styles.cardRowLabelDisplayValueText
  }, props.value ?? 'N/A'));
}
;
const styles = StyleSheet.create({
  cardRowLabelDisplayContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: Colors.INDIGO[100],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardRowLabelDisplayLabelText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.PURPLE[1100],
    opacity: 0.75
  },
  cardRowLabelDisplayValueText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.PURPLE[1100],
    opacity: 0.4
  }
});
//# sourceMappingURL=CardRowLabelDisplay.js.map