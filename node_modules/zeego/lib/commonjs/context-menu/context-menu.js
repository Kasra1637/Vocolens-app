"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ItemIcon = exports.Item = exports.Group = exports.Content = exports.CheckboxItem = exports.Auxiliary = exports.Arrow = void 0;
Object.defineProperty(exports, "ItemImage", {
  enumerable: true,
  get: function () {
    return _itemImage.ItemImage;
  }
});
exports.ItemIndicator = void 0;
Object.defineProperty(exports, "ItemSubtitle", {
  enumerable: true,
  get: function () {
    return _menu.ItemSubtitle;
  }
});
Object.defineProperty(exports, "ItemTitle", {
  enumerable: true,
  get: function () {
    return _menu.ItemTitle;
  }
});
Object.defineProperty(exports, "Label", {
  enumerable: true,
  get: function () {
    return _label.Label;
  }
});
exports.Trigger = exports.SubTrigger = exports.SubContent = exports.Sub = exports.Separator = exports.Root = exports.Preview = void 0;

var ContextMenu = _interopRequireWildcard(require("@radix-ui/react-context-menu"));

var _react = _interopRequireDefault(require("react"));

var _displayNames = require("../menu/display-names");

var _itemImage = require("../menu/web-primitives/item-image");

var _label = require("./web/label");

var _menu = require("../menu");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const Root = (0, _displayNames.create)(ContextMenu.Root, 'Root');
exports.Root = Root;
const Trigger = (0, _displayNames.create)(ContextMenu.Trigger, 'Trigger');
exports.Trigger = Trigger;
const Content = (0, _displayNames.create)(props => /*#__PURE__*/_react.default.createElement(ContextMenu.Portal, null, /*#__PURE__*/_react.default.createElement(ContextMenu.Content, props)), 'Content');
exports.Content = Content;
const Item = (0, _displayNames.create)(props => {
  return /*#__PURE__*/_react.default.createElement(ContextMenu.Item, _extends({}, props, {
    onSelect: e => {
      var _props$onSelect;

      if (props.shouldDismissMenuOnSelect === false) {
        e.preventDefault();
      }

      (_props$onSelect = props.onSelect) === null || _props$onSelect === void 0 ? void 0 : _props$onSelect.call(props);
    }
  }));
}, 'Item');
exports.Item = Item;
const SubTrigger = (0, _displayNames.create)(props => /*#__PURE__*/_react.default.createElement(ContextMenu.SubTrigger, props), 'SubTrigger');
exports.SubTrigger = SubTrigger;
const Group = (0, _displayNames.create)(ContextMenu.Group, 'Group');
exports.Group = Group;
const Separator = (0, _displayNames.create)(ContextMenu.Separator, 'Separator');
exports.Separator = Separator;
const CheckboxItem = (0, _displayNames.create)(_ref => {
  let {
    shouldDismissMenuOnSelect,
    onValueChange,
    value,
    ...props
  } = _ref;
  return /*#__PURE__*/_react.default.createElement(ContextMenu.CheckboxItem, _extends({}, props, {
    checked: typeof value === 'boolean' ? value : value !== 'off',
    onSelect: e => {
      const current = value === true ? 'on' : value === false ? 'off' : value;
      const next = current === 'on' ? 'off' : 'on';
      onValueChange === null || onValueChange === void 0 ? void 0 : onValueChange(next, current);

      if (shouldDismissMenuOnSelect === false) {
        e.preventDefault();
      }
    }
  }));
}, 'CheckboxItem');
exports.CheckboxItem = CheckboxItem;
const ItemIndicator = (0, _displayNames.create)(ContextMenu.ItemIndicator, 'ItemIndicator');
exports.ItemIndicator = ItemIndicator;
const ItemIcon = (0, _displayNames.create)(_ref2 => {
  let {
    style,
    className,
    children
  } = _ref2;
  return /*#__PURE__*/_react.default.createElement("div", {
    style: style,
    className: className
  }, children);
}, 'ItemIcon');
exports.ItemIcon = ItemIcon;
const Preview = (0, _displayNames.create)(() => null, 'Preview');
exports.Preview = Preview;
const Arrow = (0, _displayNames.create)(ContextMenu.Arrow, 'Arrow');
exports.Arrow = Arrow;
const Sub = (0, _displayNames.create)(props => /*#__PURE__*/_react.default.createElement(ContextMenu.Sub, props), 'Sub');
exports.Sub = Sub;
const SubContent = (0, _displayNames.create)(props => /*#__PURE__*/_react.default.createElement(ContextMenu.Portal, null, /*#__PURE__*/_react.default.createElement(ContextMenu.SubContent, props)), 'SubContent');
exports.SubContent = SubContent;
const Auxiliary = (0, _displayNames.create)(_ => null, 'Auxiliary');
exports.Auxiliary = Auxiliary;
//# sourceMappingURL=context-menu.js.map