/** wrapper func for setState that returns a promise */
import type { RNIUtilitiesModule } from "../native_modules/RNIUtilitiesModule";
export declare class Helpers {
    static setStateAsync<T extends {}>(that: React.Component, newState: T | ((prevState: T) => T)): Promise<void>;
    /** wrapper for timeout that returns a promise */
    static timeout(ms: number): Promise<void>;
    /** Wraps a promise that will reject if not not resolved in <ms> milliseconds */
    static promiseWithTimeout<T>(ms: number, promise: Promise<T>): Promise<T>;
    static pad(num: number | string, places?: number): string;
    static getRNIUtilitiesModule(): typeof RNIUtilitiesModule;
}
//# sourceMappingURL=Helpers.d.ts.map