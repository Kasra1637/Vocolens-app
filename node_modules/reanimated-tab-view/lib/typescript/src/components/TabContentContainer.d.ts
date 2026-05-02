import React from 'react';
import { type ViewProps, type TextStyle, type StyleProp } from 'react-native';
import { type SharedValue } from 'react-native-reanimated';
import type { Scene } from '../types';
type TabContentContainerProps = Omit<ViewProps, 'children'> & {
    index: number;
    activeColor?: string;
    inactiveColor?: string;
    getLabelText?: (scene: Scene) => string | undefined;
    onTabPress?: (scene: Scene) => void;
    onTabLongPress?: (scene: Scene) => void;
    labelStyle?: StyleProp<TextStyle>;
    children: (activePercentSV: SharedValue<number>) => React.ReactNode;
};
declare const TabContentContainer: React.NamedExoticComponent<TabContentContainerProps>;
export default TabContentContainer;
//# sourceMappingURL=TabContentContainer.d.ts.map