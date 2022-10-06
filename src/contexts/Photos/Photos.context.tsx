import errorService from '@internxt-mobile/services/ErrorService';
import photos from '@internxt-mobile/services/photos';
import { photosLogger } from '@internxt-mobile/services/photos/logger';
import { photosUtils } from '@internxt-mobile/services/photos/utils';
import { PhotosItem, PhotosSyncStatus } from '@internxt-mobile/types/photos';
import * as MediaLibrary from 'expo-media-library';
import React, { useRef, useState } from 'react';
import { DataProvider } from 'recyclerlistview';
import { startSync } from './sync';

export interface PhotosContextType {
  dataSource: DataProvider;
  uploadedPhotosItems: PhotosItem[];
  syncedPhotosItems: PhotosItem[];
  ready: boolean;
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
  removePhotosItems: (photosItems: PhotosItem[]) => void;
  refresh: () => Promise<void>;
  sync: {
    status: PhotosSyncStatus;
    totalTasks: number;
    completedTasks: number;
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
  refresh: () => Promise.reject('Photos context not ready'),
  removePhotosItems() {
    return;
  },
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
  const [selectionModeActivated, setSelectionModeActivated] = useState(false);
  const [uploadedPhotosItems, setUploadedPhotosItems] = useState<PhotosItem[]>([]);

  const [syncStatus, setSyncStatus] = useState(PhotosSyncStatus.Unknown);
  const [totalTasks, setTotalTasks] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
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

  /**
   * Starts the photos systems
   * including the sync system
   */
  async function startPhotos() {
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

      if (syncStatus === PhotosSyncStatus.InProgress) return;
      await startSync({
        updateStatus: setSyncStatus,
        updateTotalTasks: setTotalTasks,
        updatePendingTasks: setPendingTasks,
        updateCompletedTasks: setCompletedTasks,
        onRemotePhotosSynced,
        onPhotosItemSynced: (photosItem) => {
          uploadedPhotosItemsRef.current = uploadedPhotosItemsRef.current.concat([photosItem]);
          setUploadedPhotosItems(uploadedPhotosItemsRef.current);
        },
      });
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

  function handleRemovePhotosItems(photosItems: PhotosItem[]) {
    syncedPhotosItems.current = syncedPhotosItems.current.filter((mergedPhotosItem) =>
      photosItems.find((pi) => pi.name === mergedPhotosItem.name) ? false : true,
    );

    devicePhotosItems.current = devicePhotosItems.current.filter((mergedPhotosItem) =>
      photosItems.find((pi) => pi.name === mergedPhotosItem.name) ? false : true,
    );
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
        sync: {
          status: syncStatus,
          totalTasks,
          completedTasks,
          pendingTasks,
          photosInLocalDB,
        },
        resetContext,
      }}
    >
      {children}
    </PhotosContext.Provider>
  );
};
