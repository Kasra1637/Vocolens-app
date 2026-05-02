import React, { createContext, useContext, useMemo, useState } from 'react';
import { useInternalContext } from './Internal';
import { useSharedValue } from 'react-native-reanimated';
import { noop } from '../constants/common';
const JumpContext = /*#__PURE__*/createContext({
  isJumping: false,
  setIsJumping: noop,
  jumpEndRouteIndexSV: {
    value: null
  },
  smoothJumpStartRouteIndex: 0,
  setSmoothJumpStartRouteIndex: noop,
  smoothJumpStartRouteIndexSV: {
    value: 0
  },
  smoothJumpStartRouteTranslationXSV: {
    value: 0
  }
});
export const JumpContextProvider = /*#__PURE__*/React.memo(function JumpContextProvider({
  children
}) {
  //#region variables
  const {
    initialRouteIndex
  } = useInternalContext();
  const jumpEndRouteIndexSV = useSharedValue(null);
  const [isJumping, setIsJumping] = useState(false);
  const [smoothJumpStartRouteIndex, setSmoothJumpStartRouteIndex] = useState(initialRouteIndex);
  const smoothJumpStartRouteIndexSV = useSharedValue(initialRouteIndex);
  const smoothJumpStartRouteTranslationXSV = useSharedValue(0);
  //#endregion

  const value = useMemo(() => ({
    isJumping,
    setIsJumping,
    smoothJumpStartRouteIndex,
    setSmoothJumpStartRouteIndex,
    smoothJumpStartRouteIndexSV,
    smoothJumpStartRouteTranslationXSV,
    jumpEndRouteIndexSV
  }), [isJumping, smoothJumpStartRouteIndex, smoothJumpStartRouteIndexSV, smoothJumpStartRouteTranslationXSV, jumpEndRouteIndexSV]);
  return /*#__PURE__*/React.createElement(JumpContext.Provider, {
    value: value
  }, children);
});
export const useJumpContext = () => useContext(JumpContext);
//# sourceMappingURL=Jump.js.map