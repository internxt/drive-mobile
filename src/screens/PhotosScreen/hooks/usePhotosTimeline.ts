import { useMemo } from 'react';
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
    loadNextPage,
    reload: reloadLocal,
  } = useLocalAssets();
  const { cloudItems, reloadCloud } = useCloudAssets();

  const {
    syncStatus,
    sessionTotalAssets,
    sessionUploadedAssets,
    isFetchingCloudHistory,
    isPaused,
    pendingBackupAssets,
    disabledReason,
  } = useAppSelector((state) => state.photos);

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
