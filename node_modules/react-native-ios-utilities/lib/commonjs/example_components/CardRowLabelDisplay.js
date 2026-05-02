"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CardRowLabelDisplay = CardRowLabelDisplay;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _Colors = require("../misc/Colors");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/**
 * ```
 * ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 
 *   Label              Value │
 * └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 
 * ```
 */
function CardRowLabelDisplay(props) {
  return /*#__PURE__*/React.createElement(_reactNative.View, {
    style: styles.cardRowLabelDisplayContainer
  }, /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardRowLabelDisplayLabelText
  }, props.label ?? 'Current Value'), /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardRowLabelDisplayValueText
  }, props.value ?? 'N/A'));
}
;
const styles = _reactNative.StyleSheet.create({
  cardRowLabelDisplayContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: _Colors.Colors.INDIGO[100],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardRowLabelDisplayLabelText: {
    fontSize: 12,
    fontWeight: '500',
    color: _Colors.Colors.PURPLE[1100],
    opacity: 0.75
  },
  cardRowLabelDisplayValueText: {
    fontSize: 12,
    fontWeight: '500',
    color: _Colors.Colors.PURPLE[1100],
    opacity: 0.4
  }
});
//# sourceMappingURL=CardRowLabelDisplay.js.map