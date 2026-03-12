import { useEffect, useMemo, useState } from 'react';
import { SdkManager } from '../../services/common/sdk/SdkManager';
import { SharedFile } from '../types';
import { readSize } from '../utils';

interface ShareExtensionInput {
  photosToken?: string;
  files?: string[];
  images?: string[];
  videos?: string[];
}

export const useShareExtension = ({ photosToken, files, images, videos }: ShareExtensionInput) => {
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!photosToken) return;
    SdkManager.init({ token: photosToken, newToken: photosToken });
    setSdkReady(true);
  }, [photosToken]);

  const sharedFiles = useMemo<SharedFile[]>(
    () => [
      ...(files ?? []).map((uri) => ({ uri, mimeType: null, fileName: uri.split('/').pop() ?? null, size: readSize(uri) })),
      ...(images ?? []).map((uri) => ({
        uri,
        mimeType: 'image/jpeg',
        fileName: uri.split('/').pop() ?? null,
        size: readSize(uri),
      })),
      ...(videos ?? []).map((uri) => ({
        uri,
        mimeType: 'video/mp4',
        fileName: uri.split('/').pop() ?? null,
        size: readSize(uri),
      })),
    ],
    [files, images, videos],
  );

  return { sdkReady, sharedFiles };
};
