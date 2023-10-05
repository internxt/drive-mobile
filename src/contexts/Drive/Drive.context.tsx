import { DriveFileData, FetchFolderContentResponse } from '@internxt/sdk/dist/drive/storage/types';
import React, { useEffect, useRef, useState } from 'react';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import {
  DriveItemData,
  DriveListViewMode,
  FetchFolderContentResponseWithThumbnails,
  FolderContent,
  FolderContentChild,
} from '@internxt-mobile/types/drive';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import drive from '@internxt-mobile/services/drive';
import _ from 'lodash';
import errorService from '@internxt-mobile/services/ErrorService';
import { driveLocalDB } from '@internxt-mobile/services/drive/database';
import { BaseLogger } from '@internxt-mobile/services/common';
import { getHeaders } from 'src/helpers/headers';
import { constants } from '@internxt-mobile/services/AppService';

import { AppStateStatus, NativeEventSubscription } from 'react-native';
import appService from '@internxt-mobile/services/AppService';
import { getModifiedDriveItemsAndUpdateLocalCache } from './helpers';
import { sleep } from 'src/helpers/services';

type DriveFoldersTree = {
  [folderId: number]:
    | {
        content?: FetchFolderContentResponseWithThumbnails;
        error?: Error;
      }
    | undefined;
};
export interface DriveContextType {
  driveFoldersTree: DriveFoldersTree;
  viewMode: DriveListViewMode;
  rootFolderId: number;
  toggleViewMode: () => void;
  loadFolderContent: (folderId: number, options?: LoadFolderContentOptions) => Promise<void>;
  currentFolder: FolderContent | null;
}

type LoadFolderContentOptions = {
  pullFrom?: ('cache' | 'network')[];
  focusFolder?: boolean;
};

export const DriveContext = React.createContext<DriveContextType | undefined>(undefined);

interface DriveContextProviderProps {
  rootFolderId?: number;
}

const logger = new BaseLogger({
  tag: 'DRIVE_CONTEXT',
});

