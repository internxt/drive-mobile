import { useCallback, useEffect, useRef, useState } from 'react';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';
import { CloudPhotoItem } from '../types';
import { cloudEntryToPhotoItem } from '../utils/photoTimelineGroups';

export interface CloudAssetsResult {
  cloudItems: CloudPhotoItem[];
}

export const useCloudAssets = (): CloudAssetsResult => {
  const [cloudItems, setCloudItems] = useState<CloudPhotoItem[]>([]);
  const { lastSyncTimestamp, cloudFetchRevision } = useAppSelector((state) => state.photos);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadCloudFromDB = useCallback(async () => {
    await photosLocalDB.init();
    const [allCloud, syncedRemoteIds] = await Promise.all([
      photosLocalDB.getAllCloudAssets(),
      photosLocalDB.getSyncedRemoteFileIds(),
    ]);
    const deduplicated = allCloud.filter((cloudEntry) => !syncedRemoteIds.has(cloudEntry.remoteFileId));
    setCloudItems(deduplicated.map(cloudEntryToPhotoItem));
  }, []);

  // Immediate reload when the backup cycle completes
  useEffect(() => {
    reloadCloudFromDB();
  }, [reloadCloudFromDB, lastSyncTimestamp]);

  // Debounced reload during cloud history sync — parallel workers can fire many
  // rapid increments; coalescing them prevents FlashList from reconciling 2000+
  // item lists on every month completion
  useEffect(() => {
    debounceRef.current = setTimeout(reloadCloudFromDB, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [reloadCloudFromDB, cloudFetchRevision]);

  return { cloudItems };
};
