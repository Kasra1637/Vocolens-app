import { useEffect, useRef } from 'react';
export const useStateUpdatesListener = (state, callback) => {
  const prevStateRef = useRef(null);
  useEffect(() => {
    if (state !== prevStateRef.current) {
      callback();
      prevStateRef.current = state;
    }
  }, [callback, state]);
};
//# sourceMappingURL=useStateUpdatesListener.js.map