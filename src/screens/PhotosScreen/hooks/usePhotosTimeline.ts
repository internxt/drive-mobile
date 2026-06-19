import { useEffect, useMemo } from 'react';
import { useAppSelector } from 'src/store/hooks';
import { TimelineDateGroup } from '../components/PhotosTimeline';
import { getGroupSyncStatus, groupAssetsByDate, mergeCloudIntoGroups } from '../utils/photoTimelineGroups';
import { useCloudAssets } from './useCloudAssets';
import { useLocalAssets } from './useLocalAssets';

export interface PhotosTimelineResult {
  timelineDateGroups: TimelineDateGroup[];
  isLoading: boolean;
  loadNextPage: () => void;
  reloadLocal: () => Promise<void>;
  reloadCloud: () => Promise<void>;
}

export const usePhotosTimeline = (): PhotosTimelineResult => {
  const {
    assets,
    isLoading,
    syncedIds,
    uploadingIdSet,
    burstRepresentativeIdSet,
    incompleteUploadBurstIdSet: incompleteBurstIdSet,
    localDeletionDetectedCount,
    loadNextPage,
    reload: reloadLocal,
  } = useLocalAssets();
  const { cloudItems, reloadCloud } = useCloudAssets();

  // When local assets are deleted, their asset_sync entries are removed so the cloud
  // copies become visible as cloud-only. Reload the cloud view to reflect that.
  useEffect(() => {
    if (localDeletionDetectedCount > 0) {
      reloadCloud();
    }
  }, [localDeletionDetectedCount, reloadCloud]);

  const syncStatus = useAppSelector((state) => state.photos.syncStatus);
  const sessionTotalAssets = useAppSelector((state) => state.photos.sessionTotalAssets);
  const sessionUploadedAssets = useAppSelector((state) => state.photos.sessionUploadedAssets);
  const isFetchingCloudHistory = useAppSelector((state) => state.photos.isFetchingCloudHistory);
  const isPaused = useAppSelector((state) => state.photos.isPaused);
  const pendingBackupAssets = useAppSelector((state) => state.photos.pendingBackupAssets);
  const disabledReason = useAppSelector((state) => state.photos.disabledReason);

  const localGroups = useMemo(
    () => groupAssetsByDate(assets, syncedIds, uploadingIdSet, burstRepresentativeIdSet, incompleteBurstIdSet),
    [assets, syncedIds, uploadingIdSet, burstRepresentativeIdSet, incompleteBurstIdSet],
  );

  const mergedGroups = useMemo(() => mergeCloudIntoGroups(localGroups, cloudItems), [localGroups, cloudItems]);

  const timelineDateGroups = useMemo(() => {
    const sessionRemaining = Math.max(0, sessionTotalAssets - sessionUploadedAssets);
    const pausedFromColdStart = isPaused && sessionTotalAssets === 0 && sessionUploadedAssets === 0;
    const remainingCount = pausedFromColdStart ? pendingBackupAssets : sessionRemaining;
    const backupProgress = sessionTotalAssets > 0 ? sessionUploadedAssets / sessionTotalAssets : undefined;
    return mergedGroups.map((group) => ({
      group,
      syncStatus: getGroupSyncStatus({
        group,
        syncStatus,
        remainingCount,
        backupProgress,
        isFetchingCloudHistory,
        isPaused,
        disabledReason,
      }),
    })) as TimelineDateGroup[];
  }, [
    mergedGroups,
    syncStatus,
    sessionTotalAssets,
    sessionUploadedAssets,
    isFetchingCloudHistory,
    isPaused,
    pendingBackupAssets,
    disabledReason,
  ]);

  return { timelineDateGroups, isLoading, loadNextPage, reloadLocal, reloadCloud };
};
