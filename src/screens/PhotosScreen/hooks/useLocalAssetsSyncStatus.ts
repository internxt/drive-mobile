import { useEffect, useState } from 'react';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';

export interface LocalAssetsSyncStatusResult {
  syncedIds: Set<string>;
  cloudDeletedIds: Set<string>;
  incompleteUploadBurstIdSet: Set<string>;
}

/**
 * Backup-status overlay for the local timeline, read from the local photos database.
 *
 * @param assetIds - Ids of the currently loaded local assets to look up.
 * @returns Which of those ids are synced, cloud-deleted, or part of an incomplete burst upload.
 */
export const useLocalAssetsSyncStatus = (assetIds: string[]): LocalAssetsSyncStatusResult => {
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  const [cloudDeletedIds, setCloudDeletedIds] = useState<Set<string>>(new Set());
  const [incompleteUploadBurstIdSet, setIncompleteUploadBurstIdSet] = useState<Set<string>>(new Set());

  const syncStatus = useAppSelector((state) => state.photos.syncStatus);
  const sessionUploadedAssets = useAppSelector((state) => state.photos.sessionUploadedAssets);
  const isFetchingCloudHistory = useAppSelector((state) => state.photos.isFetchingCloudHistory);
  const cloudFetchRevision = useAppSelector((state) => state.photos.cloudFetchRevision);

  useEffect(() => {
    if (assetIds.length === 0) {
      return;
    }
    const refreshFromDB = async () => {
      await photosLocalDB.init();
      const entries = await photosLocalDB.getSyncedEntries(assetIds);
      const synced = new Set<string>();
      const cloudDeleted = new Set<string>();
      for (const [id, info] of entries) {
        if (info.status === 'cloud_deleted' || info.status === 'deleted') {
          cloudDeleted.add(id);
        } else if (info.status === 'synced') {
          synced.add(id);
        } else if (info.status === 'error') {
          // to not mark as synced, but still track as known asset
          // leave this to fill if we add a Icon for error state in the future
        }
      }
      setSyncedIds(synced);
      setCloudDeletedIds(cloudDeleted);

      const incompleteBursts = await photosLocalDB.getIncompleteBurstAssets();
      setIncompleteUploadBurstIdSet(new Set(incompleteBursts.map((burst) => burst.assetId)));
    };
    refreshFromDB();
  }, [assetIds, syncStatus, sessionUploadedAssets, isFetchingCloudHistory, cloudFetchRevision]);

  return { syncedIds, cloudDeletedIds, incompleteUploadBurstIdSet };
};
