"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ItemIcon = exports.Item = exports.Group = exports.Content = exports.CheckboxItem = exports.Arrow = void 0;
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
exports.Trigger = exports.SubTrigger = exports.SubContent = exports.Sub = exports.Separator = exports.Root = void 0;

var DropdownMenu = _interopRequireWildcard(require("@radix-ui/react-dropdown-menu"));

var React = _interopRequireWildcard(require("react"));

var _displayNames = require("../menu/display-names");

var _itemImage = require("../menu/web-primitives/item-image");

var _label = require("./web/label");

var _menu = require("../menu");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const Root = (0, _displayNames.create)(DropdownMenu.Root, 'Root');
exports.Root = Root;
const Trigger = (0, _displayNames.create)(DropdownMenu.Trigger, 'Trigger');
exports.Trigger = Trigger;
const Content = (0, _displayNames.create)(props => {
  return /*#__PURE__*/React.createElement(DropdownMenu.Portal, null, /*#__PURE__*/React.createElement(DropdownMenu.Content, props));
}, 'Content');
exports.Content = Content;
const Item = (0, _displayNames.create)(props => {
  return /*#__PURE__*/React.createElement(DropdownMenu.Item, _extends({}, props, {
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
const SubTrigger = (0, _displayNames.create)(props => /*#__PURE__*/React.createElement(DropdownMenu.SubTrigger, props), 'SubTrigger');
exports.SubTrigger = SubTrigger;
const Group = (0, _displayNames.create)(DropdownMenu.Group, 'Group');
exports.Group = Group;
const Separator = (0, _displayNames.create)(DropdownMenu.Separator, 'Separator');
exports.Separator = Separator;
const CheckboxItem = (0, _displayNames.create)(_ref => {
  let {
    shouldDismissMenuOnSelect,
    onValueChange,
    value,
    ...props
  } = _ref;
  return /*#__PURE__*/React.createElement(DropdownMenu.CheckboxItem, _extends({}, props, {
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
const ItemIndicator = (0, _displayNames.create)(DropdownMenu.ItemIndicator, 'ItemIndicator');
exports.ItemIndicator = ItemIndicator;
const ItemIcon = (0, _displayNames.create)(_ref2 => {
  let {
    children,
    style,
    className
  } = _ref2;
  return /*#__PURE__*/React.createElement("div", {
    style: style,
    className: className
  }, children);
}, 'ItemIcon');
exports.ItemIcon = ItemIcon;
const Arrow = (0, _displayNames.create)(DropdownMenu.Arrow, 'Arrow');
exports.Arrow = Arrow;
const Sub = (0, _displayNames.create)(DropdownMenu.Sub, 'Sub');
exports.Sub = Sub;
const SubContent = (0, _displayNames.create)(props => /*#__PURE__*/React.createElement(DropdownMenu.Portal, null, /*#__PURE__*/React.createElement(DropdownMenu.SubContent, props)), 'SubContent');
exports.SubContent = SubContent;
//# sourceMappingURL=dropdown-menu.js.map