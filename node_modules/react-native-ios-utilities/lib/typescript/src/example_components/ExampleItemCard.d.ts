import * as React from 'react';
import { type ViewStyle } from 'react-native';
import { Colors } from '../misc/Colors';
export type ExampleItemCardProps = {
    colorPalette?: typeof Colors.BLUE;
    index?: number;
    title?: string;
    subtitle?: string;
    description?: Array<string | undefined>;
    style?: ViewStyle;
    extraContentContainerStyle?: ViewStyle;
    children?: JSX.Element | JSX.Element[];
};
export declare function ExampleItemCard(props: ExampleItemCardProps): React.JSX.Element;
//# sourceMappingURL=ExampleItemCard.d.ts.map