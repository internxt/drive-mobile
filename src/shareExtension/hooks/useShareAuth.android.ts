import { useEffect, useState } from 'react';
import asyncStorageService from '../../services/AsyncStorageService';
import { AsyncStorageKey } from '../../types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type ShareAuthData = {
  status: AuthStatus;
  photosToken: string | null;
  mnemonic: string | null;
  rootFolderUuid: string | null;
};

export const useShareAuth = (): ShareAuthData => {
  const [data, setData] = useState<ShareAuthData>({
    status: 'loading',
    photosToken: null,
    mnemonic: null,
    rootFolderUuid: null,
  });

  useEffect(() => {
    Promise.all([asyncStorageService.getItem(AsyncStorageKey.PhotosToken), asyncStorageService.getUser()])
      .then(([photosToken, user]) => {
        setData({
          status: photosToken ? 'authenticated' : 'unauthenticated',
          photosToken,
          mnemonic: user?.mnemonic ?? null,
          rootFolderUuid: user?.rootFolderId ?? null,
        });
      })
      .catch(() =>
        setData({
          status: 'unauthenticated',
          photosToken: null,
          mnemonic: null,
          rootFolderUuid: null,
        }),
      );
  }, []);

  return data;
};
