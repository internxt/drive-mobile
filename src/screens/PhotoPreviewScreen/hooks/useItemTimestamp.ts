import { useEffect, useRef, useState } from 'react';
import { photosLocalDB } from '../../../services/photos/database/photosLocalDB';
import { photoMediaLibraryService } from '../../../services/photos/PhotoMediaLibraryService';
import {
  isPlausibleAssetTimestamp,
  resolveAssetCreationTime,
} from '../../../services/photos/utils/resolveAssetCreationTime';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

const getInitialTimestamp = (item: TimelinePhotoItem | undefined): number | undefined => {
  if (!item) {
    return undefined;
  }
  return item.type === 'cloud-only' ? item.folderDate : item.createdAt;
};

/**
 * Returns the display timestamp for a timeline photo item, refining it asynchronously as better data becomes available.
 * @param item The timeline item to get the timestamp for, or undefined.
 * @returns The best known timestamp for the item, or undefined if no item is given.
 */
export const useItemTimestamp = (item: TimelinePhotoItem | undefined): number | undefined => {
  const [timestamp, setTimestamp] = useState<number | undefined>(getInitialTimestamp(item));
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!item) {
      setTimestamp(undefined);
      return;
    }

    setTimestamp(getInitialTimestamp(item));

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const refine = async () => {
      if (item.type === 'cloud-only') {
        const asset = await photosLocalDB.getCloudAssetById(item.id);
        const resolvedCreationTime = resolveAssetCreationTime(asset?.creationTimeApi, item.folderDate);
        if (!controller.signal.aborted && resolvedCreationTime) {
          setTimestamp(resolvedCreationTime);
        }
        return;
      }

      const localDBAsset = await photosLocalDB.getStatus(item.id);
      if (isPlausibleAssetTimestamp(localDBAsset?.creationTime)) {
        if (!controller.signal.aborted) {
          setTimestamp(localDBAsset.creationTime);
        }
        return;
      }

      const localAssetInfo = await photoMediaLibraryService.getAssetInfo(item.id);
      const resolvedCreationTime = resolveAssetCreationTime(
        localAssetInfo.creationTime,
        localAssetInfo.modificationTime,
      );
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
