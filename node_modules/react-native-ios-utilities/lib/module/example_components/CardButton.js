import * as React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../misc/Colors';

/**
 * ```
 * ┌─────────────────────────────┐
 * │ Title                       │
 * │ Subtitle                    │
 * └─────────────────────────────┘
 * ```
 */
export function CardButton(props) {
  const buttonColor = props.buttonColor ?? Colors.PURPLE.A200;
  return /*#__PURE__*/React.createElement(TouchableOpacity, {
    style: [props.style, styles.cardButtonContainer, {
      backgroundColor: buttonColor
    }],
    onPress: props.onPress
  }, /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Text, {
    style: styles.cardButtonTitleText
  }, props.title), /*#__PURE__*/React.createElement(Text, {
    style: styles.cardButtonSubtitleText
  }, props.subtitle)));
}
;
const styles = StyleSheet.create({
  cardButtonContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12
  },
  cardButtonTitleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700'
  },
  cardButtonSubtitleText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400'
  }
});
//# sourceMappingURL=CardButton.js.map