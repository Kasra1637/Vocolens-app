import * as React from 'react';
import { StyleSheet, View } from 'react-native';
export function TriangleView(props) {
  const {
    width,
    height,
    color
  } = props;
  const shapeWidth = width ?? (height == null ? width : 30);
  const shapeHeight = height ?? (width == null ? height : 30);
  const containerStyle = {
    borderLeftWidth: shapeHeight,
    borderRightWidth: shapeHeight,
    borderBottomWidth: shapeWidth,
    borderBottomColor: color ?? "red"
  };
  return /*#__PURE__*/React.createElement(View, {
    style: [styles.triangleContainer, containerStyle, props.style]
  }, props.children);
}
;
export function CircleView(props) {
  const size = props.size ?? 30;
  const containerStyle = {
    height: size,
    aspectRatio: 1,
    borderRadius: size / 2,
    backgroundColor: props.color ?? 'white'
  };
  return /*#__PURE__*/React.createElement(View, {
    style: [containerStyle, props.style]
  }, props.children);
}
;
const styles = StyleSheet.create({
  triangleContainer: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent"
  }
});
//# sourceMappingURL=ViewShapes.js.map