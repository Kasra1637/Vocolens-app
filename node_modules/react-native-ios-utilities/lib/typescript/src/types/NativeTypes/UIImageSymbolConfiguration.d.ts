import type { UIFontTextStyle } from "./UIFont";
export type UIImageSymbolWeight = 'unspecified' | 'ultraLight' | 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy' | 'black';
export type UIImageSymbolScale = 'default' | 'unspecified' | 'small' | 'medium' | 'large';
export type UIImageSymbolConfigurationNativeInit = {
    pointSize: number;
} | {
    pointSize: number;
    weight: UIImageSymbolWeight;
} | {
    pointSize: number;
    weight: UIImageSymbolWeight;
    scale: UIImageSymbolScale;
} | {
    textStyle: UIFontTextStyle;
} | {
    textStyle: UIFontTextStyle;
    scale: UIImageSymbolScale;
} | {
    weight: UIImageSymbolWeight;
} | {
    font: never;
} | {
    font: never;
    scale: UIImageSymbolScale;
} | {
    hierarchicalColor: string;
} | {
    paletteColors: Array<string>;
};
export type UIImageSymbolConfigurationModifiers = {
    modifier: 'preferringMulticolor';
} | {
    modifier: 'preferringMonochrome';
} | {
    modifier: 'unspecified';
};
export type UIImageSymbolConfigurationInit = {
    imageSymbolConfigItems: Array<UIImageSymbolConfigurationNativeInit | UIImageSymbolConfigurationModifiers>;
};
//# sourceMappingURL=UIImageSymbolConfiguration.d.ts.map