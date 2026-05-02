"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useMenuContext = useMenuContext;
var _react = require("react");
var _ContextMenuViewContext = require("../context/ContextMenuViewContext.js");
function useMenuContext() {
  const context = (0, _react.useContext)(_ContextMenuViewContext.ContextMenuViewContext);
  if (context == null) {
    throw new Error("unable to get ContextMenuViewContext");
  }
  ;
  return context;
}
;
//# sourceMappingURL=useMenuContext.js.map