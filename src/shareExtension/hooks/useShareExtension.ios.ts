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

  const sharedFiles = useMemo<SharedFile[]>(
    () => [
      ...(files ?? []).map((uri) => ({
        uri,
        mimeType: getMimeTypeFromUri(uri),
        fileName: decodeURIComponent(uri.split('/').pop() ?? '') || null,
        size: readSize(uri),
      })),
      ...(images ?? []).map((uri) => ({
        uri,
        mimeType: getMimeTypeFromUri(uri) ?? 'image/jpeg',
        fileName: decodeURIComponent(uri.split('/').pop() ?? '') || null,
        size: readSize(uri),
      })),
      ...(videos ?? []).map((uri) => ({
        uri,
        mimeType: getMimeTypeFromUri(uri) ?? 'video/mp4',
        fileName: decodeURIComponent(uri.split('/').pop() ?? '') || null,
        size: readSize(uri),
      })),
    ],
    [files, images, videos],
  );

  return { sdkReady, sharedFiles, mnemonic, bucket, bridgeUser, userId };
};
