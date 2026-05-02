import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { useHandleTabLayout } from '../hooks/useTabLayout';
import { useInternalContext } from '../providers/Internal';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const Tab = /*#__PURE__*/React.memo(({
  index,
  route,
  style,
  children,
  onTabPress,
  onTabLongPress
}) => {
  const {
    jumpTo
  } = useInternalContext();
  const {
    handleTabLayout
  } = useHandleTabLayout(index);
  const handlePressTabItem = useCallback(() => {
    const scene = {
      route
    };
    onTabPress === null || onTabPress === void 0 || onTabPress(scene);
    jumpTo(route.key);
  }, [jumpTo, onTabPress, route]);
  const handleLongPressTabItem = useCallback(() => {
    const scene = {
      route
    };
    onTabLongPress === null || onTabLongPress === void 0 || onTabLongPress(scene);
    jumpTo(route.key);
  }, [jumpTo, onTabLongPress, route]);
  return /*#__PURE__*/React.createElement(AnimatedPressable, {
    onLayout: handleTabLayout,
    onPress: handlePressTabItem,
    onLongPress: handleLongPressTabItem,
    style: style
  }, children);
});
export default Tab;
//# sourceMappingURL=Tab.js.map