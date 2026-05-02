import { default as NativeRNIUtilitiesModule } from './NativeRNIUtilitiesModule';
// modules are lazily loaded, so "reading" it's value triggers 
// the module to load in the native side.
NativeRNIUtilitiesModule;
const RNIUtilitiesModuleName = "RNIUtilitiesModule";
const RNIUtilitiesModuleRef = global[RNIUtilitiesModuleName];
export class RNIUtilitiesModule {
  static async viewCommandRequest(viewID, commandName, commandArgs) {
    if (RNIUtilitiesModuleRef == null) {
      throw "RNIUtilitiesModule is null";
    }
    ;
    if (RNIUtilitiesModuleRef.viewCommandRequest == null) {
      throw "RNIUtilitiesModule.viewCommandRequest is null";
    }
    ;
    return await RNIUtilitiesModuleRef.viewCommandRequest(viewID, commandName, commandArgs);
  }
  static async moduleCommandRequest(moduleName, commandName, commandArgs) {
    if (RNIUtilitiesModuleRef == null) {
      throw "RNIUtilitiesModule is null";
    }
    ;
    if (RNIUtilitiesModuleRef.moduleCommandRequest == null) {
      throw "RNIUtilitiesModule.moduleCommandRequest is null";
    }
    ;
    return await RNIUtilitiesModuleRef.moduleCommandRequest(moduleName, commandName, commandArgs);
  }
  static getModuleSharedValue(moduleName, key) {
    if (RNIUtilitiesModuleRef == null) {
      throw "RNIUtilitiesModule is null";
    }
    ;
    if (RNIUtilitiesModuleRef.getModuleSharedValue == null) {
      throw "RNIUtilitiesModule.getModuleSharedValue is null";
    }
    ;
    return RNIUtilitiesModuleRef.getModuleSharedValue(moduleName, key);
  }
  static setModuleSharedValue(moduleName, key, newValue) {
    if (RNIUtilitiesModuleRef == null) {
      throw "RNIUtilitiesModule is null";
    }
    ;
    if (RNIUtilitiesModuleRef.getModuleSharedValue == null) {
      throw "RNIUtilitiesModule.setModuleSharedValue is null";
    }
    ;
    return RNIUtilitiesModuleRef.setModuleSharedValue(moduleName, key, newValue);
  }
  static getAllModuleSharedValues(moduleName) {
    if (RNIUtilitiesModuleRef == null) {
      throw "RNIUtilitiesModule is null";
    }
    ;
    if (RNIUtilitiesModuleRef.getAllModuleSharedValues == null) {
      throw "RNIUtilitiesModule.getAllModuleSharedValues is null";
    }
    ;
    return RNIUtilitiesModuleRef.getAllModuleSharedValues(moduleName);
  }
  static overwriteModuleSharedValues(moduleName, newValues) {
    if (RNIUtilitiesModuleRef == null) {
      throw "RNIUtilitiesModule is null";
    }
    ;
    if (RNIUtilitiesModuleRef.overwriteModuleSharedValues == null) {
      throw "RNIUtilitiesModule.overwriteModuleSharedValues is null";
    }
    ;
    return RNIUtilitiesModuleRef.overwriteModuleSharedValues(moduleName, newValues);
  }
}
;
//# sourceMappingURL=RNIUtilitiesModule.js.map