export const DriveContextProvider: React.FC<DriveContextProviderProps> = ({ children, rootFolderId }) => {
  const [viewMode, setViewMode] = useState(DriveListViewMode.List);
  const [driveFoldersTree, setDriveFoldersTree] = useState<DriveFoldersTree>({});
  const [currentFolder, setCurrentFolder] = useState<FetchFolderContentResponseWithThumbnails | null>(null);
  const currentFolderId = useRef<number | null>(null);
  const onAppStateChangeListener = useRef<NativeEventSubscription | null>(null);
  const handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'active' && currentFolderId.current) {
      loadFolderContent(currentFolderId.current, { pullFrom: ['network'] }).catch((error) => {
        errorService.reportError(error);
      });
    }
  };

  useEffect(() => {
    onAppStateChangeListener.current = appService.onAppStateChange(handleAppStateChange);

    return () => {
      if (!onAppStateChangeListener.current) return;
      onAppStateChangeListener.current.remove();
      onAppStateChangeListener.current = null;
    };
  }, []);

  useEffect(() => {
    asyncStorageService.getItem(AsyncStorageKey.PreferredDriveViewMode).then((preferredDriveViewMode) => {
      if (preferredDriveViewMode && preferredDriveViewMode !== viewMode) {
        setViewMode(preferredDriveViewMode as DriveListViewMode);
      }
    });
  }, []);
  useEffect(() => {
    if (!rootFolderId) return;
    fetchFolderContent(rootFolderId)
      .then((folderContent) => {
        updateDriveFoldersTree({
          folderId: rootFolderId,
          folderContent: folderContent.data,
          error: folderContent.error,
          shouldSetAsFocused: true,
        });
      })
      .catch((err) => {
        errorService.reportError(err);
      });
  }, [rootFolderId]);

  const fetchFolderContent = async (folderId: number) => {
    const response = await driveUseCases.getFolderContent({ folderId });

    if (response.data?.files.length) {
      response.data.files = response.data?.files.filter((file) => file.status === 'EXISTS');
    }

    if (response.data?.children.length) {
      response.data.children = response.data?.children.filter((child) => !(child.removed && child.deleted));
    }

    return response;
  };

  const getModifiedItems = async ({
    itemsType,
    limit = 50,
    offset = 0,
    updatedAt,
    status,
  }: {
    itemsType: 'files' | 'folders';
    limit?: number;
    offset?: number;
    updatedAt: string;
    status: 'ALL' | 'TRASHED' | 'REMOVED';
  }) => {
    const query = `status=${status}&offset=${offset}&limit=${limit}${updatedAt && `&updatedAt=${updatedAt}`}`;
    const newToken = await asyncStorageService.getItem(AsyncStorageKey.PhotosToken);
    const headers = await getHeaders(newToken as string);

    try {
      const modifiedItems = await fetch(`${constants.DRIVE_NEW_API_URL}/${itemsType}?${query}`, {
        method: 'GET',
        headers,
      });

      return modifiedItems;
    } catch (error) {
      console.log('ERROR: ', error);
    }
  };

  const checkIfItemShouldBeUpdatedOrDeleted = async (folderContentFromDB: FolderContent) => {
    const [modifiedFiles, modifiedFolders] = await Promise.all([
      getModifiedItems({
        itemsType: 'files',
        updatedAt: new Date().toISOString(),
        status: 'ALL',
      }),
      getModifiedItems({
        itemsType: 'files',
        updatedAt: new Date().toISOString(),
        status: 'ALL',
      }),
    ]);

    const parsedModifiedFiles = await modifiedFiles?.json();
    const parsedModifiedFolders = await modifiedFolders?.json();

    folderContentFromDB?.files?.forEach((file: DriveFileData) => {
      const fileModified = parsedModifiedFiles?.find((item: DriveFileData) => item.id === file.id);
      if (fileModified) {
        if (fileModified.status === 'TRASHED' || fileModified.status === 'REMOVED') {
          driveLocalDB.deleteItem({ id: file.id });
          // Remove item from the array
          folderContentFromDB.files = folderContentFromDB.files.filter((item) => item.id !== file.id);
        } else if (fileModified === 'EXISTS') {
          file = fileModified;
        }
      }
    });

    if (folderContentFromDB.children.length > 0) {
      folderContentFromDB.children.forEach((folder: FolderContentChild) => {
        const folderModified = parsedModifiedFolders?.find((item: DriveFileData) => item.id === folder.id);
        if (folderModified) {
          if (folderModified.status === 'TRASHED' || folderModified.status === 'REMOVED') {
            driveLocalDB.deleteItem({ id: folder.id });
            // Remove item from the array
            folderContentFromDB.children = folderContentFromDB.children.filter((item) => item.id !== folder.id);
          } else if (folderModified.status === 'EXISTS') {
            folder = folderModified;
          }
        }
      });
    }
  };

  /**
   * load the folder content so
   * the next folder will be loaded quickly
   *
   * This is the priority order:
   *
   * 1. Memory
   * 2. Database
   * 3. Network
   *
   */

  const loadFolderContent = async (folderId: number, options?: LoadFolderContentOptions) => {
    const shouldPullFromCache = options?.pullFrom ? options?.pullFrom.includes('cache') : true;
    const shouldPullFromNetwork = options?.pullFrom ? options?.pullFrom.includes('network') : true;

    getModifiedDriveItemsAndUpdateLocalCache().catch((error) => {
      errorService.reportError(error);
    });

    // 1. Check if we have the folder content in the DB
    if (shouldPullFromCache) {
      const folderContentFromDB = await driveLocalDB.getFolderContent(folderId);

      if (folderContentFromDB) {
        logger.info(`FOLDER-${folderId} - FROM CACHE`);

        checkIfItemShouldBeUpdatedOrDeleted(folderContentFromDB)
          .then(() => {
            updateDriveFoldersTree({
              folderId,
              folderContent: folderContentFromDB,
              shouldSetAsFocused: options?.focusFolder,
            });
          })
          .catch((error) => {
            console.log('ERROR: ', error);
            errorService.reportError(error);
          });
      }
    }
    // 2. Get fresh data from server and update silently
    if (shouldPullFromNetwork) {
      /**
       * Wait before fetching, to avoid backend
       * not returning yet just created items.
       *
       * See https://inxt.atlassian.net/browse/PB-1446
       *
       * Maybe this delay is too much, but if we don't get
       * a reliable backend result, we are not going
       * to update the UI with correct data, so is better to
       * be slow, than to be wrong
       */
      sleep(500);
      const folderContent = await fetchFolderContent(folderId);
      if (folderContent) {
        logger.info(`FOLDER-${folderId} - FROM NETWORK`);
        updateDriveFoldersTree({
          folderId,
          folderContent: folderContent.data,
          error: folderContent.error,
          shouldSetAsFocused: options?.focusFolder,
        });
      }

      // 3. Cache the data storing it in the local db
      if (folderContent.data) {
        logger.info(`FOLDER-${folderId} - CACHED`);
        cacheDriveItems(folderContent.data).catch((error) => {
          errorService.reportError(error);
        });
      }
    }
  };

  const updateDriveFoldersTree = ({
    folderContent,
    error,
    folderId,
    shouldSetAsFocused,
  }: {
    folderId: number;
    folderContent?: FolderContent;
    error?: Error;
    shouldSetAsFocused?: boolean;
  }) => {
    setDriveFoldersTree({
      ...driveFoldersTree,
      [folderId]: { content: folderContent, error },
    });

    if (shouldSetAsFocused && folderContent) {
      setCurrentFolder(folderContent);
      currentFolderId.current = folderId;
    }
  };

  const handleToggleViewMode = () => {
    const newViewMode = viewMode === DriveListViewMode.List ? DriveListViewMode.Grid : DriveListViewMode.List;
    setViewMode(newViewMode);
    asyncStorageService.saveItem(AsyncStorageKey.PreferredDriveViewMode, newViewMode);
  };

  /**
   * Stores a cached copy of the given
   * Drive items in the localDB
   */
  const cacheDriveItems = async (folderContentResponse: FetchFolderContentResponse) => {
    const mapItems = _.concat(
      folderContentResponse.children as unknown as DriveItemData[],
      folderContentResponse.files as DriveItemData[],
    );

    await drive.database.saveFolderContent(
      {
        id: folderContentResponse.id,
        parentId: folderContentResponse.parentId,
        name: folderContentResponse.name,
        updatedAt: folderContentResponse.updatedAt,
      },
      mapItems,
    );
  };

  return (
    <DriveContext.Provider
      value={{
        toggleViewMode: handleToggleViewMode,
        driveFoldersTree,
        viewMode,
        loadFolderContent,
        // Default current folder is the root folder
        currentFolder: currentFolder,
        rootFolderId: rootFolderId || -1,
      }}
    >
      {children}
    </DriveContext.Provider>
  );
};
