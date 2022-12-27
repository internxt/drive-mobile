import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import errorService from '@internxt-mobile/services/ErrorService';
import photos from '@internxt-mobile/services/photos';
import { photosLogger } from '@internxt-mobile/services/photos/logger';
import { photosUtils } from '@internxt-mobile/services/photos/utils';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import { PhotosItem, PhotosSyncStatus } from '@internxt-mobile/types/photos';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useRef, useState } from 'react';
import { DataProvider } from 'recyclerlistview';

import { startSync } from './sync';

export interface PhotosContextType {
  dataSource: DataProvider;
  uploadedPhotosItems: PhotosItem[];
  syncedPhotosItems: PhotosItem[];
  ready: boolean;
  syncEnabled: boolean;
  enableSync: (
    enable: boolean,
  ) => Promise<{ canEnable: boolean; enabled: boolean; permissionsStatus: MediaLibrary.PermissionStatus }>;
  start: () => Promise<void>;
  getPhotosItem: (name: string) => PhotosItem | undefined;
  selection: {
    selectionModeActivated: boolean;
    setSelectionModeActivated: (activated: boolean) => void;
    selectedPhotosItems: PhotosItem[];
    selectPhotosItems: (photosItems: PhotosItem[]) => void;
    deselectPhotosItems: (photosItems: PhotosItem[]) => void;
    isPhotosItemSelected: (photosItem: PhotosItem) => boolean;
    resetSelectionMode: () => void;
  };
  resetContext: () => void;
  permissions: {
    getPermissionsStatus: () => Promise<MediaLibrary.PermissionStatus>;
    askPermissions: () => Promise<boolean>;
  };
  removePhotosItems: (photosItems: PhotosItem[]) => Promise<void>;
  refresh: () => Promise<void>;
  uploadingPhotosItem: PhotosItem | null;
  uploadProgress: number;
  sync: {
    status: PhotosSyncStatus;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    photosInLocalDB: number;
    pendingTasks: number;
  };
}
export const PhotosContext = React.createContext<PhotosContextType>({
  dataSource: new DataProvider(function (r1, r2) {
    const r1Key = `${r1.name}-${r1.takenAt}`;
    const r2Key = `${r2.name}-${r2.takenAt}`;
    return r1Key !== r2Key;
  }),
  enableSync: async () => {
    return {
      canEnable: false,
      enabled: false,
      permissionsStatus: MediaLibrary.PermissionStatus.UNDETERMINED,
    };
  },
  syncEnabled: true,
  uploadProgress: 0,
  refresh: () => Promise.reject('Photos context not ready'),
  removePhotosItems() {
    return Promise.reject('Photos context not ready');
  },
  uploadingPhotosItem: null,

  resetContext() {
    return;
  },
  selection: {
    selectionModeActivated: false,
    setSelectionModeActivated: () => {
      return;
    },
    selectedPhotosItems: [],
    selectPhotosItems: () => {
      return;
    },
    deselectPhotosItems: () => {
      return;
    },
    resetSelectionMode: () => {
      return;
    },
    isPhotosItemSelected: () => false,
  },

  ready: false,
  uploadedPhotosItems: [],
  syncedPhotosItems: [],
  getPhotosItem: () => {
    throw new Error('Photos context not ready');
  },
  start: () => Promise.reject('Photos context not ready'),
  permissions: {
    askPermissions: () => Promise.reject('Photos context not ready'),
    getPermissionsStatus: () => Promise.reject('Photos context not ready'),
  },
  sync: {
    failedTasks: 0,
    totalTasks: 0,
    photosInLocalDB: 0,
    completedTasks: 0,
    pendingTasks: 0,
    status: PhotosSyncStatus.Unknown,
  },
});

const getPhotos = async (cursor?: string) => {
  return photos.sync.getDevicePhotos(cursor, 10000);
};

