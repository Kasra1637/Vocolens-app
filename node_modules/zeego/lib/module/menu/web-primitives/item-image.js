function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

import React from 'react';
import { create } from '../display-names';
const ItemImage = create(_ref => {
  let {
    source,
    accessibilityLabel,
    alt = accessibilityLabel,
    ...props
  } = _ref;

  if (typeof source === 'number') {
    console.warn(`[zeego] <ItemImage /> received an invalid source. This likely means you are using Expo Web/Metro Web.

To fix this, please see the docs: https://zeego.dev/components/context-menu#itemimage`);
  }

  return /*#__PURE__*/React.createElement("img", _extends({
    src: typeof source === 'string' ? source : typeof source === 'object' && 'uri' in source && typeof source.uri === 'string' ? source : typeof source === 'object' && 'src' in source && typeof source.src === 'string' // Next.js bundler turns into { src: string }
    ? source.src : source,
    alt: accessibilityLabel
  }, props));
}, 'ItemImage');
export { ItemImage };
//# sourceMappingURL=item-image.js.map