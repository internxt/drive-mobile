import { isEqual } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';
import { CloudPhotoItem } from '../types';
import { cloudEntryToPhotoItem } from '../utils/photoTimelineGroups';

export interface CloudAssetsResult {
  cloudItems: CloudPhotoItem[];
  reloadCloud: () => Promise<void>;
}

export const useCloudAssets = (deviceFilterId?: string | null): CloudAssetsResult => {
  const [cloudItems, setCloudItems] = useState<CloudPhotoItem[]>([]);
  const cloudFetchRevision = useAppSelector((state) => state.photos.cloudFetchRevision);
  const sessionUploadedAssets = useAppSelector((state) => state.photos.sessionUploadedAssets);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadCloudFromDB = useCallback(async () => {
    await photosLocalDB.init();
    const [allCloud, syncedRemoteIds] = await Promise.all([
      photosLocalDB.getAllCloudAssets(deviceFilterId ?? undefined),
      photosLocalDB.getSyncedRemoteFileIds(),
    ]);

    const deduplicated = allCloud.filter(
      (cloudEntry) => !syncedRemoteIds.has(cloudEntry.remoteFileId) && cloudEntry.livePhotoRole !== 'paired_video',
    );
    const nextItems = deduplicated.map(cloudEntryToPhotoItem);
    // Avoid rerenders when the new list is identical to the previous one (e.g., during a background sync tick)
    setCloudItems((prev) => (isEqual(prev, nextItems) ? prev : nextItems));
  }, [deviceFilterId]);

  useEffect(() => {
    setCloudItems([]);
    reloadCloudFromDB();
  }, [reloadCloudFromDB]);

  // Debounced reload during cloud history sync — parallel workers can fire many
  // rapid increments; coalescing them prevents FlashList from reconciling 2000+
  // item lists on every month completion
  useEffect(() => {
    debounceRef.current = setTimeout(reloadCloudFromDB, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [reloadCloudFromDB, cloudFetchRevision, sessionUploadedAssets]);

  return { cloudItems, reloadCloud: reloadCloudFromDB };
};
