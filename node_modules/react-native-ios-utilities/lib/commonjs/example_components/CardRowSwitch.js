"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CardRowSwitch = CardRowSwitch;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _Colors = require("../misc/Colors");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/**
 * ```
 * ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
 *   Title               ┌──┬─┐   
 * │ Subtitle            └──┴─┘  │
 *  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 
 * ```
 */
function CardRowSwitch(props) {
  return /*#__PURE__*/React.createElement(_reactNative.View, {
    style: styles.cardRowSwitchContainer
  }, /*#__PURE__*/React.createElement(_reactNative.View, {
    style: styles.cardRowSwitchLabelContainer
  }, /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardRowSwitchLabelText
  }, props.title ?? 'title'), /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardRowSwitchSubtitleText
  }, props.subtitle ?? 'Toggle the value')), /*#__PURE__*/React.createElement(_reactNative.Switch, {
    value: props.value ?? false,
    onValueChange: props.onValueChange,
    trackColor: {
      true: _Colors.Colors.PURPLE.A700,
      false: _Colors.Colors.PURPLE.A100
    }
  }));
}
;
const styles = _reactNative.StyleSheet.create({
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
    color: _Colors.Colors.PURPLE[1200]
  },
  cardRowSwitchSubtitleText: {
    fontSize: 12,
    opacity: 0.5,
    color: _Colors.Colors.PURPLE[1100]
  }
});
//# sourceMappingURL=CardRowSwitch.js.map