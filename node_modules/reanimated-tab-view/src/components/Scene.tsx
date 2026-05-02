import React from 'react';
import type { SceneRendererProps } from '../types';

type SceneProps = {
  renderScene: (props: SceneRendererProps) => React.ReactNode;
} & SceneRendererProps;

export const Scene = React.memo(
  ({ renderScene, ...renderSceneProps }: SceneProps) => {
    return <>{renderScene(renderSceneProps)}</>;
  }
);
