function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as React from 'react';
import { create } from '../menu/display-names';
const Root = create(DropdownMenu.Root, 'Root');
const Trigger = create(DropdownMenu.Trigger, 'Trigger');
const Content = create(props => {
  return /*#__PURE__*/React.createElement(DropdownMenu.Portal, null, /*#__PURE__*/React.createElement(DropdownMenu.Content, props));
}, 'Content');
const Item = create(props => {
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
const SubTrigger = create(props => /*#__PURE__*/React.createElement(DropdownMenu.SubTrigger, props), 'SubTrigger');
const Group = create(DropdownMenu.Group, 'Group');
const Separator = create(DropdownMenu.Separator, 'Separator');
const CheckboxItem = create(_ref => {
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
const ItemIndicator = create(DropdownMenu.ItemIndicator, 'ItemIndicator');
const ItemIcon = create(_ref2 => {
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
const Arrow = create(DropdownMenu.Arrow, 'Arrow');
const Sub = create(DropdownMenu.Sub, 'Sub');
const SubContent = create(props => /*#__PURE__*/React.createElement(DropdownMenu.Portal, null, /*#__PURE__*/React.createElement(DropdownMenu.SubContent, props)), 'SubContent');
export { Root, Trigger, Content, Item, SubTrigger, Group, Separator, CheckboxItem, ItemIndicator, ItemIcon, Arrow, Sub, SubContent };
export { ItemImage } from '../menu/web-primitives/item-image';
export { Label } from './web/label';
export { ItemTitle, ItemSubtitle } from '../menu';
//# sourceMappingURL=dropdown-menu.js.map