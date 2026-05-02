import React from 'react';
import { RefreshControl } from 'react-native';
import type { RefreshControlProps } from 'react-native';
import { useRefreshControl } from '../../hooks/scrollable/useRefreshControl';

export const RTVRefreshControl = React.memo(function RTVRefreshControl(
  props: RefreshControlProps
) {
  const { progressViewOffset } = useRefreshControl();
  return <RefreshControl {...props} progressViewOffset={progressViewOffset} />;
});
