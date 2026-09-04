import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from 'src/services/common';
import {
  isPlausibleAssetTimestamp,
  normalizeAssetCreationTime,
} from 'src/services/photos/utils/resolveAssetCreationTime';

const PAGE_SIZE = 1000;
const MEDIA_TYPES = [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video];

export interface LocalLibraryChange {
  inserted: MediaLibrary.Asset[];
  updated: MediaLibrary.Asset[];
  deletedIds: string[];
}

interface AssetEntry {
  asset: MediaLibrary.Asset;
  rawCreationTime: number;
}

interface LocalAssetsPage {
  assetEntries: AssetEntry[];
  hasNextPage: boolean;
  endCursor: string | undefined;
}

export interface PagedLocalAssetsResult {
  assets: MediaLibrary.Asset[];
  isLoading: boolean;
  hasLoadedLocalAssetsOnce: boolean;
  loadNextPage: () => void;
  reloadFromStart: () => Promise<Set<string> | undefined>;
  reconcileHead: () => Promise<string[]>;
  applyLibraryChange: (change: LocalLibraryChange) => void;
}

interface PaginationState {
  runId: number;
  cursor: string | undefined;
  hasMore: boolean;
  isRunning: boolean;
}

interface LoadRunOptions {
  restart: boolean;
  maxPages?: number;
}

/**
 * Owns the collection of device photo/video assets and its pagination.
 *
 * @param isEnabled - Whether the device media library should be read at all.
 * @returns The current assets plus controls to page, reload, and reconcile them.
 */
