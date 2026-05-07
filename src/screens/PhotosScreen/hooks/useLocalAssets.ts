import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';

const PAGE_SIZE = 200;
const MEDIA_TYPES = [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video];

export interface LocalAssetsResult {
  assets: MediaLibrary.Asset[];
  isLoading: boolean;
  syncedIds: Set<string>;
  uploadingIdSet: Set<string>;
  loadNextPage: () => void;
}

export const useLocalAssets = (): LocalAssetsResult => {
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());

  const cursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const { syncStatus, uploadingAssetIds, sessionUploadedAssets } = useAppSelector((state) => state.photos);

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
  }, [refreshSyncStatusFromDB, syncStatus, sessionUploadedAssets]);

  return { assets, isLoading, syncedIds, uploadingIdSet, loadNextPage };
};
