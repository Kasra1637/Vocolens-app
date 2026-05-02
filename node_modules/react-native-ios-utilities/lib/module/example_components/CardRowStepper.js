import * as React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../misc/Colors';
export function CardRowStepper(props) {
  return /*#__PURE__*/React.createElement(View, {
    style: styles.cardRowStepperContainer
  }, /*#__PURE__*/React.createElement(View, {
    style: styles.cardRowStepperLabelContainer
  }, /*#__PURE__*/React.createElement(Text, {
    style: styles.cardRowStepperLabelText
  }, props.title ?? 'Title'), /*#__PURE__*/React.createElement(Text, {
    style: styles.cardRowStepperSubtitleText
  }, props.subtitle ?? `Current value: ${props.value ?? 0}`)), /*#__PURE__*/React.createElement(View, {
    style: styles.cardRowStepperButtonsContainer
  }, /*#__PURE__*/React.createElement(TouchableOpacity, {
    style: [styles.cardRowStepperButton, styles.cardRowStepperButtonLeft],
    onPress: () => {
      props.onValueChange(props.value - props.stepperAmount);
    }
  }, /*#__PURE__*/React.createElement(Text, {
    style: styles.cardRowStepperButtonLabel
  }, '–')), /*#__PURE__*/React.createElement(TouchableOpacity, {
    style: [styles.cardRowStepperButton, styles.cardRowStepperButtonRight],
    onPress: () => {
      props.onValueChange(props.value + props.stepperAmount);
    }
  }, /*#__PURE__*/React.createElement(Text, {
    style: styles.cardRowStepperButtonLabel
  }, '+'))));
}
;
const styles = StyleSheet.create({
  cardRowStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  cardRowStepperLabelContainer: {
    flex: 1
  },
  cardRowStepperLabelText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.PURPLE[1200]
  },
  cardRowStepperSubtitleText: {
    flex: 1,
    fontSize: 12,
    opacity: 0.5,
    color: Colors.PURPLE[1100]
  },
  cardRowStepperButtonsContainer: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 10
  },
  cardRowStepperButton: {
    padding: 10,
    backgroundColor: Colors.PURPLE.A200,
    width: 45,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardRowStepperButtonLeft: {
    marginRight: 0.5
  },
  cardRowStepperButtonRight: {
    marginLeft: 0.5
  },
  cardRowStepperButtonLabel: {
    fontWeight: '500',
    color: 'white',
    opacity: 0.9,
    fontSize: 16
  }
});
//# sourceMappingURL=CardRowStepper.js.map