import { useEffect, useState } from 'react';

export const VIDEO_ACTIVATION_DELAY_MS = 200;

/**
 * Turns true `VIDEO_ACTIVATION_DELAY_MS` after `isActive` becomes true, and false as soon as `isActive` is false.
 */
export const useDelayedVideoActivation = (isActive: boolean): boolean => {
  const [isVideoActive, setIsVideoActive] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsVideoActive(false);
      return;
    }
    const activateVideoTimer = setTimeout(() => setIsVideoActive(true), VIDEO_ACTIVATION_DELAY_MS);
    return () => clearTimeout(activateVideoTimer);
  }, [isActive]);

  return isVideoActive;
};
