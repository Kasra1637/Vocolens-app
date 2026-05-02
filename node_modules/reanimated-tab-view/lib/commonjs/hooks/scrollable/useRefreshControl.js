"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useRefreshControl = void 0;
var _scrollable = require("../../constants/scrollable");
var _Internal = require("../../providers/Internal");
const useRefreshControl = () => {
  //#region context
  const {
    tabViewHeaderLayout,
    tabBarLayout
  } = (0, _Internal.useInternalContext)();
  //#endregion

  return {
    progressViewOffset: _scrollable.SHOULD_RENDER_ABSOLUTE_HEADER ? tabViewHeaderLayout.height + tabBarLayout.height : 0
  };
};
exports.useRefreshControl = useRefreshControl;
//# sourceMappingURL=useRefreshControl.js.map