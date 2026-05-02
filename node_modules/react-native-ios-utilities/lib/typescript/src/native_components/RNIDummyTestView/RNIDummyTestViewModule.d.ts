import { type SharedNativeValueMap } from '../../native_modules/RNIUtilitiesModule';
export declare class RNIDummyTestViewModule {
    static somePromiseCommandThatWillAlwaysResolve(someString: string, someNumber: number, someBool: boolean, someObject: Record<string, unknown>, someArray: Array<unknown>, someStringOptional?: string | undefined): Promise<Record<string, unknown>>;
    static somePromiseCommandThatWillAlwaysReject(): Promise<void>;
    static overwriteModuleSharedValues(newValues: SharedNativeValueMap): void;
    static getAllModuleSharedValues(): {
        someNumber: number | undefined;
    };
    static getSharedValueSomeNumber(): number | undefined;
    static setSharedValueSomeNumber(newValue: number | undefined): void;
}
//# sourceMappingURL=RNIDummyTestViewModule.d.ts.map