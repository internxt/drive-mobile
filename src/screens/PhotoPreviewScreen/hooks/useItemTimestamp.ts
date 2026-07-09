import { useEffect, useRef, useState } from 'react';
import { photosLocalDB } from '../../../services/photos/database/photosLocalDB';
import { photoMediaLibraryService } from '../../../services/photos/PhotoMediaLibraryService';
import {
  isPlausibleAssetTimestamp,
  resolveAssetCreationTime,
} from '../../../services/photos/utils/resolveAssetCreationTime';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

export const useItemTimestamp = (item: TimelinePhotoItem | undefined): number | undefined => {
  const [timestamp, setTimestamp] = useState<number | undefined>(item?.createdAt);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!item) {
      setTimestamp(undefined);
      return;
    }

    setTimestamp(item.createdAt);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const refine = async () => {
      if (item.type === 'cloud-only') {
        const asset = await photosLocalDB.getCloudAssetById(item.id);
        const resolvedCreationTime = resolveAssetCreationTime(asset?.creationTimeApi, item.createdAt);
        if (!controller.signal.aborted && resolvedCreationTime) {
          setTimestamp(resolvedCreationTime);
        }
        return;
      }

      const cached = await photosLocalDB.getStatus(item.id);
      if (isPlausibleAssetTimestamp(cached?.creationTime)) {
        if (!controller.signal.aborted) {
          setTimestamp(cached.creationTime);
        }
        return;
      }

      const info = await photoMediaLibraryService.getAssetInfo(item.id);
      const resolvedCreationTime = resolveAssetCreationTime(info.creationTime, info.modificationTime);
      if (!controller.signal.aborted && resolvedCreationTime) {
        setTimestamp(resolvedCreationTime);
      }
    };

    refine().catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, [item?.id]);

  return timestamp;
};
