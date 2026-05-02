"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useStateUpdatesListener = void 0;
var _react = require("react");
const useStateUpdatesListener = (state, callback) => {
  const prevStateRef = (0, _react.useRef)(null);
  (0, _react.useEffect)(() => {
    if (state !== prevStateRef.current) {
      callback();
      prevStateRef.current = state;
    }
  }, [callback, state]);
};
exports.useStateUpdatesListener = useStateUpdatesListener;
//# sourceMappingURL=useStateUpdatesListener.js.map