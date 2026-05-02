import { RNIUtilitiesModule } from '../../native_modules/RNIUtilitiesModule';
const MODULE_NAME = "RNIDummyTestViewModule";
export class RNIDummyTestViewModule {
  static async somePromiseCommandThatWillAlwaysResolve(someString, someNumber, someBool, someObject, someArray, someStringOptional = undefined) {
    return await RNIUtilitiesModule.moduleCommandRequest(MODULE_NAME, "somePromiseCommandThatWillAlwaysResolve", {
      someString,
      someNumber,
      someBool,
      someObject,
      someArray,
      someStringOptional
    });
  }
  static async somePromiseCommandThatWillAlwaysReject() {
    await RNIUtilitiesModule.moduleCommandRequest(MODULE_NAME, "somePromiseCommandThatWillAlwaysReject", {});
  }
  static overwriteModuleSharedValues(newValues) {
    RNIUtilitiesModule.overwriteModuleSharedValues(MODULE_NAME, newValues);
  }
  static getAllModuleSharedValues() {
    //@ts-ignore
    return RNIUtilitiesModule.getAllModuleSharedValues(MODULE_NAME);
  }
  static getSharedValueSomeNumber() {
    return RNIUtilitiesModule.getModuleSharedValue(MODULE_NAME, "someNumber");
  }
  static setSharedValueSomeNumber(newValue) {
    RNIUtilitiesModule.setModuleSharedValue(MODULE_NAME, "someNumber", newValue);
  }
}
;
//# sourceMappingURL=RNIDummyTestViewModule.js.map