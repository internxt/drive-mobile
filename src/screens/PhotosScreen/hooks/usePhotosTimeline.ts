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
}

export const usePhotosTimeline = (): PhotosTimelineResult => {
  const { assets, isLoading, syncedIds, uploadingIdSet, loadNextPage } = useLocalAssets();
  const { cloudItems } = useCloudAssets();

  const { syncStatus, sessionTotalAssets, sessionUploadedAssets, isFetchingCloudHistory } = useAppSelector(
    (state) => state.photos,
  );

  const localGroups = useMemo(
    () => groupAssetsByDate(assets, syncedIds, uploadingIdSet),
    [assets, syncedIds, uploadingIdSet],
  );

  const mergedGroups = useMemo(() => mergeCloudIntoGroups(localGroups, cloudItems), [localGroups, cloudItems]);

  const timelineDateGroups = useMemo(() => {
    const remainingCount = Math.max(0, sessionTotalAssets - sessionUploadedAssets);
    const backupProgress = sessionTotalAssets > 0 ? sessionUploadedAssets / sessionTotalAssets : undefined;
    return mergedGroups.map((group) => ({
      group,
      syncStatus: getGroupSyncStatus(group, syncStatus, remainingCount, backupProgress, isFetchingCloudHistory),
    })) as TimelineDateGroup[];
  }, [mergedGroups, syncStatus, sessionTotalAssets, sessionUploadedAssets, isFetchingCloudHistory]);

  return { timelineDateGroups, isLoading, loadNextPage };
};
