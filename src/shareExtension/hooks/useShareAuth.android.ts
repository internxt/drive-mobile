import { useEffect, useState } from 'react';
import asyncStorageService from '../../services/AsyncStorageService';
import { AsyncStorageKey } from '../../types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export const useShareAuth = (): AuthStatus => {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    asyncStorageService
      .getItem(AsyncStorageKey.PhotosToken)
      .then((token) => setStatus(token ? 'authenticated' : 'unauthenticated'))
      .catch(() => setStatus('unauthenticated'));
  }, []);

  return status;
};
