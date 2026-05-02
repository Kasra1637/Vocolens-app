"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RNIContextMenuView = void 0;
var React = _interopRequireWildcard(require("react"));
var _RNIContextMenuNativeView = require("./RNIContextMenuNativeView.js");
var Helpers = _interopRequireWildcard(require("../../functions/Helpers.js"));
var _jsxRuntime = require("react/jsx-runtime");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const RNIContextMenuView = exports.RNIContextMenuView = /*#__PURE__*/React.forwardRef((props, ref) => {
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
    showAuxiliaryPreviewAsPopover: async () => {
      if (viewID == null) return;
      const module = Helpers.getRNIUtilitiesModule();
      await module.viewCommandRequest(/* viewID     : */viewID, /* commandName: */'showAuxiliaryPreviewAsPopover', /* commandArgs: */{});
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
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_RNIContextMenuNativeView.RNIContextMenuNativeView, {
    ...props,
    onDidSetViewID: event => {
      setViewID(event.nativeEvent.viewID);
      setReactTag(event.nativeEvent.reactTag);
      props.onDidSetViewID?.(event);
      event.stopPropagation();
    },
    children: props.children
  });
});
//# sourceMappingURL=RNIContextMenuView.js.map