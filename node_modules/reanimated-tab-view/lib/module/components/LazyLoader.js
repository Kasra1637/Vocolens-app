import React, { useEffect, useState } from 'react';
const LazyLoader = /*#__PURE__*/React.memo(({
  shouldLazyLoad,
  onMount,
  children
}) => {
  const [shouldRenderChildren, setShouldRenderChildren] = useState(false);
  useEffect(() => {
    onMount();
  }, [onMount]);
  useEffect(() => {
    if (shouldLazyLoad) {
      setTimeout(() => {
        setShouldRenderChildren(true);
      });
    }
  }, [shouldLazyLoad]);
  if (!shouldLazyLoad || shouldLazyLoad && shouldRenderChildren) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, children);
  }
  return null;
});
export default LazyLoader;
//# sourceMappingURL=LazyLoader.js.map