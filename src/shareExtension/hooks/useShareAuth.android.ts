import { useEffect, useState } from 'react';
import asyncStorageService from '../../services/AsyncStorageService';
import { AsyncStorageKey } from '../../types';
import ShareSdkManager from '../services/ShareSdkManager';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type ShareAuthData = {
  status: AuthStatus;
  photosToken: string | null;
  mnemonic: string | null;
  rootFolderUuid: string | null;
  bucket: string | null;
  bridgeUser: string | null;
  userId: string | null;
};

export const useShareAuth = (): ShareAuthData => {
  const [data, setData] = useState<ShareAuthData>({
    status: 'loading',
    photosToken: null,
    mnemonic: null,
    rootFolderUuid: null,
    bucket: null,
    bridgeUser: null,
    userId: null,
  });

  useEffect(() => {
    Promise.all([asyncStorageService.getItem(AsyncStorageKey.PhotosToken), asyncStorageService.getUser()])
      .then(([photosToken, user]) => {
        if (photosToken) {
          ShareSdkManager.init({ newToken: photosToken });
        }
        setData({
          status: photosToken ? 'authenticated' : 'unauthenticated',
          photosToken,
          mnemonic: user?.mnemonic ?? null,
          rootFolderUuid: user?.rootFolderId ?? null,
          bucket: user?.bucket ?? null,
          bridgeUser: user?.bridgeUser ?? null,
          userId: user?.userId ?? null,
        });
      })
      .catch(() =>
        setData({
          status: 'unauthenticated',
          photosToken: null,
          mnemonic: null,
          rootFolderUuid: null,
          bucket: null,
          bridgeUser: null,
          userId: null,
        }),
      );
  }, []);

  return data;
};
