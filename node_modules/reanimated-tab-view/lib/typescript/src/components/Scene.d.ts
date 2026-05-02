import React from 'react';
import type { SceneRendererProps } from '../types';
type SceneProps = {
    renderScene: (props: SceneRendererProps) => React.ReactNode;
} & SceneRendererProps;
export declare const Scene: React.MemoExoticComponent<({ renderScene, ...renderSceneProps }: SceneProps) => JSX.Element>;
export {};
//# sourceMappingURL=Scene.d.ts.map