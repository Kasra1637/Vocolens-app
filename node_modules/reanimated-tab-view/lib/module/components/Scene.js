import React from 'react';
export const Scene = /*#__PURE__*/React.memo(({
  renderScene,
  ...renderSceneProps
}) => {
  return /*#__PURE__*/React.createElement(React.Fragment, null, renderScene(renderSceneProps));
});
//# sourceMappingURL=Scene.js.map