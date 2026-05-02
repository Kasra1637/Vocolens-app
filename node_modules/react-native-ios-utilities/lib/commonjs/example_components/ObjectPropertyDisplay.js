"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ObjectPropertyDisplay = ObjectPropertyDisplay;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _Colors = require("../misc/Colors");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/**
 * ```
 * ┌─────────────────────────────┐
 * │ Property            'Value' │
 * │ Object                      │
 * │  Property           'Value' │
 * │  Property           'Value' │
 * └─────────────────────────────┘
 * ```
 */
function ObjectPropertyDisplay(props) {
  const hasObject = props.object != null;
  const objectKeys = hasObject ? Object.keys(props.object) : [];
  return hasObject ? /*#__PURE__*/React.createElement(_reactNative.View, {
    style: [styles.rootContainerBase, styles.rootContainerWhenHasObject, props.recursiveStyle, props.style]
  }, objectKeys.map((objKeyRaw, index) => {
    const objKey = String(objKeyRaw);
    const value = props.object[objKeyRaw];
    const isValueObj = typeof value === 'object' && value !== null;
    return isValueObj ? /*#__PURE__*/React.createElement(_reactNative.View, {
      key: `container-${objKey}-${index}`
    }, /*#__PURE__*/React.createElement(_reactNative.Text, {
      key: `label-${objKey}-${index}`,
      style: [styles.propertyLabelText, styles.propertyLabelObjectText, props.propertyLabelTextStyle]
    }, `${objKey}: `), /*#__PURE__*/React.createElement(ObjectPropertyDisplay, {
      key: `value-ObjectPropertyDisplay-${objKey}-${index}`,
      object: value,
      recursiveStyle: [styles.objectPropertyDisplay, props.recursiveStyle],
      propertyLabelTextStyle: props.propertyLabelTextStyle,
      propertyValueTextStyle: props.propertyValueTextStyle
    })) : /*#__PURE__*/React.createElement(_reactNative.View, {
      key: `container-${objKey}-${index}`,
      style: styles.rowContainer
    }, /*#__PURE__*/React.createElement(_reactNative.Text, {
      key: `label-${objKey}-${index}`,
      style: [styles.propertyLabelText, props.propertyLabelTextStyle]
    }, `${objKey}: `), /*#__PURE__*/React.createElement(_reactNative.Text, {
      key: `value-${objKey}-${index}`,
      style: [styles.propertyValueText, props.propertyValueTextStyle]
    }, isValueObj ? `...` : `'${props.object[objKeyRaw]}'`));
  })) : /*#__PURE__*/React.createElement(_reactNative.View, {
    style: [styles.rootContainerBase, styles.rootContainerWhenEmptyObject, props.recursiveStyle]
  }, /*#__PURE__*/React.createElement(_reactNative.Text, {
    style: [styles.emptyObjectText, props.emptyObjectText]
  }, 'Nothing to show'));
}
;
const styles = _reactNative.StyleSheet.create({
  rootContainerBase: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: _Colors.Colors.INDIGO[100],
    borderRadius: 10
  },
  rootContainerWhenEmptyObject: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  rootContainerWhenHasObject: {
    flexDirection: 'column',
    paddingVertical: 5
  },
  propertyLabelText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: _Colors.Colors.PURPLE[1100],
    opacity: 0.8
  },
  propertyLabelObjectText: {
    flex: 0
  },
  propertyValueText: {
    fontSize: 12,
    fontWeight: '300',
    color: _Colors.Colors.PURPLE[1100],
    opacity: 0.6
  },
  objectPropertyDisplay: {
    marginTop: 6,
    marginBottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 5
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  emptyObjectText: {
    opacity: 0.75
  }
});
//# sourceMappingURL=ObjectPropertyDisplay.js.map