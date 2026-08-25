import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { logger } from 'src/services/common';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { photoCloudBrowser } from 'src/services/photos/PhotoCloudBrowser';
import { isPermissionActive } from 'src/services/photos/photoPermissionService';
import { useAppSelector } from 'src/store/hooks';
import { useBurstRepresentatives } from './useBurstRepresentatives';
import { useLocalAssetsSyncStatus } from './useLocalAssetsSyncStatus';
import { usePagedLocalAssets } from './usePagedLocalAssets';

const LIBRARY_CHANGE_DEBOUNCE_MS = 400;

export interface LocalAssetsResult {
  assets: MediaLibrary.Asset[];
  isLoading: boolean;
  hasLoadedLocalAssetsOnce: boolean;
  syncedIds: Set<string>;
  cloudDeletedIds: Set<string>;
  uploadingIdSet: Set<string>;
  burstRepresentativeIdSet: Set<string>;
  incompleteUploadBurstIdSet: Set<string>;
  localDeletionDetectedCount: number;
  loadNextPage: () => void;
  reload: () => Promise<void>;
}

/**
 * Local device timeline for the Photos screen.
 *
 * @returns The current local assets, their backup/sync status, and controls to page or reload.
 */
export const useLocalAssets = (): LocalAssetsResult => {
  const [localDeletionDetectedCount, setLocalDeletionDetectedCount] = useState(0);
  const appStateRef = useRef(AppState.currentState);
  const libraryChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uploadingAssetIds = useAppSelector((state) => state.photos.uploadingAssetIds);
  const permissionStatus = useAppSelector((state) => state.photos.permissionStatus);
  const deviceId = useAppSelector((state) => state.photos.deviceId);
  const isPhotosEnabled = isPermissionActive(permissionStatus);

  const uploadingIdSet = useMemo(() => new Set(uploadingAssetIds), [uploadingAssetIds]);

  const {
    assets,
    isLoading,
    hasLoadedLocalAssetsOnce,
    loadNextPage,
    reloadFromStart,
    reconcileHead,
    applyLibraryChange,
  } = usePagedLocalAssets(isPhotosEnabled);

  const assetIds = useMemo(() => assets.map((asset) => asset.id), [assets]);
  const { syncedIds, cloudDeletedIds, incompleteUploadBurstIdSet } = useLocalAssetsSyncStatus(assetIds);
  const burstRepresentativeIdSet = useBurstRepresentatives(assetIds);

  const removeDeletedAssetsFromSyncDB = useCallback(
    async (deletedAssetIds: string[]) => {
      await photosLocalDB.init();
      await photoCloudBrowser.deleteAssetSyncPreservingCloudVisibility(deletedAssetIds, deviceId);
      setLocalDeletionDetectedCount((prev) => prev + 1);
    },
    [deviceId],
  );

  const reconcileWithDevice = useCallback(async () => {
    const droppedAssetIds = await reconcileHead();
    if (droppedAssetIds.length > 0) {
      logger.info(
        `[LocalAssets] Reconcile dropped ${droppedAssetIds.length} locally deleted assets: ${droppedAssetIds.join(', ')}`,
      );
      await removeDeletedAssetsFromSyncDB(droppedAssetIds);
    }
  }, [reconcileHead, removeDeletedAssetsFromSyncDB]);

  const handleIncrementalLibraryChange = useCallback(
    async (event: MediaLibrary.MediaLibraryAssetsChangeEvent) => {
      const { insertedAssets = [], deletedAssets = [], updatedAssets = [] } = event;
      const deletedAssetIds = deletedAssets.map((a) => a.id);

      applyLibraryChange({ inserted: insertedAssets, updated: updatedAssets, deletedIds: deletedAssetIds });

      if (deletedAssetIds.length > 0) {
        logger.info(`[LocalAssets] Library change: removing ${deletedAssetIds.length} deleted assets from asset_sync`);
        await removeDeletedAssetsFromSyncDB(deletedAssetIds);
      }
    },
    [applyLibraryChange, removeDeletedAssetsFromSyncDB],
  );

  const hardReloadAndReconcile = useCallback(async () => {
    const deviceAssetIds = await reloadFromStart();
    if (!deviceAssetIds) {
      return;
    }

    logger.info(`[LocalAssets] Reloaded from start — ${deviceAssetIds.size} total assets`);

    await photosLocalDB.init();
    const orphanedAssetsSyncRemovedCount = await photoCloudBrowser.cleanupOrphanedAssetSync(deviceAssetIds, deviceId);
    if (orphanedAssetsSyncRemovedCount > 0) {
      logger.info(`[LocalAssets] Cleaned up ${orphanedAssetsSyncRemovedCount} orphaned asset_sync entries`);
      setLocalDeletionDetectedCount((prev) => prev + 1);
    }
  }, [reloadFromStart, deviceId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (isPhotosEnabled && appStateRef.current !== 'active' && nextState === 'active') {
        reconcileWithDevice();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [reconcileWithDevice, isPhotosEnabled]);

  useEffect(() => {
    if (!isPhotosEnabled) {
      return;
    }
    const subscription = MediaLibrary.addListener((event) => {
      if (event.hasIncrementalChanges) {
        // iOS: we have the exact set of inserted/deleted/updated assets. Apply without a fetch.
        handleIncrementalLibraryChange(event);
      } else {
        // Android (empty event) or iOS large change:
        // debounce to coalesce rapid bursts before fetching.
        if (libraryChangeDebounceRef.current) {
          clearTimeout(libraryChangeDebounceRef.current);
        }
        libraryChangeDebounceRef.current = setTimeout(() => {
          libraryChangeDebounceRef.current = null;
          reconcileWithDevice();
        }, LIBRARY_CHANGE_DEBOUNCE_MS);
      }
    });

    return () => {
      subscription?.remove();
      if (libraryChangeDebounceRef.current) {
        clearTimeout(libraryChangeDebounceRef.current);
        libraryChangeDebounceRef.current = null;
      }
    };
  }, [handleIncrementalLibraryChange, reconcileWithDevice, isPhotosEnabled]);

  return {
    assets,
    isLoading,
    hasLoadedLocalAssetsOnce,
    syncedIds,
    cloudDeletedIds,
    uploadingIdSet,
    burstRepresentativeIdSet,
    incompleteUploadBurstIdSet,
    localDeletionDetectedCount,
    loadNextPage,
    reload: hardReloadAndReconcile,
  };
};
