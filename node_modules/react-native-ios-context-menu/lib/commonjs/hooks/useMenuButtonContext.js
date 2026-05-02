"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useMenuButtonContext = useMenuButtonContext;
var _react = require("react");
var _ContextMenuButtonContext = require("../context/ContextMenuButtonContext.js");
function useMenuButtonContext() {
  const context = (0, _react.useContext)(_ContextMenuButtonContext.ContextMenuButtonContext);
  if (context == null) {
    throw new Error("unable to get ContextMenuButtonContext");
  }
  ;
  return context;
}
;
//# sourceMappingURL=useMenuButtonContext.js.map