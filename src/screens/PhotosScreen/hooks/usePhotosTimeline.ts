import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';
import { TimelineDateGroup } from '../components/PhotosTimeline';
import { CloudPhotoItem } from '../types';
import {
  cloudEntryToPhotoItem,
  getGroupSyncStatus,
  groupAssetsByDate,
  mergeCloudIntoGroups,
} from '../utils/photoTimelineGroups';

const PAGE_SIZE = 200;
const MEDIA_TYPES = [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video];

export interface PhotosTimelineResult {
  timelineDateGroups: TimelineDateGroup[];
  isLoading: boolean;
  loadNextPage: () => void;
}

export const usePhotosTimeline = (): PhotosTimelineResult => {
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  const [cloudItems, setCloudItems] = useState<CloudPhotoItem[]>([]);

  const cursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const {
    syncStatus,
    uploadingAssetIds,
    sessionTotalAssets,
    sessionUploadedAssets,
    lastSyncTimestamp,
    cloudFetchRevision,
  } = useAppSelector((state) => state.photos);

  const fetchLocalPage = useCallback(async (after?: string): Promise<MediaLibrary.PagedInfo<MediaLibrary.Asset>> => {
    return MediaLibrary.getAssetsAsync({
      first: PAGE_SIZE,
      after,
      mediaType: MEDIA_TYPES,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
  }, []);

  const applyPage = useCallback(
    (page: MediaLibrary.PagedInfo<MediaLibrary.Asset>, { replace }: { replace: boolean }) => {
      setAssets((prev) => (replace ? page.assets : [...prev, ...page.assets]));
      cursorRef.current = page.hasNextPage ? page.endCursor : undefined;
      hasMoreRef.current = page.hasNextPage;
    },
    [],
  );

  const loadNextPage = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreRef.current || !cursorRef.current) return;
    isLoadingMoreRef.current = true;
    setIsLoading(true);
    const page = await fetchLocalPage(cursorRef.current);
    applyPage(page, { replace: false });
    isLoadingMoreRef.current = false;
    setIsLoading(false);
  }, [fetchLocalPage, applyPage]);

  const refreshSyncStatusFromDB = useCallback(async () => {
    if (assets.length === 0) {
      return;
    }
    const assetIds = assets.map((asset) => asset.id);
    await photosLocalDB.init();
    const entries = await photosLocalDB.getSyncedEntries(assetIds);
    setSyncedIds(new Set(entries.keys()));
  }, [assets]);

  const reloadFromStart = useCallback(async () => {
    cursorRef.current = undefined;
    hasMoreRef.current = true;
    const page = await fetchLocalPage();
    applyPage(page, { replace: true });
  }, [fetchLocalPage, applyPage]);

  useEffect(() => {
    const loadFirstPage = async () => {
      try {
        const page = await fetchLocalPage();
        applyPage(page, { replace: true });
      } finally {
        setIsLoading(false);
      }
    };
    loadFirstPage();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        reloadFromStart();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [reloadFromStart]);

  useEffect(() => {
    refreshSyncStatusFromDB();
  }, [refreshSyncStatusFromDB, syncStatus, sessionUploadedAssets]);

  useEffect(() => {
    const loadCloudAssets = async () => {
      await photosLocalDB.init();
      const [allCloud, syncedRemoteIds] = await Promise.all([
        photosLocalDB.getAllCloudAssets(),
        photosLocalDB.getSyncedRemoteFileIds(),
      ]);
      const deduplicated = allCloud.filter((entry) => !syncedRemoteIds.has(entry.remoteFileId));
      setCloudItems(deduplicated.map(cloudEntryToPhotoItem));
    };
    loadCloudAssets();
  }, [lastSyncTimestamp, cloudFetchRevision]);

  const uploadingIdSet = useMemo(() => new Set(uploadingAssetIds), [uploadingAssetIds]);

  const timelineDateGroups = useMemo(() => {
    const remainingCount = Math.max(0, sessionTotalAssets - sessionUploadedAssets);
    const backupProgress = sessionTotalAssets > 0 ? sessionUploadedAssets / sessionTotalAssets : undefined;
    const localGroups = groupAssetsByDate(assets, syncedIds, uploadingIdSet);
    const mergedGroups = mergeCloudIntoGroups(localGroups, cloudItems);
    return mergedGroups.map((group) => ({
      group,
      syncStatus: getGroupSyncStatus(group, syncStatus, remainingCount, backupProgress),
    }));
  }, [assets, syncedIds, uploadingIdSet, cloudItems, syncStatus, sessionTotalAssets, sessionUploadedAssets]);

  return { timelineDateGroups, isLoading, loadNextPage };
};
