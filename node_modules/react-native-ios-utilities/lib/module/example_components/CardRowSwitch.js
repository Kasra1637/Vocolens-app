import * as React from 'react';
import { StyleSheet, View, Text, Switch } from 'react-native';
import { Colors } from '../misc/Colors';

/**
 * ```
 * ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
 *   Title               ┌──┬─┐   
 * │ Subtitle            └──┴─┘  │
 *  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 
 * ```
 */
export function CardRowSwitch(props) {
  return /*#__PURE__*/React.createElement(View, {
    style: styles.cardRowSwitchContainer
  }, /*#__PURE__*/React.createElement(View, {
    style: styles.cardRowSwitchLabelContainer
  }, /*#__PURE__*/React.createElement(Text, {
    style: styles.cardRowSwitchLabelText
  }, props.title ?? 'title'), /*#__PURE__*/React.createElement(Text, {
    style: styles.cardRowSwitchSubtitleText
  }, props.subtitle ?? 'Toggle the value')), /*#__PURE__*/React.createElement(Switch, {
    value: props.value ?? false,
    onValueChange: props.onValueChange,
    trackColor: {
      true: Colors.PURPLE.A700,
      false: Colors.PURPLE.A100
    }
  }));
}
;
const styles = StyleSheet.create({
  cardRowSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  cardRowSwitchLabelContainer: {
    flex: 1,
    marginRight: 10
  },
  cardRowSwitchLabelText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.PURPLE[1200]
  },
  cardRowSwitchSubtitleText: {
    fontSize: 12,
    opacity: 0.5,
    color: Colors.PURPLE[1100]
  }
});
//# sourceMappingURL=CardRowSwitch.js.map