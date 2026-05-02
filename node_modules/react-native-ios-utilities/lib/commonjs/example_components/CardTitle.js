"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CardTitle = CardTitle;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _Colors = require("../misc/Colors");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/**
 * ```
 * ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
 *              .─────────────.   
 * │ Title     (  Pill  Title  ) │
 *              `─────────────'   
 * │ Subtitle...                 │
 *  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 
 * ```
 */
function CardTitle(props) {
  const hasTitle = props.title != null;
  const cardPillWrapper = {
    marginLeft: hasTitle ? 10 : 0
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(_reactNative.View, {
    style: [styles.cardTitleContainer, {
      marginTop: props.extraMarginTop ?? 0
    }]
  }, /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardTitle
  }, props.title ?? ''), props.pillTitle && /*#__PURE__*/React.createElement(_reactNative.View, {
    style: [styles.cardPillWrapper, cardPillWrapper]
  }, /*#__PURE__*/React.createElement(_reactNative.View, {
    style: styles.cardPillContainer
  }, /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardPillTitleText,
    numberOfLines: 1
  }, props.pillTitle)))), props.subtitle && /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: styles.cardSubtitleText
  }, props.subtitle ?? 'subtitle'));
}
;
const styles = _reactNative.StyleSheet.create({
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  cardPillWrapper: {
    flex: 1,
    alignItems: 'flex-start'
  },
  cardPillContainer: {
    backgroundColor: _Colors.Colors.BLUE.A400,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10
  },
  cardPillTitleText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  cardSubtitleText: {
    marginTop: 7,
    fontWeight: '300',
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)'
  }
});
//# sourceMappingURL=CardTitle.js.map