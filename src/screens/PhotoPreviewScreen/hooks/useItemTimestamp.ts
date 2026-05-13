import { useEffect, useRef, useState } from 'react';
import { photosLocalDB } from '../../../services/photos/database/photosLocalDB';
import { photoMediaLibraryService } from '../../../services/photos/PhotoMediaLibraryService';
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
        if (!controller.signal.aborted && asset?.creationTimeApi) {
          setTimestamp(asset.creationTimeApi);
        }
        return;
      }

      const cached = await photosLocalDB.getStatus(item.id);
      if (!controller.signal.aborted && cached?.creationTime) {
        setTimestamp(cached.creationTime);
        return;
      }

      const info = await photoMediaLibraryService.getAssetInfo(item.id);
      if (!controller.signal.aborted) {
        setTimestamp(info.creationTime);
      }
    };

    refine().catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, [item?.id]);

  return timestamp;
};
