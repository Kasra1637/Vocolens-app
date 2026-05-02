"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CardRowTextInput = void 0;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _Colors = require("../misc/Colors");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
class CardRowTextInput extends React.PureComponent {
  state = {
    textInput: ''
  };
  getText = () => {
    return this.state.textInput;
  };
  _handleOnChangeText = text => {
    this.setState({
      textInput: text
    });
  };
  render() {
    const props = this.props;
    return /*#__PURE__*/React.createElement(_reactNative.TextInput, {
      style: styles.cardRowTextInput,
      onChangeText: this._handleOnChangeText,
      placeholder: props.placeholder,
      placeholderTextColor: _Colors.Colors.INDIGO[300]
    });
  }
}
exports.CardRowTextInput = CardRowTextInput;
;
const styles = _reactNative.StyleSheet.create({
  cardRowTextInput: {
    backgroundColor: _Colors.Colors.INDIGO[100],
    fontSize: 12,
    color: _Colors.Colors.INDIGO[900],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 12
  }
});
//# sourceMappingURL=CardRowTextInput.js.map