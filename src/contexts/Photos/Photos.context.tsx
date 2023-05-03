import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import errorService from '@internxt-mobile/services/ErrorService';
import photos from '@internxt-mobile/services/photos';
import { photosLogger } from '@internxt-mobile/services/photos/logger';
import { devicePhotosScanner } from '@internxt-mobile/services/photos/sync';
import { photosUtils } from '@internxt-mobile/services/photos/utils';
import { PhotosItem, PhotosSyncStatus } from '@internxt-mobile/types/photos';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useRef, useState } from 'react';
import { DataProvider } from 'recyclerlistview';

import { startSync } from './sync';
import * as MobileSdk from '@internxt/mobile-sdk';
import { Photo, PhotoStatus } from '@internxt/sdk/dist/photos';
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
  getPhotosItem: (name: string, takenAt: number) => PhotosItem | undefined;
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
  triggerDebug: (photosItem: PhotosItem) => Promise<void>;
  sync: {
    status: PhotosSyncStatus;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    photosInLocalDB: number;
    photosInDevice: number;
    photosInRemote: number;
    pendingTasks: number;
  };
}
export const PhotosContext = React.createContext<PhotosContextType>({
  dataSource: new DataProvider(function (row1, row2) {
    const row1Key = `${row1.name}-${row1.takenAt}`;
    const row2Key = `${row2.name}-${row2.takenAt}`;
    return row1Key !== row2Key;
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
  triggerDebug: () => {
    return Promise.reject('Photos context not ready');
  },
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
    photosInDevice: 0,
    photosInRemote: 0,
    status: PhotosSyncStatus.Unknown,
  },
});
const getPhotos = async (cursor?: string) => {
  return devicePhotosScanner.getDevicePhotosItems(cursor, 10000);
};

let accumulatedDevicePhotosItems: PhotosItem[] = [];

export const PhotosContextProvider: React.FC = ({ children }) => {
  const [uploadingPhotosItem, setUploadingPhotosItem] = useState<PhotosItem | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState<boolean>(true);
  const [selectionModeActivated, setSelectionModeActivated] = useState(false);
  const [uploadedPhotosItems, setUploadedPhotosItems] = useState<PhotosItem[]>([]);
  const [syncStatus, setSyncStatus] = useState(PhotosSyncStatus.Unknown);
  const [totalTasks, setTotalTasks] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [failedTasks, setFailedTasks] = useState(0);

  const [photosInLocalDB, setPhotosInLocalDB] = useState(0);
  const [photosInDevice, setPhotosInDevice] = useState(0);
  const [photosInRemote, setPhotosInRemote] = useState(0);

  const [completedTasks, setCompletedTasks] = useState(0);

  const [ready, setReady] = useState(false);
  const uploadedPhotosItemsRef = useRef<PhotosItem[]>([]);

  const syncedPhotosItems = useRef<PhotosItem[]>([]);
  const devicePhotosItems = useRef<PhotosItem[]>([]);
  const [selectedPhotosItems, setSelectedPhotosItems] = useState<PhotosItem[]>([]);
  const [dataSource, setDataSource] = useState<DataProvider>(
    new DataProvider(function (row1, row2) {
      const row1Key = `${row1.name}-${row1.takenAt}`;
      const row2Key = `${row2.name}-${row2.takenAt}`;
      return row1Key !== row2Key;
    }),
  );

  useEffect(() => {
    /**
     * We receive here events with the serialized photo
     * that was processed using the MobileSDK, those photos
     * are processed in the background son we will
     * receive this events when the app comes back to the foreground
     */
    const subscription = MobileSdk.photos.onPhotoSynced((photo) => {
      const result = photo.result;

      // Parse it
      const parsedResult = JSON.parse(result) as Photo;

      if (parsedResult.id && parsedResult.status === PhotoStatus.Exists) {
        const photosItem = photos.utils.getPhotosItem(parsedResult);
        photos.realm
          .savePhotosItem(parsedResult)
          .then(() => {
            handleOnPhotosItemSynced(photosItem);
            const pendingTasks = photos.localSync.getPhotosThatNeedsSyncCount();
            setPendingTasks(pendingTasks);
            // Hack to mark the sync as completed when running native photos,
            // the native Photos queue, doesn't "finish" at all right now,
            // it just goes to an idle state where it wait for more operations
            // to process
            if (pendingTasks <= 0) {
              setSyncStatus(PhotosSyncStatus.Completed);
            }
          })
          .catch((err) => {
            errorService.reportError(err);
          });
      }
    });

    initializeSyncIsEnabled().catch((err) => {
      errorService.reportError(err);
    });

    return () => {
      return subscription();
    };
  }, []);

  useEffect(() => {
    if (syncStatus === PhotosSyncStatus.Completed) {
      setUploadingPhotosItem(null);
    }
  }, [syncStatus]);

  const initializeSyncIsEnabled = async () => {
    try {
      // Check the initial status
      const enabled = await checkShouldEnableSync();

      // Ensure is saved into the async storage
      await asyncStorageService.savePhotosSyncIsEnabled(enabled);

      // Set the status in the context
      setSyncEnabled(enabled);
    } catch (error) {
      errorService.reportError(error);
    }
  };

  async function checkShouldEnableSync() {
    const permissionStatus = await permissions.getPermissionsStatus();

    // No permissions, disable the sync
    if (
      permissionStatus === MediaLibrary.PermissionStatus.UNDETERMINED ||
      permissionStatus === MediaLibrary.PermissionStatus.DENIED
    ) {
      return false;
    }

    const isEnabled = await asyncStorageService.photosSyncIsEnabled();

    return isEnabled;
  }
  function resetContext(config = { resetLoadedImages: true }) {
    if (config.resetLoadedImages) {
      setDataSource(
        new DataProvider(function (row1, row2) {
          const row1Key = `${row1.name}-${row1.takenAt}`;
          const row2Key = `${row2.name}-${row2.takenAt}`;
          return row1Key !== row2Key;
        }),
      );
      syncedPhotosItems.current = [];
      devicePhotosItems.current = [];
      uploadedPhotosItemsRef.current = [];
    }

    selection.resetSelectionMode();
    accumulatedDevicePhotosItems = [];
    setSyncStatus(PhotosSyncStatus.Unknown);
    setTotalTasks(0);
    setPendingTasks(0);
    setFailedTasks(0);
    setCompletedTasks(0);
    setPhotosInLocalDB(0);
    setPhotosInRemote(0);
    setPhotosInDevice(0);
  }

  function onRemotePhotosSynced() {
    photos.realm
      .getSyncedPhotos()
      .then((syncedPhotos) => {
        syncedPhotosItems.current = syncedPhotos.map((syncedPhoto) => photos.utils.getPhotosItem(syncedPhoto));
        setPhotosInLocalDB(syncedPhotosItems.current.length);
        const mergedPhotosItems = photosUtils.mergePhotosItems(
          devicePhotosItems.current.concat(syncedPhotosItems.current),
        );
        setDataSource(
          new DataProvider(function (row1, row2) {
            const row1Key = getListKey(row1);
            const row2Key = getListKey(row2);
            return row1Key !== row2Key;
          }).cloneWithRows(mergedPhotosItems),
        );
      })
      .catch((err) => {
        errorService.reportError(err);
      });
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
      await asyncStorageService.savePhotosSyncIsEnabled(false);

      return {
        canEnable: false,
        enabled: false,
        permissionsStatus,
      };
    }
    // We only can save strings in the async storage
    await asyncStorageService.savePhotosSyncIsEnabled(enable);

    setSyncEnabled(enable);
    if (enable && syncStatus === PhotosSyncStatus.Unknown) {
      await startPhotos();
    }

    if (enable && syncStatus === PhotosSyncStatus.Paused) {
      photos.localSync.resume();
    }

    if (!enable && syncStatus === PhotosSyncStatus.InProgress) {
      photos.localSync.pause();
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
      onPhotosItemSynced: handleOnPhotosItemSynced,
    });
  }

  const handleOnPhotosItemSynced = (photosItem: PhotosItem) => {
    if (photos.localSync.totalPhotosInDevice !== null && photosInDevice !== photos.localSync.totalPhotosInDevice) {
      setPhotosInDevice(photos.localSync.totalPhotosInDevice);
    }
    photos.realm
      .getSyncedPhotosCount()
      .then((count) => {
        setPhotosInLocalDB(count);
      })
      .catch((err) => {
        errorService.reportError(err);
      });
    uploadedPhotosItemsRef.current = photosUtils.mergePhotosItems(uploadedPhotosItemsRef.current.concat([photosItem]));

    setUploadedPhotosItems(uploadedPhotosItemsRef.current);
  };
  const getSomeDevicePhotos = async (amount: number) => {
    const { assets } = await devicePhotosScanner.getDevicePhotosItems(undefined, amount);

    return assets;
  };

  /**
   * Starts the photos systems
   * including the sync system
   */
  async function startPhotos() {
    const syncIsEnabled = await checkShouldEnableSync();
    try {
      // 1. Initialize the photos services
      await photos.start();
      // 2. Add some items to the UI for fast feedback
      const startDb = Date.now();
      const syncedPhotos = await photos.realm.getSyncedPhotos();

      photosLogger.info(`${syncedPhotos.length} photos loaded from DB in ${Date.now() - startDb}ms`);

      const someDevicePhotos = await getSomeDevicePhotos(100);

      // Populate the grid fast
      setDataSource(
        dataSource.cloneWithRows(
          photos.utils.mergePhotosItems(
            someDevicePhotos.concat(syncedPhotos.map((syncedPhoto) => photosUtils.getPhotosItem(syncedPhoto))),
          ),
        ),
      );
      photosLogger.info(`Added initial photos to the gallery in ${Date.now() - startDb}ms`);
      photosLogger.info(`${syncedPhotos.length} photos loaded from DB in ${Date.now() - startDb}ms`);

      // 3. Initialize the Photos user, it creates a bucket for the photos
      await photos.user.init();
      const { total: totalPhotosInRemote } = await photos.usage.getCount();
      photosLogger.info(`${totalPhotosInRemote} photos already synced`);

      const start = Date.now();
      // 4. Loads all the photos from the device, 10k photos are about 1.5s for reference
      const devicePhotos = await loadDevicePhotos();

      // Something changed in the library, but we are not checking each photo
      if (devicePhotos.length !== devicePhotosItems.current.length) {
        devicePhotosItems.current = devicePhotos;
      }
      photosLogger.info(`${devicePhotosItems.current.length} Device photos loaded in ${Date.now() - start}ms`);

      const syncPercentage =
        totalPhotosInRemote >= devicePhotosItems.current.length
          ? 100
          : (totalPhotosInRemote * 100) / devicePhotosItems.current.length;
      photosLogger.info(`${syncPercentage.toFixed(2)}% of Photos synced aprox.`);
      syncedPhotosItems.current = syncedPhotos.map((syncedPhoto) => photosUtils.getPhotosItem(syncedPhoto));

      setPhotosInLocalDB(syncedPhotosItems.current.length);
      setPhotosInRemote(totalPhotosInRemote);
      const mergedPhotosItems = photosUtils.mergePhotosItems(
        devicePhotosItems.current.concat(syncedPhotosItems.current),
      );

      setDataSource(dataSource.cloneWithRows(mergedPhotosItems));

      if (!syncIsEnabled) {
        setReady(true);
        setIsRefreshing(false);
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
  async function loadDevicePhotos(cursor?: string): Promise<PhotosItem[]> {
    const { endCursor, assets, hasNextPage } = await getPhotos(cursor);
    if (assets.length) {
      accumulatedDevicePhotosItems = accumulatedDevicePhotosItems.concat(assets);
    }

    if (endCursor && hasNextPage) {
      return loadDevicePhotos(endCursor);
    } else {
      return accumulatedDevicePhotosItems;
    }
  }

  function getPhotosItem(name: string, takenAt: number) {
    return (dataSource.getAllData() as PhotosItem[]).find(
      (photosItem) => photosItem.name === name && photosItem.takenAt === takenAt,
    );
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
    // For now this is a NOOP basically, since
    // restarting the whole sync process is not an option, is a very intense process
    setIsRefreshing(true);

    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }

  const getListKey = (photosItem: PhotosItem) => `${photosItem.name}-${photosItem.takenAt}-${photosItem.status}`;

  async function handleRemovePhotosItems(photosItems: PhotosItem[]) {
    for (const photosItem of photosItems) {
      if (photosItem.photoId) {
        await photos.realm.deleteSyncedPhotosItem(photosItem.photoId);
      }
    }

    const syncedPhotos = await photos.realm.getSyncedPhotos();

    syncedPhotosItems.current = syncedPhotos.map((photo) => photosUtils.getPhotosItem(photo));

    const merged = photosUtils.mergePhotosItems(devicePhotosItems.current.concat(syncedPhotosItems.current));

    setDataSource(dataSource.cloneWithRows(merged));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const triggerDebug = async (photosItem: PhotosItem) => {
    /* Trigger this function for development purposes,
    useful when you need to debug a gallery UI issue 
    when pressing an item */
  };

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
          photosInDevice,
          photosInRemote,
        },
        resetContext,
        syncEnabled,
        enableSync,
        triggerDebug,
      }}
    >
      {children}
    </PhotosContext.Provider>
  );
};
