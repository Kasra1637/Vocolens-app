import type { Point } from "../MiscTypes";
import type { ImageRectConfig } from "./ImageRectConfig";
export type ImageGradientPointPreset = 'top' | 'bottom' | 'left' | 'right' | 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
export type ImageGradientConfig = Partial<Pick<ImageRectConfig, 'width' | 'height' | 'borderRadius'>> & {
    colors: Array<string>;
    locations?: Array<number>;
    startPoint?: Point | ImageGradientPointPreset;
    endPoint?: Point | ImageGradientPointPreset;
    type?: 'axial' | 'conic' | 'radial';
};
//# sourceMappingURL=ImageGradientConfig.d.ts.map