"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRNIUtilitiesModule = getRNIUtilitiesModule;
exports.pad = pad;
exports.promiseWithTimeout = promiseWithTimeout;
exports.setStateAsync = setStateAsync;
exports.timeout = timeout;
function getRNIUtilitiesModule() {
  // @ts-ignore
  return global.RNIUtilitiesModule;
}
;

// eslint-disable-next-line consistent-this
function setStateAsync(that, newState) {
  return new Promise(resolve => {
    that.setState(newState, () => {
      resolve();
    });
  });
}
;

/** wrapper for timeout that returns a promise */
function timeout(ms) {
  return new Promise(resolve => {
    const timeoutID = setTimeout(() => {
      clearTimeout(timeoutID);
      resolve();
    }, ms);
  });
}
;

/** Wraps a promise that will reject if not not resolved in <ms> milliseconds */
function promiseWithTimeout(ms, promise) {
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
;
function pad(num, places = 2) {
  return String(num).padStart(places, '0');
}
;
//# sourceMappingURL=Helpers.js.map