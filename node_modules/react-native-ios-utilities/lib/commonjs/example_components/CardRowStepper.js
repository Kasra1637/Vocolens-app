"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CardRowStepper = CardRowStepper;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _Colors = require("../misc/Colors");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function CardRowStepper(props) {
  return /*#__PURE__*/React.createElement(_reactNative.View, {
    style: styles.cardRowStepperContainer
  }, /*#__PURE__*/React.createElement(_reactNative.View, {
    style: styles.cardRowStepperLabelContainer
  }, /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardRowStepperLabelText
  }, props.title ?? 'Title'), /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardRowStepperSubtitleText
  }, props.subtitle ?? `Current value: ${props.value ?? 0}`)), /*#__PURE__*/React.createElement(_reactNative.View, {
    style: styles.cardRowStepperButtonsContainer
  }, /*#__PURE__*/React.createElement(_reactNative.TouchableOpacity, {
    style: [styles.cardRowStepperButton, styles.cardRowStepperButtonLeft],
    onPress: () => {
      props.onValueChange(props.value - props.stepperAmount);
    }
  }, /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardRowStepperButtonLabel
  }, '–')), /*#__PURE__*/React.createElement(_reactNative.TouchableOpacity, {
    style: [styles.cardRowStepperButton, styles.cardRowStepperButtonRight],
    onPress: () => {
      props.onValueChange(props.value + props.stepperAmount);
    }
  }, /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardRowStepperButtonLabel
  }, '+'))));
}
;
const styles = _reactNative.StyleSheet.create({
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
    color: _Colors.Colors.PURPLE[1200]
  },
  cardRowStepperSubtitleText: {
    flex: 1,
    fontSize: 12,
    opacity: 0.5,
    color: _Colors.Colors.PURPLE[1100]
  },
  cardRowStepperButtonsContainer: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 10
  },
  cardRowStepperButton: {
    padding: 10,
    backgroundColor: _Colors.Colors.PURPLE.A200,
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