"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Helpers = void 0;
/** wrapper func for setState that returns a promise */

class Helpers {
  // eslint-disable-next-line consistent-this
  static async setStateAsync(that, newState) {
    return new Promise(resolve => {
      that.setState(newState, () => {
        resolve();
      });
    });
  }
  /** wrapper for timeout that returns a promise */
  static async timeout(ms) {
    return new Promise(resolve => {
      const timeoutID = setTimeout(() => {
        clearTimeout(timeoutID);
        resolve();
      }, ms);
    });
  }
  /** Wraps a promise that will reject if not not resolved in <ms> milliseconds */
  static async promiseWithTimeout(ms, promise) {
    // Create a promise that rejects in <ms> milliseconds
    const timeoutPromise = new Promise((_, reject) => {
      const timeoutID = setTimeout(() => {
        clearTimeout(timeoutID);
        reject(`Promise timed out in ${ms} ms.`);
      }, ms);
    });

    // Returns a race between our timeout and the passed in promise
    return Promise.race([promise, timeoutPromise]);
  }
  static pad(num, places = 2) {
    return String(num).padStart(places, '0');
  }
  static getRNIUtilitiesModule() {
    // @ts-ignore
    return global.RNIUtilitiesModule;
  }
}
exports.Helpers = Helpers;
;
//# sourceMappingURL=Helpers.js.map