import * as React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Colors } from '../misc/Colors';

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
export function ObjectPropertyDisplay(props) {
  const hasObject = props.object != null;
  const objectKeys = hasObject ? Object.keys(props.object) : [];
  return hasObject ? /*#__PURE__*/React.createElement(View, {
    style: [styles.rootContainerBase, styles.rootContainerWhenHasObject, props.recursiveStyle, props.style]
  }, objectKeys.map((objKeyRaw, index) => {
    const objKey = String(objKeyRaw);
    const value = props.object[objKeyRaw];
    const isValueObj = typeof value === 'object' && value !== null;
    return isValueObj ? /*#__PURE__*/React.createElement(View, {
      key: `container-${objKey}-${index}`
    }, /*#__PURE__*/React.createElement(Text, {
      key: `label-${objKey}-${index}`,
      style: [styles.propertyLabelText, styles.propertyLabelObjectText, props.propertyLabelTextStyle]
    }, `${objKey}: `), /*#__PURE__*/React.createElement(ObjectPropertyDisplay, {
      key: `value-ObjectPropertyDisplay-${objKey}-${index}`,
      object: value,
      recursiveStyle: [styles.objectPropertyDisplay, props.recursiveStyle],
      propertyLabelTextStyle: props.propertyLabelTextStyle,
      propertyValueTextStyle: props.propertyValueTextStyle
    })) : /*#__PURE__*/React.createElement(View, {
      key: `container-${objKey}-${index}`,
      style: styles.rowContainer
    }, /*#__PURE__*/React.createElement(Text, {
      key: `label-${objKey}-${index}`,
      style: [styles.propertyLabelText, props.propertyLabelTextStyle]
    }, `${objKey}: `), /*#__PURE__*/React.createElement(Text, {
      key: `value-${objKey}-${index}`,
      style: [styles.propertyValueText, props.propertyValueTextStyle]
    }, isValueObj ? `...` : `'${props.object[objKeyRaw]}'`));
  })) : /*#__PURE__*/React.createElement(View, {
    style: [styles.rootContainerBase, styles.rootContainerWhenEmptyObject, props.recursiveStyle]
  }, /*#__PURE__*/React.createElement(Text, {
    style: [styles.emptyObjectText, props.emptyObjectText]
  }, 'Nothing to show'));
}
;
const styles = StyleSheet.create({
  rootContainerBase: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.INDIGO[100],
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
    color: Colors.PURPLE[1100],
    opacity: 0.8
  },
  propertyLabelObjectText: {
    flex: 0
  },
  propertyValueText: {
    fontSize: 12,
    fontWeight: '300',
    color: Colors.PURPLE[1100],
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