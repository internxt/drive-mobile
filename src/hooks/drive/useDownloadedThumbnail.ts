import { logger } from '@internxt-mobile/services/common';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import { DownloadedThumbnail } from '@internxt-mobile/types/drive/file';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { useEffect, useState } from 'react';
import { useAppSelector } from '../../store/hooks';

export const useDownloadedThumbnail = (
  data: Pick<DriveItemData, 'isFolder' | 'thumbnails'>,
): DownloadedThumbnail | null => {
  const user = useAppSelector((state) => state.auth.user);
  const [downloadedThumbnail, setDownloadedThumbnail] = useState<DownloadedThumbnail | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!data.isFolder && data.thumbnails?.length && !downloadedThumbnail && user) {
      driveFileService
        // TODO: NEED TO UPDATE SDK TYPES
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .getThumbnail(data.thumbnails[0], user)
        .then((thumbnail) => {
          if (isMounted) setDownloadedThumbnail(thumbnail);
        })
        .catch(logger.error);
    }

    return () => {
      isMounted = false;
    };
  }, [data.thumbnails, user]);

  return downloadedThumbnail;
};
