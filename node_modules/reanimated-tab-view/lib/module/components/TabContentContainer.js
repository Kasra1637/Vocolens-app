import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { useHandleTabContentLayout } from '../hooks/useTabLayout';
import { useInternalContext } from '../providers/Internal';
const TabContentContainer = /*#__PURE__*/React.memo(props => {
  const {
    index,
    style,
    children: renderTabContent
  } = props;
  const {
    animatedRouteIndex
  } = useInternalContext();
  const {
    handleTabContentLayout
  } = useHandleTabContentLayout(index);
  const activePercentSV = useDerivedValue(() => {
    return Math.min(100, 100 * Math.abs(animatedRouteIndex.value - index));
  });
  return /*#__PURE__*/React.createElement(View, {
    onLayout: handleTabContentLayout,
    style: [styles.tabBarItem, style]
  }, renderTabContent(activePercentSV));
});
export default TabContentContainer;
const styles = StyleSheet.create({
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center'
  }
});
//# sourceMappingURL=TabContentContainer.js.map