export const usePagedLocalAssets = (isEnabled: boolean): PagedLocalAssetsResult => {
  const [assetMap, setAssetMap] = useState<Map<string, AssetEntry>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedLocalAssetsOnce, setHasLoadedLocalAssetsOnce] = useState(false);
  const paginationRef = useRef<PaginationState>({ runId: 0, cursor: undefined, hasMore: true, isRunning: false });

  const fetchLocalPage = useCallback(async (after?: string): Promise<LocalAssetsPage> => {
    const page = await MediaLibrary.getAssetsAsync({
      first: PAGE_SIZE,
      after,
      mediaType: MEDIA_TYPES,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
    return {
      assetEntries: page.assets.map((asset) => ({
        asset: normalizeAssetCreationTime(asset),
        rawCreationTime: asset.creationTime,
      })),
      hasNextPage: page.hasNextPage,
      endCursor: page.endCursor,
    };
  }, []);

  /**
   * Loads pages sequentially into the asset map.
   *
   * @param restart - Whether to discard the current cursor and load from the first page again.
   * @param maxPages - Maximum number of pages to load in this run; unbounded when omitted.
   * @returns The ids loaded by this run, or undefined when the run was superseded by a newer restart.
   */
  const runLoadPages = useCallback(
    async ({ restart, maxPages }: LoadRunOptions): Promise<Set<string> | undefined> => {
      const pagination = paginationRef.current;
      if (restart) {
        pagination.runId += 1;
        pagination.cursor = undefined;
        pagination.hasMore = true;
      } else if (pagination.isRunning || !pagination.hasMore || !pagination.cursor) {
        return undefined;
      }
      const runId = pagination.runId;
      pagination.isRunning = true;
      const loadedIds = new Set<string>();
      let isFirstPage = restart;
      let loadedPages = 0;
      try {
        while (
          pagination.runId === runId &&
          (isFirstPage || (pagination.hasMore && pagination.cursor !== undefined)) &&
          (maxPages === undefined || loadedPages < maxPages)
        ) {
          const page = await fetchLocalPage(isFirstPage ? undefined : pagination.cursor);
          if (pagination.runId !== runId) {
            return undefined;
          }
          pagination.cursor = page.hasNextPage ? page.endCursor : undefined;
          pagination.hasMore = page.hasNextPage;
          const replace = isFirstPage; // captured: the updater may run after isFirstPage is mutated below
          setAssetMap((prev) => {
            const next = replace ? new Map<string, AssetEntry>() : new Map(prev);
            for (const assetEntry of page.assetEntries) {
              next.set(assetEntry.asset.id, assetEntry);
            }
            return next;
          });
          for (const assetEntry of page.assetEntries) {
            loadedIds.add(assetEntry.asset.id);
          }
          isFirstPage = false;
          loadedPages += 1;
        }
        return pagination.runId === runId ? loadedIds : undefined;
      } finally {
        if (pagination.runId === runId) {
          pagination.isRunning = false;
        }
      }
    },
    [fetchLocalPage],
  );

  const loadNextPage = useCallback(async () => {
    const pagination = paginationRef.current;
    if (pagination.isRunning || !pagination.hasMore || !pagination.cursor) {
      return;
    }
    setIsLoading(true);
    try {
      await runLoadPages({ restart: false, maxPages: 1 });
    } finally {
      setIsLoading(false);
    }
  }, [runLoadPages]);

  const reloadFromStart = useCallback(() => runLoadPages({ restart: true }), [runLoadPages]);

  const reconcileHead = useCallback(async (): Promise<string[]> => {
    const page = await fetchLocalPage();
    if (page.assetEntries.length === 0) {
      return [];
    }

    const freshIds = new Set(page.assetEntries.map((e) => e.asset.id));
    const headMinRawTime = Math.min(...page.assetEntries.map((e) => e.rawCreationTime));
    // Corrupted raw times (e.g. Android DATE_TAKEN = 0) sort outside the fetched pages,
    // so an unreliable lower bound would falsely mark them as deleted. Skip windowing;
    // the full reload catches real deletions.
    const isWindowReliable = isPlausibleAssetTimestamp(headMinRawTime);

    let droppedAssetIds: string[] = [];
    setAssetMap((prev) => {
      const next = new Map(prev);
      const dropped: string[] = [];
      if (isWindowReliable) {
        for (const [id, assetEntry] of prev) {
          if (assetEntry.rawCreationTime >= headMinRawTime && !freshIds.has(id)) {
            next.delete(id);
            dropped.push(id);
          }
        }
      }
      let prependedCount = 0;
      for (const assetEntry of page.assetEntries) {
        if (!next.has(assetEntry.asset.id)) {
          prependedCount += 1;
        }
        next.set(assetEntry.asset.id, assetEntry);
      }
      if (prependedCount > 0) {
        logger.info(`[LocalAssets] Reconcile prepended ${prependedCount} new assets`);
      }
      droppedAssetIds = dropped;
      return next;
    });

    logger.info(`[LocalAssets] Reconciled head window — ${page.assetEntries.length} fresh assets`);
    return droppedAssetIds;
  }, [fetchLocalPage]);

  const applyLibraryChange = useCallback(({ inserted, updated, deletedIds }: LocalLibraryChange) => {
    setAssetMap((prev) => {
      const next = new Map(prev);
      for (const id of deletedIds) {
        next.delete(id);
      }
      for (const asset of updated) {
        if (next.has(asset.id)) {
          next.set(asset.id, { asset, rawCreationTime: asset.creationTime });
        }
      }
      let insertedCount = 0;
      for (const asset of inserted) {
        if (!next.has(asset.id)) {
          insertedCount += 1;
        }
        next.set(asset.id, { asset, rawCreationTime: asset.creationTime });
      }
      if (insertedCount > 0) {
        logger.info(`[LocalAssets] Library change: prepending ${insertedCount} new assets`);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      setIsLoading(false);
      setHasLoadedLocalAssetsOnce(true);
      return;
    }
    const loadInitialPages = async () => {
      try {
        await runLoadPages({ restart: true, maxPages: 1 });
      } finally {
        setIsLoading(false);
        setHasLoadedLocalAssetsOnce(true);
      }
      // Eagerly load all remaining pages in background — don't wait for scroll.
      // Cloud items from history can extend the list far back in time, making
      // onEndReached fire much later than the user runs out of local assets.
      runLoadPages({ restart: false });
    };
    loadInitialPages();
  }, [isEnabled]);

  // Re-sort explicitly by the normalized value so the exposed order always matches what's shown.
  const assets = useMemo(
    () => [...assetMap.values()].map((e) => e.asset).sort((a, b) => b.creationTime - a.creationTime),
    [assetMap],
  );

  return {
    assets,
    isLoading,
    hasLoadedLocalAssetsOnce,
    loadNextPage,
    reloadFromStart,
    reconcileHead,
    applyLibraryChange,
  };
};
