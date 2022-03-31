import { useState } from 'react';
import { singletonHook } from 'react-singleton-hook';

interface UsePhotosState {
  syncAbort?: (reason?: string) => void;
  setSyncAbort: (abort: (reason?: string) => void) => void;
}

const initialState: UsePhotosState = {
  setSyncAbort: () => undefined,
};

const usePhotos = () => {
  const [syncAbort, setSyncAbort] = useState<(reason?: string) => void>();

  return { syncAbort, setSyncAbort };
};

export default singletonHook(initialState, usePhotos);
