import type { SharedNativeValueMap, SupportedNativeSharedValue } from './RNIUtilitiesModuleTypes';
export declare class RNIUtilitiesModule {
    static viewCommandRequest<T = Record<string, unknown>>(viewID: string, commandName: string, commandArgs: Record<string, any>): Promise<T>;
    static moduleCommandRequest<T = Record<string, unknown>>(moduleName: string, commandName: string, commandArgs: Record<string, any>): Promise<T>;
    static getModuleSharedValue<T = SupportedNativeSharedValue>(moduleName: string, key: string): T;
    static setModuleSharedValue(moduleName: string, key: string, newValue: SupportedNativeSharedValue): any;
    static getAllModuleSharedValues(moduleName: string): SharedNativeValueMap;
    static overwriteModuleSharedValues(moduleName: string, newValues: SharedNativeValueMap): any;
}
//# sourceMappingURL=RNIUtilitiesModule.d.ts.map