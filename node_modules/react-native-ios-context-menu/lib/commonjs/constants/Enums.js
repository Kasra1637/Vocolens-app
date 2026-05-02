"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PreviewType = exports.PreviewSize = exports.PreviewConfigKeys = exports.MenuOptions = exports.MenuElementState = exports.MenuElementAtrributes = exports.MenuConfigKeys = exports.MenuActionKeys = exports.IconTypes = exports.IconConfigKeys = exports.CommitStyle = void 0;
/** Used for `IconConfigKeys.iconType` or `IconConfigKeys.iconType` */
const IconTypes = exports.IconTypes = {
  'NONE': 'NONE',
  'SYSTEM': 'SYSTEM',
  'ASSET': 'ASSET',
  'REQUIRE': 'REQUIRE'
};

/** Used for `MenuConfigKeys.menuOptions` */
const MenuOptions = exports.MenuOptions = {
  destructive: 'destructive',
  displayInline: 'displayInline'
};

/** Used for `MenuActionKeys.menuAttributes` */
const MenuElementAtrributes = exports.MenuElementAtrributes = {
  hidden: 'hidden',
  disabled: 'disabled',
  destructive: 'destructive'
};

/** Used for `MenuActionKeys.menuState` */
const MenuElementState = exports.MenuElementState = {
  on: 'on',
  off: 'off',
  mixed: 'mixed'
};

/** Used for `PreviewConfigKeys.previewType` */
const PreviewType = exports.PreviewType = {
  'DEFAULT': 'DEFAULT',
  'CUSTOM': 'CUSTOM'
};

/** Used for `PreviewConfigKeys.previewSize` */
const PreviewSize = exports.PreviewSize = {
  'INHERIT': 'INHERIT',
  'STRETCH': 'STRETCH'
};

/** Used for `PreviewConfigKeys.preferredCommitStyle` */
const CommitStyle = exports.CommitStyle = {
  'pop': 'pop',
  'dismiss': 'dismiss'
};
const IconConfigKeys = exports.IconConfigKeys = {
  iconType: 'iconType',
  iconValue: 'iconValue',
  iconTint: 'iconTint'
};
const PreviewConfigKeys = exports.PreviewConfigKeys = {
  previewType: 'previewType',
  // optional - PreviewType value
  previewSize: 'previewSize',
  // optional - PreviewSize value
  isResizeAnimated: 'isResizeAnimated',
  // optional - bool
  borderRadius: 'borderRadius',
  // optional - number
  backgroundColor: 'backgroundColor',
  // optional - string
  preferredCommitStyle: 'preferredCommitStyle' // optional - CommitStyle value
};
const MenuActionKeys = exports.MenuActionKeys = {
  actionKey: 'actionKey',
  // required - string: unique identifier
  actionTitle: 'actionTitle',
  // required - string value
  icon: 'icon',
  // optional - IconKeys object
  menuState: 'menuState',
  // optional - MenuElementState item
  menuAttributes: 'menuAttributes',
  // optional - MenuElementAtrributes item
  discoverabilityTitle: 'discoverabilityTitle' // optional - string value
};
const MenuConfigKeys = exports.MenuConfigKeys = {
  menuTitle: 'menuTitle',
  // required - string
  menuOptions: 'menuOptions',
  // optional - array of MenuOptions
  icon: 'icon',
  // optional - IconKeys object
  menuItems: 'menuItems' // optional - array of MenuConfigKeys/MenuActionKeys
};
//# sourceMappingURL=Enums.js.map