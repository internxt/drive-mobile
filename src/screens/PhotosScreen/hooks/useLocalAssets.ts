import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import useDebouncedValue from 'src/hooks/useDebouncedValue';
import { logger } from 'src/services/common';
import { BurstNativeModule } from 'src/services/photos/burst/BurstNativeModule';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';

const PAGE_SIZE = 1000;
const MEDIA_TYPES = [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video];

export interface LocalAssetsResult {
  assets: MediaLibrary.Asset[];
  isLoading: boolean;
  syncedIds: Set<string>;
  cloudDeletedIds: Set<string>;
  uploadingIdSet: Set<string>;
  burstRepresentativeIdSet: Set<string>;
  incompleteUploadBurstIdSet: Set<string>;
  localDeletionDetectedCount: number;
  loadNextPage: () => void;
  reload: () => Promise<void>;
}

export const useLocalAssets = (): LocalAssetsResult => {
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  // TODO: Reserved for show a distinct icon for cloud-deleted vs never-backed assets. Remove if finally will be the same.
  const [cloudDeletedIds, setCloudDeletedIds] = useState<Set<string>>(new Set());
  const [localDeletionDetectedCount, setLocalDeletionDetectedCount] = useState(0);
  const [burstRepresentativeIdSet, setBurstRepresentativeIdSet] = useState<Set<string>>(new Set());
  const [incompleteUploadBurstIdSet, setIncompleteUploadBurstIdSet] = useState<Set<string>>(new Set());

  const cursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const mediaLibrarySubscriptionRef = useRef<ReturnType<typeof MediaLibrary.addListener> | null>(null);
  const libraryChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncStatus = useAppSelector((state) => state.photos.syncStatus);
  const uploadingAssetIds = useAppSelector((state) => state.photos.uploadingAssetIds);
  const sessionUploadedAssets = useAppSelector((state) => state.photos.sessionUploadedAssets);
  const isFetchingCloudHistory = useAppSelector((state) => state.photos.isFetchingCloudHistory);

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
  const debouncedAssetIds = useDebouncedValue(assetIds, 400);
  useEffect(() => {
    if (debouncedAssetIds.length === 0) {
      return;
    }
    BurstNativeModule.getBurstRepresentativeIds(debouncedAssetIds)
      .then((ids) => setBurstRepresentativeIdSet(new Set(ids)))
      .catch((err) => logger.error(`[LocalAssets] getBurstRepresentativeIds failed: ${err}`));
  }, [debouncedAssetIds]);

  const hardReloadAndReconcile = useCallback(async () => {
    cursorRef.current = undefined;
    hasMoreRef.current = true;
    isLoadingMoreRef.current = true;

    const allIds = new Set<string>();
    try {
      let isFirstPage = true;
      while (isFirstPage || (hasMoreRef.current && cursorRef.current)) {
        const page = await fetchLocalPage(isFirstPage ? undefined : cursorRef.current);
        applyPage(page, { replace: isFirstPage });
        page.assets.forEach((a) => allIds.add(a.id));
        isFirstPage = false;
      }
    } finally {
      isLoadingMoreRef.current = false;
    }

    logger.info(`[LocalAssets] Reloaded from start — ${allIds.size} total assets`);

    await photosLocalDB.init();
    const orphanedAssetsSyncRemovedCount = await photosLocalDB.cleanupOrphanedAssetSync(allIds);
    if (orphanedAssetsSyncRemovedCount > 0) {
      logger.info(`[LocalAssets] Cleaned up ${orphanedAssetsSyncRemovedCount} orphaned asset_sync entries`);
      setLocalDeletionDetectedCount((prev) => prev + 1);
    }
  }, [fetchLocalPage, applyPage]);

  const applyIncrementalLibraryChange = useCallback(async (event: MediaLibrary.MediaLibraryAssetsChangeEvent) => {
    const { insertedAssets = [], deletedAssets = [], updatedAssets = [] } = event;

    const deletedAssetIds = deletedAssets.map((a) => a.id);
    const deletedAssetIdSet = new Set(deletedAssetIds);
    const updatedAssetMap = new Map(updatedAssets.map((a) => [a.id, a]));

    setAssets((prevAssets) => {
      const insertedAssetsNotAlreadyPresent = insertedAssets.filter((a) => !prevAssets.some((p) => p.id === a.id));
      const nextAssets = prevAssets
        .filter((a) => !deletedAssetIdSet.has(a.id))
        .map((a) => updatedAssetMap.get(a.id) ?? a);

      if (insertedAssetsNotAlreadyPresent.length > 0) {
        logger.info(`[LocalAssets] Library change: prepending ${insertedAssetsNotAlreadyPresent.length} new assets`);
      }

      return [...insertedAssetsNotAlreadyPresent, ...nextAssets];
    });

    if (deletedAssetIds.length > 0) {
      logger.info(`[LocalAssets] Library change: removing ${deletedAssetIds.length} deleted assets from asset_sync`);
      await photosLocalDB.init();
      await Promise.all(deletedAssetIds.map((id) => photosLocalDB.deleteAssetSync(id)));
      setLocalDeletionDetectedCount((prev) => prev + 1);
    }
  }, []);

  const reconcileOnForeground = useCallback(async () => {
    const page = await fetchLocalPage();
    if (page.assets.length === 0) {
      return;
    }

    const freshIds = new Set(page.assets.map((a) => a.id));
    const headMinTime = Math.min(...page.assets.map((a) => a.creationTime));

    let droppedAssetsIds: string[] = [];
    setAssets((prevAssets) => {
      const newAssets = page.assets.filter((a) => !prevAssets.some((p) => p.id === a.id));
      const droppedAssets = prevAssets.filter((a) => a.creationTime >= headMinTime && !freshIds.has(a.id));
      droppedAssetsIds = droppedAssets.map((a) => a.id);
      const preservedAssets = prevAssets.filter((a) => a.creationTime < headMinTime || freshIds.has(a.id));
      if (newAssets.length > 0) {
        logger.info(`[LocalAssets] Reconcile prepended ${newAssets.length} new assets`);
      }
      return [...newAssets, ...preservedAssets];
    });

    if (droppedAssetsIds.length > 0) {
      logger.info(
        `[LocalAssets] Reconcile dropped ${droppedAssetsIds.length} locally deleted assets: ${droppedAssetsIds.join(', ')}`,
      );
      await photosLocalDB.init();
      await Promise.all(droppedAssetsIds.map((id) => photosLocalDB.deleteAssetSync(id)));
      setLocalDeletionDetectedCount((prev) => prev + 1);
    }

    logger.info(`[LocalAssets] Reconciled on foreground — ${page.assets.length} fresh assets`);
  }, [fetchLocalPage]);

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
        reconcileOnForeground();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [reconcileOnForeground]);

  useEffect(() => {
    mediaLibrarySubscriptionRef.current = MediaLibrary.addListener((event) => {
      if (event.hasIncrementalChanges) {
        // iOS: we have the exact set of inserted/deleted/updated assets. Apply without a fetch.
        applyIncrementalLibraryChange(event);
      } else {
        // Android (empty event) or iOS large change:
        // debounce to coalesce rapid bursts before fetching.
        if (libraryChangeDebounceRef.current) {
          clearTimeout(libraryChangeDebounceRef.current);
        }
        libraryChangeDebounceRef.current = setTimeout(() => {
          libraryChangeDebounceRef.current = null;
          reconcileOnForeground();
        }, 400);
      }
    });

    return () => {
      mediaLibrarySubscriptionRef.current?.remove();
      mediaLibrarySubscriptionRef.current = null;
      if (libraryChangeDebounceRef.current) {
        clearTimeout(libraryChangeDebounceRef.current);
        libraryChangeDebounceRef.current = null;
      }
    };
  }, [applyIncrementalLibraryChange, reconcileOnForeground]);

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
    localDeletionDetectedCount,
    loadNextPage,
    reload: hardReloadAndReconcile,
  };
};
