import { useEffect, useMemo, useState } from 'react';
import ShareSdkManager from '../services/ShareSdkManager';
import { SharedFile } from '../types';
import { getMimeTypeFromUri, readSize } from '../utils';

interface ShareExtensionInput {
  photosToken?: string;
  mnemonic?: string;
  bucket?: string;
  bridgeUser?: string;
  userId?: string;
  files?: string[];
  images?: string[];
  videos?: string[];
}

export const useShareExtension = ({
  photosToken,
  mnemonic,
  bucket,
  bridgeUser,
  userId,
  files,
  images,
  videos,
}: ShareExtensionInput) => {
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!photosToken) return;
    ShareSdkManager.init({ newToken: photosToken });
    setSdkReady(true);
  }, [photosToken]);

  const toSharedFile =
    (mimeTypeFallback: string | null = null) =>
    (uri: string): SharedFile => {
      const segment = uri.split('/').pop();
      return {
        uri,
        mimeType: getMimeTypeFromUri(uri) ?? mimeTypeFallback,
        fileName: segment ? decodeURIComponent(segment) : null,
        size: readSize(uri),
      };
    };

  const sharedFiles = useMemo<SharedFile[]>(
    () => [
      ...(files ?? []).map(toSharedFile()),
      ...(images ?? []).map(toSharedFile('image/jpeg')),
      ...(videos ?? []).map(toSharedFile('video/mp4')),
    ],
    [files, images, videos],
  );

  return { sdkReady, sharedFiles, mnemonic, bucket, bridgeUser, userId };
};
