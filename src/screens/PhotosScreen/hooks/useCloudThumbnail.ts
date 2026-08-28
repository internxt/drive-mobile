import { logger } from '@internxt-mobile/services/common';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import { useCallback, useEffect, useRef, useState } from 'react';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';
import { CloudPhotoItem } from '../types';

export const useCloudThumbnail = (item: CloudPhotoItem): { uri: string | null; onImageError: () => void } => {
  const [localPath, setLocalPath] = useState<string | null>(item.thumbnailPath);
  const [retryCount, setRetryCount] = useState(0);
  const user = useAppSelector((state) => state.auth.user);
  const userRef = useRef(user);
  userRef.current = user;

  // item.thumbnailPath lags behind until useCloudAssets reloads, so the reset below has to key off
  // an actual change of id or path — not off retryCount, which would wipe a just-fetched thumbnail.
  const lastItemIdRef = useRef(item.id);
  const lastThumbnailPathPropRef = useRef(item.thumbnailPath);

  const onImageError = useCallback(() => {
    photosLocalDB.setCloudThumbnailPath(item.id, null);
    setLocalPath(null);
    setRetryCount((c) => c + 1);
  }, [item.id]);

  useEffect(() => {
    const idChanged = lastItemIdRef.current !== item.id;
    const persistedPathChanged = lastThumbnailPathPropRef.current !== item.thumbnailPath;
    lastItemIdRef.current = item.id;
    lastThumbnailPathPropRef.current = item.thumbnailPath;

    if (idChanged || persistedPathChanged) {
      setLocalPath(item.thumbnailPath);
    }

    const thumbnailBucketId = item.thumbnailBucketId;
    const thumbnailBucketFile = item.thumbnailBucketFile;
    const currentUser = userRef.current;

    // On first mount: skip if path already persisted. On retry (image load failed): always re-fetch.
    if (retryCount === 0 && item.thumbnailPath) {
      return;
    }
    if (!thumbnailBucketId || !thumbnailBucketFile || !currentUser) {
      return;
    }

    let cancelled = false;

    const fetchThumbnail = async () => {
      try {
        const result = await driveFileService.getThumbnail(
          {
            bucketId: thumbnailBucketId,
            bucketFile: thumbnailBucketFile,
            bucket_id: thumbnailBucketId,
            bucket_file: thumbnailBucketFile,
            type: item.thumbnailType ?? 'jpg',
          },
          currentUser,
        );
        if (cancelled) {
          return;
        }
        setLocalPath(result.uri);
        photosLocalDB.setCloudThumbnailPath(item.id, result.uri);
      } catch (error) {
        logger.error(`[useCloudThumbnail] Failed to fetch thumbnail for cloud photo ${item.id}: ${error}`);
      }
    };

    fetchThumbnail();

    return () => {
      cancelled = true;
    };
  }, [item.id, item.thumbnailPath, retryCount]);

  return { uri: localPath, onImageError };
};
