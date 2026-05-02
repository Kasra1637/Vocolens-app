"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useLayout = useLayout;
var _react = require("react");
function useLayout() {
  const [layout, setLayout] = (0, _react.useState)({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });
  const onLayout = (0, _react.useCallback)(({
    nativeEvent
  }) => {
    const {
      x,
      y,
      width,
      height
    } = nativeEvent.layout;
    setLayout(prevLayout => ({
      ...prevLayout,
      x,
      y,
      width,
      height
    }));
  }, []);
  return {
    onLayout,
    ...layout
  };
}
//# sourceMappingURL=useLayout.js.map