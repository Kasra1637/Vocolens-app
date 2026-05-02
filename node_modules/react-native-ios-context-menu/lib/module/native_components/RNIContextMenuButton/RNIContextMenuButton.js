"use strict";

import * as React from 'react';
import { RNIContextMenuButtonNativeView } from "./RNIContextMenuButtonNativeView.js";
import * as Helpers from "../../functions/Helpers.js";
import { jsx as _jsx } from "react/jsx-runtime";
export const RNIContextMenuButton = /*#__PURE__*/React.forwardRef((props, ref) => {
  const [viewID, setViewID] = React.useState();
  const [reactTag, setReactTag] = React.useState();
  React.useImperativeHandle(ref, () => ({
    getReactTag: () => {
      return reactTag;
    },
    getViewID: () => {
      return viewID;
    },
    presentMenu: async () => {
      if (viewID == null) return;
      const module = Helpers.getRNIUtilitiesModule();
      await module.viewCommandRequest(/* viewID     : */viewID, /* commandName: */'presentMenu', /* commandArgs: */{});
    },
    dismissMenu: async () => {
      if (viewID == null) return;
      const module = Helpers.getRNIUtilitiesModule();
      await module.viewCommandRequest(/* viewID     : */viewID, /* commandName: */'dismissMenu', /* commandArgs: */{});
    },
    provideDeferredElements: async (deferredID, menuItems) => {
      if (viewID == null) return;
      const module = Helpers.getRNIUtilitiesModule();
      const commandArgs = {
        deferredID,
        menuItems
      };
      await module.viewCommandRequest(/* viewID     : */viewID, /* commandName: */'provideDeferredElements', /* commandArgs: */commandArgs);
    }
  }));
  return /*#__PURE__*/_jsx(RNIContextMenuButtonNativeView, {
    ...props,
    onDidSetViewID: event => {
      setViewID(event.nativeEvent.viewID);
      setReactTag(event.nativeEvent.reactTag);
      props.onDidSetViewID?.(event);
    },
    children: props.children
  });
});
//# sourceMappingURL=RNIContextMenuButton.js.map