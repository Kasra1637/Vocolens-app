"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RNIDummyTestViewModule = void 0;
var _RNIUtilitiesModule = require("../../native_modules/RNIUtilitiesModule");
const MODULE_NAME = "RNIDummyTestViewModule";
class RNIDummyTestViewModule {
  static async somePromiseCommandThatWillAlwaysResolve(someString, someNumber, someBool, someObject, someArray, someStringOptional = undefined) {
    return await _RNIUtilitiesModule.RNIUtilitiesModule.moduleCommandRequest(MODULE_NAME, "somePromiseCommandThatWillAlwaysResolve", {
      someString,
      someNumber,
      someBool,
      someObject,
      someArray,
      someStringOptional
    });
  }
  static async somePromiseCommandThatWillAlwaysReject() {
    await _RNIUtilitiesModule.RNIUtilitiesModule.moduleCommandRequest(MODULE_NAME, "somePromiseCommandThatWillAlwaysReject", {});
  }
  static overwriteModuleSharedValues(newValues) {
    _RNIUtilitiesModule.RNIUtilitiesModule.overwriteModuleSharedValues(MODULE_NAME, newValues);
  }
  static getAllModuleSharedValues() {
    //@ts-ignore
    return _RNIUtilitiesModule.RNIUtilitiesModule.getAllModuleSharedValues(MODULE_NAME);
  }
  static getSharedValueSomeNumber() {
    return _RNIUtilitiesModule.RNIUtilitiesModule.getModuleSharedValue(MODULE_NAME, "someNumber");
  }
  static setSharedValueSomeNumber(newValue) {
    _RNIUtilitiesModule.RNIUtilitiesModule.setModuleSharedValue(MODULE_NAME, "someNumber", newValue);
  }
}
exports.RNIDummyTestViewModule = RNIDummyTestViewModule;
;
//# sourceMappingURL=RNIDummyTestViewModule.js.map