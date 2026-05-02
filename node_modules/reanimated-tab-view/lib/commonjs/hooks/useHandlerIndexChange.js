"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _useStateUpdatesListener = require("./useStateUpdatesListener");
var _Props = require("../providers/Props");
var _Internal = require("../providers/Internal");
var _reactNativeReanimated = require("react-native-reanimated");
const useHandleIndexChange = () => {
  const {
    providedAnimatedRouteIndexSV,
    onIndexChange
  } = (0, _Props.usePropsContext)();
  const {
    animatedRouteIndex,
    currentRouteIndex
  } = (0, _Internal.useInternalContext)();
  (0, _useStateUpdatesListener.useStateUpdatesListener)(currentRouteIndex, () => {
    onIndexChange === null || onIndexChange === void 0 || onIndexChange(currentRouteIndex);
  });
  (0, _reactNativeReanimated.useAnimatedReaction)(() => animatedRouteIndex.value, value => {
    if (providedAnimatedRouteIndexSV) {
      providedAnimatedRouteIndexSV.value = value;
    }
  }, [providedAnimatedRouteIndexSV, animatedRouteIndex]);
};
var _default = exports.default = useHandleIndexChange;
//# sourceMappingURL=useHandlerIndexChange.js.map