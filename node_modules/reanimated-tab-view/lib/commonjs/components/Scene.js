"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Scene = void 0;
var _react = _interopRequireDefault(require("react"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const Scene = exports.Scene = /*#__PURE__*/_react.default.memo(({
  renderScene,
  ...renderSceneProps
}) => {
  return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, renderScene(renderSceneProps));
});
//# sourceMappingURL=Scene.js.map