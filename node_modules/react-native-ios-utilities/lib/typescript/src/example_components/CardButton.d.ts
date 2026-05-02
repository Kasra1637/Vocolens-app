import * as React from 'react';
import { type StyleProp, type ViewStyle, type GestureResponderEvent } from 'react-native';
/**
 * ```
 * ┌─────────────────────────────┐
 * │ Title                       │
 * │ Subtitle                    │
 * └─────────────────────────────┘
 * ```
 */
export declare function CardButton(props: {
    style?: StyleProp<ViewStyle>;
    title: string;
    subtitle: string;
    onPress?: (event: GestureResponderEvent) => void;
    buttonColor?: string;
}): React.JSX.Element;
//# sourceMappingURL=CardButton.d.ts.map