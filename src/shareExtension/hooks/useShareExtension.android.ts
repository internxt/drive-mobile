import { useMemo } from 'react';
import { SharedFile } from '../types';
import { readSize } from '../utils';
import { useShareAuth } from './useShareAuth.android';

export const useShareExtension = (rawFiles: SharedFile[]) => {
  const { status, rootFolderUuid, mnemonic, bucket, bridgeUser, userId } = useShareAuth();

  const sharedFiles = useMemo(
    () => rawFiles.map((file) => ({ ...file, size: file.size ?? readSize(file.uri) })),
    [rawFiles],
  );

  return { status, rootFolderUuid, sharedFiles, mnemonic, bucket, bridgeUser, userId };
};
