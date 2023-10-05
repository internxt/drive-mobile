import { DriveFileData, FetchFolderContentResponse } from '@internxt/sdk/dist/drive/storage/types';
import React, { useEffect, useState } from 'react';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import {
  DriveItemData,
  DriveListViewMode,
  FetchFolderContentResponseWithThumbnails,
  FolderContent,
  FolderContentChild,
  GetModifiedFiles,
} from '@internxt-mobile/types/drive';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import drive from '@internxt-mobile/services/drive';
import _, { last } from 'lodash';
import errorService from '@internxt-mobile/services/ErrorService';
import { driveLocalDB } from '@internxt-mobile/services/drive/database';
import { BaseLogger } from '@internxt-mobile/services/common';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import { driveFolderService } from '@internxt-mobile/services/drive/folder';
import moment from 'moment';

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

  // Each conditional follows the same logic:
  // 1. Get the last modified item in the folderContentFromDB (file or folder)
  // 2. Get the recently modified items from the server
  // 2.1 Get the recently modified files
  // 2.2 Get the recently modified folders
  // 3. Compare the recently modified items with the ones in the local cache (files or folders)
  // 4. Remove the modified items from the local cache (files or folders)

  const checkIfItemShouldBeUpdatedOrDeleted = async (folderContentFromDB: FolderContent) => {
    if (folderContentFromDB.files.length > 0) {
      //1.
      const lastModifiedFile = folderContentFromDB.files.reduce((before, actual) => {
        return actual.updatedAt > before.updatedAt ? actual : before;
      });
      //2.1
      const modifiedFiles = await driveFileService.getModifiedFiles({
        updatedAt: lastModifiedFile.updatedAt,
        status: 'ALL',
      });

      if (!modifiedFiles) return;

      // 3.
      const modifiedFilesInFolder = modifiedFiles.filter((modifiedFile) => {
        return folderContentFromDB.files.some((file) => file.id === modifiedFile.id);
      });

      console.log('MODIFIED FILES IN FOLDER', modifiedFilesInFolder);

      // 4.
      modifiedFilesInFolder.forEach((modifiedFile) => {
        driveLocalDB.deleteItem({ id: modifiedFile.id });
      });
    }
    if (folderContentFromDB.children.length > 0) {
      // 1.
      const lastModifiedFolder = folderContentFromDB.children.reduce((before, actual) => {
        // Compara las fechas 'updatedAt' de los objetos
        return actual.updatedAt > before.updatedAt ? actual : before;
      });

      // 2.2
      const modifiedFolders = await driveFolderService.getModifiedFolders({
        updatedAt: lastModifiedFolder.updatedAt,
        status: 'ALL',
      });

      if (!modifiedFolders) return;

      // 3.
      const modifiedFoldersInFolder = modifiedFolders.filter((modifiedFolder) => {
        return folderContentFromDB.children.some((folder) => folder.id === modifiedFolder.id);
      });

      console.log('MODIFIED FOLDERS IN FOLDER', modifiedFoldersInFolder);

      // 4.
      modifiedFoldersInFolder.forEach((modifiedFolder) => {
        driveLocalDB.deleteFolderRecord(modifiedFolder.id);
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

    // 1. Check if we have the folder content in the DB
    if (shouldPullFromCache) {
      const folderContentFromDB = await driveLocalDB.getFolderContent(folderId);

      console.log('FOLDER CONTENT FROM DB', folderContentFromDB);

      if (folderContentFromDB) {
        logger.info(`FOLDER-${folderId} - FROM CACHE`);

        // Check if the items have been modified from another platform
        checkIfItemShouldBeUpdatedOrDeleted(folderContentFromDB).catch((error) => {
          errorService.reportError(error);
        });

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