export const PhotosContextProvider: React.FC = ({ children }) => {
  const [uploadingPhotosItem, setUploadingPhotosItem] = useState<PhotosItem | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [syncEnabled, setSyncEnabled] = useState<boolean>(true);
  const [selectionModeActivated, setSelectionModeActivated] = useState(false);
  const [uploadedPhotosItems, setUploadedPhotosItems] = useState<PhotosItem[]>([]);
  const [syncStatus, setSyncStatus] = useState(PhotosSyncStatus.Unknown);
  const [totalTasks, setTotalTasks] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [failedTasks, setFailedTasks] = useState(0);

  const [photosInLocalDB, setPhotosInLocalDB] = useState(0);

  const [completedTasks, setCompletedTasks] = useState(0);

  const [ready, setReady] = useState(false);
  const uploadedPhotosItemsRef = useRef<PhotosItem[]>([]);

  const syncedPhotosItems = useRef<PhotosItem[]>([]);
  const devicePhotosItems = useRef<PhotosItem[]>([]);
  const [selectedPhotosItems, setSelectedPhotosItems] = useState<PhotosItem[]>([]);
  const [dataSource, setDataSource] = useState<DataProvider>(
    new DataProvider(function (r1, r2) {
      const r1Key = `${r1.name}-${r1.takenAt}`;
      const r2Key = `${r2.name}-${r2.takenAt}`;
      return r1Key !== r2Key;
    }),
  );

  useEffect(() => {
    checkShouldEnableSync().catch((error) => {
      reportError(error);
    });
  }, []);

  useEffect(() => {
    if (syncStatus === PhotosSyncStatus.Completed) {
      setUploadingPhotosItem(null);
    }
  }, [syncStatus]);

  async function checkShouldEnableSync() {
    const permissionStatus = await permissions.getPermissionsStatus();

    // No permissions, disable the sync
    if (
      permissionStatus === MediaLibrary.PermissionStatus.UNDETERMINED ||
      permissionStatus === MediaLibrary.PermissionStatus.DENIED
    ) {
      setSyncEnabled(false);

      return false;
    }

    const isEnabled = (await asyncStorageService.getItem(AsyncStorageKey.PhotosSyncEnabled)) === 'true';

    setSyncEnabled(isEnabled);

    return isEnabled;
  }
  function resetContext(config = { resetLoadedImages: true }) {
    if (config.resetLoadedImages) {
      setDataSource(
        new DataProvider(function (r1, r2) {
          const r1Key = `${r1.name}-${r1.takenAt}`;
          const r2Key = `${r2.name}-${r2.takenAt}`;
          return r1Key !== r2Key;
        }),
      );
      syncedPhotosItems.current = [];
      devicePhotosItems.current = [];
      uploadedPhotosItemsRef.current = [];
    }

    selection.resetSelectionMode();

    if (syncStatus === PhotosSyncStatus.Completed) {
      setSyncStatus(PhotosSyncStatus.Unknown);
      setTotalTasks(0);
      setPendingTasks(0);
      setFailedTasks(0);
      setCompletedTasks(0);
    }

    setUploadedPhotosItems([]);
  }
  async function onRemotePhotosSynced(photosItem: PhotosItem) {
    photosLogger.info('Checking db for new photos');

    const existsSynced = syncedPhotosItems.current.find(
      (syncedPhotosItem) =>
        syncedPhotosItem.name === photosItem.name && syncedPhotosItem.takenAt === photosItem.takenAt,
    );
    if (existsSynced) return;
    syncedPhotosItems.current.push(photosItem);

    setPhotosInLocalDB(syncedPhotosItems.current.length);
    const mergedPhotosItems = photosUtils.mergePhotosItems(devicePhotosItems.current.concat(syncedPhotosItems.current));
    setDataSource(
      new DataProvider(function (r1, r2) {
        const r1Key = `${r1.name}-${r1.takenAt}`;
        const r2Key = `${r2.name}-${r2.takenAt}`;
        return r1Key !== r2Key;
      }).cloneWithRows(mergedPhotosItems),
    );
  }

  function handlePhotosItemUploadProgress(_: PhotosItem, progress: number) {
    setUploadProgress(progress);
  }

  async function enableSync(enable: boolean) {
    const permissionsStatus = await permissions.getPermissionsStatus();

    // No permissions, disable the switch
    if (
      permissionsStatus === MediaLibrary.PermissionStatus.UNDETERMINED ||
      permissionsStatus === MediaLibrary.PermissionStatus.DENIED
    ) {
      setSyncEnabled(false);
      // We only can save strings in the async storage
      await asyncStorageService.saveItem(AsyncStorageKey.PhotosSyncEnabled, 'false');
      return {
        canEnable: false,
        enabled: false,
        permissionsStatus,
      };
    }
    // We only can save strings in the async storage
    await asyncStorageService.saveItem(AsyncStorageKey.PhotosSyncEnabled, enable ? 'true' : 'false');

    setSyncEnabled(enable);
    if (enable && syncStatus === PhotosSyncStatus.Unknown) {
      await startPhotos();
    }

    if (enable && syncStatus === PhotosSyncStatus.Paused) {
      photos.sync.resume();
    }

    if (!enable && syncStatus === PhotosSyncStatus.InProgress) {
      photos.sync.pause();
    }

    return {
      canEnable: true,
      enabled: enable,
      permissionsStatus,
    };
  }

  /**
   * Inits the sync process for Photos
   */
  async function initSync() {
    // TODO: Allow the remote sync mechanism to pull the synced Photos
    // even if the sync is disabled
    const syncIsEnabled = await checkShouldEnableSync();
    if (!syncIsEnabled) return;
    await startSync({
      updateStatus: setSyncStatus,
      updateTotalTasks: setTotalTasks,
      updatePendingTasks: setPendingTasks,
      updateCompletedTasks: setCompletedTasks,
      updateFailedTasks: setFailedTasks,
      onRemotePhotosSynced,
      onPhotosItemUploadProgress: handlePhotosItemUploadProgress,
      onPhotosItemUploadStart: (photosItem) => {
        // Timeout this since the upload item change will
        // be triggered before we insert the item into the already
        // uploaded items
        setTimeout(() => {
          setUploadProgress(0);
          setUploadingPhotosItem(photosItem);
        }, 250);
      },
      onPhotosItemSynced: (photosItem) => {
        uploadedPhotosItemsRef.current = uploadedPhotosItemsRef.current.concat([photosItem]);
        setUploadedPhotosItems(uploadedPhotosItemsRef.current);
      },
    });
  }

  /**
   * Starts the photos systems
   * including the sync system
   */
  async function startPhotos() {
    const syncIsEnabled = await checkShouldEnableSync();
    try {
      // 1. Initialize the photos services
      await photos.start();

      // 2. Initialize the Photos user, it creates a bucket for the photos
      await photos.user.init();
      const start = Date.now();

      // 3. Loads all the photos from the device, 10k photos are about 1.5s for reference
      await loadDevicePhotos();

      photosLogger.info(`Device photos loaded in ${Date.now() - start}ms`);
      const startDb = Date.now();
      const syncedPhotos = await photos.database.getSyncedPhotos();

      photosLogger.info(`${syncedPhotos.length} photos loaded from DB in ${Date.now() - startDb}ms`);

      syncedPhotosItems.current = syncedPhotos.map((syncedPhoto) => photosUtils.getPhotosItem(syncedPhoto.photo));

      setPhotosInLocalDB(syncedPhotosItems.current.length);
      const mergedPhotosItems = photosUtils.mergePhotosItems(
        devicePhotosItems.current.concat(syncedPhotosItems.current),
      );

      setDataSource(
        new DataProvider(function (r1, r2) {
          const r1Key = `${r1.name}-${r1.takenAt}`;
          const r2Key = `${r2.name}-${r2.takenAt}`;
          return r1Key !== r2Key;
        }).cloneWithRows(mergedPhotosItems),
      );

      if (!syncIsEnabled) {
        setReady(true);
        return;
      }
      if (syncStatus === PhotosSyncStatus.InProgress) return;
      await initSync();
      setReady(true);
    } catch (error) {
      errorService.reportError(error);
    }
  }

  /**
   * Gets the device photos, the ones that
   * the user has in the device gallery.
   *
   * This operation is intensive, so better to wait
   * for it to finish before starting another operation
   * such syncing
   *
   * @param cursor Cursor to get the photos from
   */
  async function loadDevicePhotos(cursor?: string) {
    const { endCursor, assets, hasNextPage } = await getPhotos(cursor);
    if (assets.length) {
      devicePhotosItems.current = devicePhotosItems.current.concat(assets);
    }

    if (endCursor && hasNextPage) {
      await loadDevicePhotos(endCursor);
    }
  }

  function getPhotosItem(name: string) {
    return photosUtils
      .mergePhotosItems(devicePhotosItems.current.concat(syncedPhotosItems.current).concat(uploadedPhotosItems))
      .find((pi) => pi.name === name);
  }

  /**
   * Contains utilities to work with the photos permissions
   *
   * getPermissionsStatus returns the current status, should be
   * executed before askPermissions except if it's the first time
   * the user is going to use the app
   *
   * askPermissions prompts the user with a photos access dialog
   */
  const permissions = {
    getPermissionsStatus: async () => {
      const permissions = await MediaLibrary.getPermissionsAsync();

      return permissions.status;
    },

    askPermissions: async () => {
      const response = await MediaLibrary.requestPermissionsAsync();
      return response.granted;
    },
  };

  const selection = {
    selectPhotosItems: async (photosItems: PhotosItem[]) => {
      let isSelected = false;

      selectedPhotosItems.forEach((selected) => {
        isSelected = photosItems.map((pi) => pi.name).includes(selected.name);
      });

      if (isSelected) return;
      setSelectedPhotosItems(selectedPhotosItems.concat(photosItems));
    },

    deselectPhotosItems: async (photosItems: PhotosItem[]) => {
      const filtered = selectedPhotosItems.filter((photosItem) => {
        const selected = photosItems.map((pi) => pi.name).includes(photosItem.name);
        return selected ? false : true;
      });

      setSelectedPhotosItems(filtered);
    },
    isPhotosItemSelected: (photosItem: PhotosItem) => {
      return selectedPhotosItems.find((pi) => pi.name === photosItem.name) ? true : false;
    },
    resetSelectionMode: () => {
      setSelectedPhotosItems([]);
      setSelectionModeActivated(false);
    },
    selectedPhotosItems,
    selectionModeActivated,
    setSelectionModeActivated,
  };

  async function refreshPhotosContext() {
    resetContext({ resetLoadedImages: false });
    const syncedPhotos = await photos.database.getSyncedPhotos();
    syncedPhotosItems.current = syncedPhotos.map(({ photo }) => photosUtils.getPhotosItem(photo));
    const mergedPhotosItems = photosUtils.mergePhotosItems(devicePhotosItems.current.concat(syncedPhotosItems.current));
    setDataSource(
      new DataProvider(function (r1, r2) {
        const r1Key = `${r1.name}-${r1.takenAt}`;
        const r2Key = `${r2.name}-${r2.takenAt}`;
        return r1Key !== r2Key;
      }).cloneWithRows(mergedPhotosItems),
    );
    await startPhotos();
  }

  async function handleRemovePhotosItems(photosItems: PhotosItem[]) {
    for (const photosItem of photosItems) {
      if (photosItem.photoId) {
        await photos.database.deleteSyncedPhotosItem(photosItem.photoId);
      }
    }
    const syncedPhotos = await photos.database.getSyncedPhotos();
    syncedPhotosItems.current = syncedPhotos.map(({ photo }) => photosUtils.getPhotosItem(photo));

    const merged = photosUtils.mergePhotosItems(devicePhotosItems.current.concat(syncedPhotosItems.current));
    setDataSource(
      new DataProvider(function (r1, r2) {
        const r1Key = `${r1.name}-${r1.takenAt}`;
        const r2Key = `${r2.name}-${r2.takenAt}`;
        return r1Key !== r2Key;
      }).cloneWithRows(merged),
    );
  }

  return (
    <PhotosContext.Provider
      value={{
        dataSource,
        selection,
        ready,
        uploadedPhotosItems,
        syncedPhotosItems: syncedPhotosItems.current,
        start: startPhotos,
        permissions,
        getPhotosItem,
        removePhotosItems: handleRemovePhotosItems,
        refresh: refreshPhotosContext,
        uploadingPhotosItem,
        uploadProgress,
        sync: {
          status: syncStatus,
          totalTasks,
          completedTasks,
          pendingTasks,
          failedTasks,
          photosInLocalDB,
        },
        resetContext,
        syncEnabled,
        enableSync,
      }}
    >
      {children}
    </PhotosContext.Provider>
  );
};
