import { useCallback, useState } from 'react';
export function useLayout() {
  const [layout, setLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });
  const onLayout = useCallback(({
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