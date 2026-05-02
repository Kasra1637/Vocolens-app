import * as React from 'react';
import { type ListRenderItem } from 'react-native';
type CardRowColorPickerState = {
    selectedItem?: string;
};
type CardRowColorPickerProps = {
    initialSelectedColor?: string;
    colors?: string;
    onSelectItem?: (color?: string) => void;
};
export declare class CardRowColorPicker extends React.Component<CardRowColorPickerProps, CardRowColorPickerState> {
    constructor(props: CardRowColorPickerProps);
    _listRenderItem: ListRenderItem<string>;
    render(): React.JSX.Element;
}
export {};
//# sourceMappingURL=CardRowColorPicker.d.ts.map