import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { logger } from 'src/services/common';
import { BurstNativeModule } from 'src/services/photos/burst/BurstNativeModule';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';

const PAGE_SIZE = 200;
const MEDIA_TYPES = [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video];

export interface LocalAssetsResult {
  assets: MediaLibrary.Asset[];
  isLoading: boolean;
  syncedIds: Set<string>;
  cloudDeletedIds: Set<string>;
  uploadingIdSet: Set<string>;
  burstRepresentativeIdSet: Set<string>;
  incompleteUploadBurstIdSet: Set<string>;
  loadNextPage: () => void;
  reload: () => Promise<void>;
}

export const useLocalAssets = (): LocalAssetsResult => {
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  // TODO: Reserved for show a distinct icon for cloud-deleted vs never-backed assets. Remove if finally will be the same.
  const [cloudDeletedIds, setCloudDeletedIds] = useState<Set<string>>(new Set());
  const [burstRepresentativeIdSet, setBurstRepresentativeIdSet] = useState<Set<string>>(new Set());
  const [incompleteUploadBurstIdSet, setIncompleteUploadBurstIdSet] = useState<Set<string>>(new Set());

  const cursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const { syncStatus, uploadingAssetIds, sessionUploadedAssets, isFetchingCloudHistory } = useAppSelector(
    (state) => state.photos,
  );

  const uploadingIdSet = useMemo(() => new Set(uploadingAssetIds), [uploadingAssetIds]);

  const fetchLocalPage = useCallback(
    async (after?: string): Promise<MediaLibrary.PagedInfo<MediaLibrary.Asset>> =>
      MediaLibrary.getAssetsAsync({
        first: PAGE_SIZE,
        after,
        mediaType: MEDIA_TYPES,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      }),
    [],
  );

  const applyPage = useCallback(
    (page: MediaLibrary.PagedInfo<MediaLibrary.Asset>, { replace }: { replace: boolean }) => {
      setAssets((prev) => (replace ? page.assets : [...prev, ...page.assets]));
      cursorRef.current = page.hasNextPage ? page.endCursor : undefined;
      hasMoreRef.current = page.hasNextPage;
    },
    [],
  );

  const loadNextPage = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreRef.current || !cursorRef.current) {
      return;
    }
    isLoadingMoreRef.current = true;
    setIsLoading(true);
    try {
      const page = await fetchLocalPage(cursorRef.current);
      applyPage(page, { replace: false });
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoading(false);
    }
  }, [fetchLocalPage, applyPage]);

  const loadAllRemainingPages = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreRef.current || !cursorRef.current) {
      return;
    }
    isLoadingMoreRef.current = true;
    try {
      while (hasMoreRef.current && cursorRef.current) {
        const page = await fetchLocalPage(cursorRef.current);
        applyPage(page, { replace: false });
      }
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, [fetchLocalPage, applyPage]);

  const refreshSyncStatusFromDB = useCallback(async () => {
    if (assets.length === 0) {
      return;
    }
    const assetIds = assets.map((a) => a.id);
    await photosLocalDB.init();
    const entries = await photosLocalDB.getSyncedEntries(assetIds);
    const synced = new Set<string>();
    const cloudDeleted = new Set<string>();
    for (const [id, info] of entries) {
      if (info.status === 'cloud_deleted') {
        cloudDeleted.add(id);
      } else {
        synced.add(id);
      }
    }
    setSyncedIds(synced);
    setCloudDeletedIds(cloudDeleted);

    const incompleteBursts = await photosLocalDB.getIncompleteBurstAssets();
    setIncompleteUploadBurstIdSet(new Set(incompleteBursts.map((burst) => burst.assetId)));
  }, [assets]);

  const assetIds = useMemo(() => assets.map((asset) => asset.id), [assets]);
  useEffect(() => {
    if (assetIds.length === 0) {
      return;
    }
    BurstNativeModule.getBurstRepresentativeIds(assetIds)
      .then((ids) => setBurstRepresentativeIdSet(new Set(ids)))
      .catch((err) => logger.error(`[LocalAssets] getBurstRepresentativeIds failed: ${err}`));
  }, [assetIds]);

  const reloadFromStart = useCallback(async () => {
    cursorRef.current = undefined;
    hasMoreRef.current = true;
    const page = await fetchLocalPage();
    applyPage(page, { replace: true });
    logger.info(`[LocalAssets] Reloaded from start — ${page.assets.length} assets (hasNextPage: ${page.hasNextPage})`);
  }, [fetchLocalPage, applyPage]);

  useEffect(() => {
    const loadFirstPage = async () => {
      try {
        const page = await fetchLocalPage();
        applyPage(page, { replace: true });
        // Eagerly load all remaining pages in background — don't wait for scroll.
        // Cloud items from history can extend the list far back in time, making
        // onEndReached fire much later than the user runs out of local assets.
        if (page.hasNextPage) {
          loadAllRemainingPages();
        }
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
  }, [refreshSyncStatusFromDB, syncStatus, sessionUploadedAssets, isFetchingCloudHistory]);

  return {
    assets,
    isLoading,
    syncedIds,
    cloudDeletedIds,
    uploadingIdSet,
    burstRepresentativeIdSet,
    incompleteUploadBurstIdSet: incompleteUploadBurstIdSet,
    loadNextPage,
    reload: reloadFromStart,
  };
};
