import { driveFileService } from '@internxt-mobile/services/drive/file';
import { useCallback, useEffect, useState } from 'react';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';
import { CloudPhotoItem } from '../types';

export const useCloudThumbnail = (item: CloudPhotoItem): { uri: string | null; onImageError: () => void } => {
  const [localPath, setLocalPath] = useState<string | null>(item.thumbnailPath);
  const user = useAppSelector((state) => state.auth.user);

  const onImageError = useCallback(() => {
    photosLocalDB.setCloudThumbnailPath(item.id, null);
    setLocalPath(null);
  }, [item.id]);

  useEffect(() => {
    // FlashList recycles cells: reset to the new item's persisted path before checking
    setLocalPath(item.thumbnailPath);

    const { thumbnailPath, thumbnailBucketId, thumbnailBucketFile } = item;
    if (thumbnailPath || !thumbnailBucketId || !thumbnailBucketFile || !user) {
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
          user,
        );
        if (cancelled) {
          return;
        }
        setLocalPath(result.uri);
        photosLocalDB.setCloudThumbnailPath(item.id, result.uri);
      } catch (error) {
        console.error(`Failed to fetch thumbnail for cloud photo ${item.id} ${error}`);
      }
    };

    fetchThumbnail();

    return () => {
      cancelled = true;
    };
  }, [item.id]);

  return { uri: localPath, onImageError };
};
