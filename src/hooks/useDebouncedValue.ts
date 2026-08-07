import { useEffect, useRef, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delayMs`
 * milliseconds have elapsed since the last change. Useful for coalescing
 * rapid value changes into a single downstream update (e.g. avoiding
 * repeated expensive calls while a source value is still settling).
 *
 * The timer resets on every value change, so the debounced value only
 * resolves once the source has been stable for the full delay.
 * The pending timer is cancelled automatically on unmount.
 *
 * @param value - The value to debounce.
 * @param delayMs - Debounce delay in milliseconds.
 * @returns The debounced value.
 */
const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delayMs]);

  return debouncedValue;
};

export default useDebouncedValue;
