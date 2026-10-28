import { useCallback, useRef } from 'react';

/**
 * Returns a function whose identity never changes and that always calls the latest `callback`.
 */
export const useStableCallback = <Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): ((...args: Args) => Result) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: Args) => callbackRef.current(...args), []);
};
