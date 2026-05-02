import * as React from 'react';
import { type ViewStyle, type TextStyle, type StyleProp } from 'react-native';
/**
 * ```
 * ┌─────────────────────────────┐
 * │ Property            'Value' │
 * │ Object                      │
 * │  Property           'Value' │
 * │  Property           'Value' │
 * └─────────────────────────────┘
 * ```
 */
export declare function ObjectPropertyDisplay<T extends {}>(props: {
    object?: T;
    style?: StyleProp<ViewStyle>;
    recursiveStyle?: StyleProp<ViewStyle>;
    propertyLabelTextStyle?: TextStyle;
    propertyValueTextStyle?: TextStyle;
    emptyObjectText?: TextStyle;
}): React.JSX.Element;
//# sourceMappingURL=ObjectPropertyDisplay.d.ts.map