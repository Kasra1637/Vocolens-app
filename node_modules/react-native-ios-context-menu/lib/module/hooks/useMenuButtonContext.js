"use strict";

import { useContext } from 'react';
import { ContextMenuButtonContext } from "../context/ContextMenuButtonContext.js";
export function useMenuButtonContext() {
  const context = useContext(ContextMenuButtonContext);
  if (context == null) {
    throw new Error("unable to get ContextMenuButtonContext");
  }
  ;
  return context;
}
;
//# sourceMappingURL=useMenuButtonContext.js.map