import React from 'react';
declare const ItemImage: React.FC<Omit<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, "height" | "width" | "ref" | "src"> & {
    source: (number | import("react-native").ImageURISource) | {
        src: string;
    };
    width?: number;
    height?: number;
    ios?: {
        style?: import("react-native-ios-utilities").ImageOptions;
        lazy?: boolean;
    };
    accessibilityLabel?: string;
}>;
export { ItemImage };
