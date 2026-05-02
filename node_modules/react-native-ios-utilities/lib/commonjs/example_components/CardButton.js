"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CardButton = CardButton;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _Colors = require("../misc/Colors");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/**
 * ```
 * ┌─────────────────────────────┐
 * │ Title                       │
 * │ Subtitle                    │
 * └─────────────────────────────┘
 * ```
 */
function CardButton(props) {
  const buttonColor = props.buttonColor ?? _Colors.Colors.PURPLE.A200;
  return /*#__PURE__*/React.createElement(_reactNative.TouchableOpacity, {
    style: [props.style, styles.cardButtonContainer, {
      backgroundColor: buttonColor
    }],
    onPress: props.onPress
  }, /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardButtonTitleText
  }, props.title), /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardButtonSubtitleText
  }, props.subtitle)));
}
;
const styles = _reactNative.StyleSheet.create({
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