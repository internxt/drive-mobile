import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';
import { TimelineDateGroup } from '../components/PhotosTimeline';
import { groupAssetsByDate, getGroupSyncStatus } from '../utils/photoTimelineGroups';

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

  const cursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const { syncStatus, uploadingAssetIds, sessionTotalAssets, sessionUploadedAssets } = useAppSelector(
    (state) => state.photos,
  );

  const fetchLocalPage = useCallback(async (after?: string): Promise<MediaLibrary.PagedInfo<MediaLibrary.Asset>> => {
    return MediaLibrary.getAssetsAsync({
      first: PAGE_SIZE,
      after,
      mediaType: MEDIA_TYPES,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
  }, []);

  const loadNextPage = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreRef.current || !cursorRef.current) return;
    isLoadingMoreRef.current = true;
    setIsLoading(true);
    const page = await fetchLocalPage(cursorRef.current);
    setAssets((prev) => [...prev, ...page.assets]);
    cursorRef.current = page.hasNextPage ? page.endCursor : undefined;
    hasMoreRef.current = page.hasNextPage;
    isLoadingMoreRef.current = false;
    setIsLoading(false);
  }, [fetchLocalPage]);

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
    setAssets(page.assets);
    cursorRef.current = page.hasNextPage ? page.endCursor : undefined;
    hasMoreRef.current = page.hasNextPage;
  }, [fetchLocalPage]);

  useEffect(() => {
    const loadFirstPage = async () => {
      try {
        const page = await fetchLocalPage();
        setAssets(page.assets);
        cursorRef.current = page.hasNextPage ? page.endCursor : undefined;
        hasMoreRef.current = page.hasNextPage;
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
  }, [refreshSyncStatusFromDB, syncStatus]);

  const uploadingIdSet = useMemo(() => new Set(uploadingAssetIds), [uploadingAssetIds]);

  const remainingCount = Math.max(0, sessionTotalAssets - sessionUploadedAssets);
  const backupProgress = sessionTotalAssets > 0 ? sessionUploadedAssets / sessionTotalAssets : undefined;

  const timelineDateGroups = useMemo(() => {
    const dateGroups = groupAssetsByDate(assets, syncedIds, uploadingIdSet);
    return dateGroups.map((group) => ({
      group,
      syncStatus: getGroupSyncStatus(group, syncStatus, remainingCount, backupProgress),
    }));
  }, [assets, syncedIds, uploadingIdSet, syncStatus, remainingCount, backupProgress]);

  return { timelineDateGroups, isLoading, loadNextPage };
};
