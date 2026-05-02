import { SHOULD_RENDER_ABSOLUTE_HEADER } from '../../constants/scrollable';
import { useInternalContext } from '../../providers/Internal';

export const useRefreshControl = () => {
  //#region context
  const { tabViewHeaderLayout, tabBarLayout } = useInternalContext();
  //#endregion

  return {
    progressViewOffset: SHOULD_RENDER_ABSOLUTE_HEADER
      ? tabViewHeaderLayout.height + tabBarLayout.height
      : 0,
  };
};
