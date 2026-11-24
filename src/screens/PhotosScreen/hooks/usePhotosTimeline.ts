import { useEffect, useMemo } from 'react';
import { useAppSelector } from 'src/store/hooks';
import { TimelineDateGroup } from '../components/PhotosTimeline';
import {
  filterCloudItemsAfterDayOf,
  getGroupSyncStatus,
  groupAssetsByDate,
  mergeCloudIntoGroups,
} from '../utils/photoTimelineGroups';
import { useCloudAssets } from './useCloudAssets';
import { useLocalAssets } from './useLocalAssets';

export interface PhotosTimelineResult {
  timelineDateGroups: TimelineDateGroup[];
  isLoading: boolean;
  loadNextPage: () => void;
  reloadLocal: () => Promise<void>;
  reloadCloud: () => Promise<void>;
}

export const usePhotosTimeline = (deviceFilterId?: string | null): PhotosTimelineResult => {
  const {
    assets,
    isLoading,
    hasLoadedLocalAssetsOnce,
    hasLoadedAllLocalAssets,
    syncedIds,
    cloudDeletedIds,
    uploadingIdSet,
    burstRepresentativeIdSet,
    incompleteUploadBurstIdSet: incompleteBurstIdSet,
    localDeletionDetectedCount,
    loadNextPage,
    reload: reloadLocal,
  } = useLocalAssets();
  const { cloudItems, reloadCloud } = useCloudAssets(deviceFilterId);
  const currentDeviceId = useAppSelector((state) => state.photos.deviceId);
  const showLocalAssets = deviceFilterId == null || deviceFilterId === currentDeviceId;

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
  const assetUploadErroredCount = useAppSelector((state) => state.photos.assetUploadErroredCount);

  const localGroups = useMemo(
    () =>
      showLocalAssets
        ? groupAssetsByDate(
            assets,
            syncedIds,
            uploadingIdSet,
            burstRepresentativeIdSet,
            incompleteBurstIdSet,
            cloudDeletedIds,
          )
        : [],
    [
      showLocalAssets,
      assets,
      syncedIds,
      uploadingIdSet,
      burstRepresentativeIdSet,
      incompleteBurstIdSet,
      cloudDeletedIds,
    ],
  );

  const readyToMergeCloud = !showLocalAssets || hasLoadedLocalAssetsOnce;
  const oldestLoadedLocalCreationTime =
    showLocalAssets && !hasLoadedAllLocalAssets ? assets[assets.length - 1]?.creationTime : undefined;

  const mergeableCloudItems = useMemo(() => {
    if (!readyToMergeCloud) {
      return [];
    }
    // Cloud photos from the oldest loaded local day or before would get local photos inserted above
    // them when the next page arrives.
    if (oldestLoadedLocalCreationTime === undefined) {
      return cloudItems;
    }
    return filterCloudItemsAfterDayOf(cloudItems, oldestLoadedLocalCreationTime);
  }, [cloudItems, readyToMergeCloud, oldestLoadedLocalCreationTime]);

  const mergedGroups = useMemo(
    () => mergeCloudIntoGroups(localGroups, mergeableCloudItems),
    [localGroups, mergeableCloudItems],
  );

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
        assetUploadErroredCount,
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
    assetUploadErroredCount,
  ]);

  return { timelineDateGroups, isLoading, loadNextPage, reloadLocal, reloadCloud };
};
