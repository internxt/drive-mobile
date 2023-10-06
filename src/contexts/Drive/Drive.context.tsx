import { FetchFolderContentResponse } from '@internxt/sdk/dist/drive/storage/types';
import React, { useEffect, useState } from 'react';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import {
  DriveItemData,
  DriveListViewMode,
  FetchFolderContentResponseWithThumbnails,
  FolderContent,
} from '@internxt-mobile/types/drive';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import drive from '@internxt-mobile/services/drive';
import _ from 'lodash';
import errorService from '@internxt-mobile/services/ErrorService';
import { driveLocalDB } from '@internxt-mobile/services/drive/database';
import { BaseLogger } from '@internxt-mobile/services/common';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import { driveFolderService } from '@internxt-mobile/services/drive/folder';
import { AppStateStatus, NativeEventSubscription } from 'react-native';
import appService from '@internxt-mobile/services/AppService';

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

export const getModifiedDriveItemsAndUpdateLocalCache = async () => {
  const lastUpdatedAt = (await asyncStorageService.getItem(AsyncStorageKey.LastUpdatedAt)) || new Date().toISOString();

  const [modifiedFiles, modifiedFolders] = await Promise.all([
    driveFileService.getModifiedFiles({
      updatedAt: lastUpdatedAt,
      status: 'ALL',
    }),
    driveFolderService.getModifiedFolders({
      updatedAt: lastUpdatedAt,
      status: 'ALL',
    }),
  ]).catch((error) => {
    errorService.reportError(error);
    return [[], []];
  });

  if (!modifiedFiles || !modifiedFolders || (!modifiedFiles.length && !modifiedFolders.length)) return;

  const modifiedFilesIds = modifiedFiles.map((file) => file.id);
  const modifiedFoldersIds = modifiedFolders.map((folder) => folder.id);

  modifiedFilesIds.forEach(async (fileId) => {
    await driveLocalDB.deleteItem({ id: fileId });
  });

  modifiedFoldersIds.forEach(async (folderId) => {
    await driveLocalDB.deleteFolderRecord(folderId);
  });

  // Get the last updatedAt date from the modified files and folders
  let lastUpdatedAtFromModifiedFiles;
  let lastUpdatedAtFromModifiedFolders;

  if (modifiedFiles.length) lastUpdatedAtFromModifiedFiles = _.maxBy(modifiedFiles, 'updatedAt')?.updatedAt;

  if (modifiedFolders.length)
    lastUpdatedAtFromModifiedFolders = _.maxBy(modifiedFolders, 'updatedAt')?.updatedAt.toString();

  // Get the most recent date
  const newLastUpdatedAt = _.max([lastUpdatedAtFromModifiedFiles, lastUpdatedAtFromModifiedFolders]);

  await asyncStorageService.saveItem(AsyncStorageKey.LastUpdatedAt, newLastUpdatedAt || new Date().toISOString());
};

export const DriveContextProvider: React.FC<DriveContextProviderProps> = ({ children, rootFolderId }) => {
  const [viewMode, setViewMode] = useState(DriveListViewMode.List);
  const [driveFoldersTree, setDriveFoldersTree] = useState<DriveFoldersTree>({});
  const [currentFolder, setCurrentFolder] = useState<FetchFolderContentResponseWithThumbnails | null>(null);
  const handleAppStateChange = async (state: AppStateStatus) => {
    if (state === 'active') {
      await loadFolderContent(currentFolder?.id as number, { pullFrom: ['network'] });
    }
  };

  useEffect(() => {
    let listener: NativeEventSubscription | null = null;

    listener = appService.onAppStateChange(handleAppStateChange);

    return () => {
      if (listener) listener.remove();
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
    return driveUseCases.getFolderContent({ folderId });
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

    // Check if the items have been modified from another platform
    getModifiedDriveItemsAndUpdateLocalCache().catch((error) => {
      errorService.reportError(error);
    });

    // 1. Check if we have the folder content in the DB
    if (shouldPullFromCache) {
      const folderContentFromDB = await driveLocalDB.getFolderContent(folderId);

      if (folderContentFromDB) {
        logger.info(`FOLDER-${folderId} - FROM CACHE`);

        updateDriveFoldersTree({
          folderId,
          folderContent: folderContentFromDB,
          shouldSetAsFocused: options?.focusFolder,
        });
      }
    }
    // 2. Get fresh data from server and update silently
    if (shouldPullFromNetwork) {
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
