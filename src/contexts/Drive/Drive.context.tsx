import React, { useEffect, useRef, useState } from 'react';
import { DriveFileForTree, DriveFolderForTree, DriveListViewMode } from '@internxt-mobile/types/drive';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { AsyncStorageKey } from '@internxt-mobile/types/index';

import errorService from '@internxt-mobile/services/ErrorService';
import { BaseLogger } from '@internxt-mobile/services/common';
import { AppStateStatus, NativeEventSubscription } from 'react-native';
import appService from '@internxt-mobile/services/AppService';

import { driveFolderService } from '@internxt-mobile/services/drive/folder';

type DriveFoldersTreeNode = {
  name: string;
  parentId: number;
  id: number;
  uuid: string;
  updatedAt: string;
  createdAt: string;
  loading: boolean;
  files: DriveFileForTree[];
  folders: DriveFolderForTree[];
  error?: Error;
};
type DriveFoldersTree = {
  [folderId: number]: DriveFoldersTreeNode;
};
export interface DriveContextType {
  driveFoldersTree: DriveFoldersTree;
  viewMode: DriveListViewMode;
  rootFolderId: number;
  toggleViewMode: () => void;
  loadFolderContent: (folderId: number, options?: LoadFolderContentOptions) => Promise<void>;

  focusedFolder: DriveFoldersTreeNode | null;
}

type LoadFolderContentOptions = {
  pullFrom?: 'network'[];
  resetPagination?: boolean;
  focusFolder?: boolean;
};

export const DriveContext = React.createContext<DriveContextType | undefined>(undefined);

interface DriveContextProviderProps {
  rootFolderId?: number;
}

const logger = new BaseLogger({
  tag: 'DRIVE_CONTEXT',
});

const FILES_LIMIT_PER_PAGE = 50;
const FOLDERS_LIMIT_PER_PAGE = 50;

export const DriveContextProvider: React.FC<DriveContextProviderProps> = ({ children, rootFolderId }) => {
  const ROOT_FOLDER_NODE: DriveFoldersTreeNode = {
    name: 'Drive',
    parentId: -1,
    id: rootFolderId || -1,
    uuid: '',
    updatedAt: '',
    createdAt: '',
    loading: true,
    files: [],
    folders: [],
  };
  const [viewMode, setViewMode] = useState(DriveListViewMode.List);
  const [driveFoldersTree, setDriveFoldersTree] = useState<DriveFoldersTree>({
    [rootFolderId as number]: ROOT_FOLDER_NODE,
  });
  const [currentFolder, setCurrentFolder] = useState<DriveFoldersTreeNode | null>(null);
  const currentFolderId = useRef<number | null>(null);
  const onAppStateChangeListener = useRef<NativeEventSubscription | null>(null);

  const handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'active' && currentFolderId.current) {
      loadFolderContent(currentFolderId.current, { pullFrom: ['network'], resetPagination: true }).catch((error) => {
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
    setDriveFoldersTree({ [rootFolderId]: ROOT_FOLDER_NODE });
    loadFolderContent(rootFolderId, { pullFrom: ['network'], resetPagination: true, focusFolder: true }).catch(
      (err) => {
        errorService.reportError(err);
      },
    );
  }, [rootFolderId]);

  const fetchFolderContent = async (
    folderId: number,
    currentFilesPage: number,
    currentFoldersPage: number,
  ): Promise<{
    thereAreMoreFiles: boolean;
    thereAreMoreFolders: boolean;
    files: DriveFileForTree[];
    folders: DriveFolderForTree[];
  }> => {
    const filesOffset = (currentFilesPage - 1) * FILES_LIMIT_PER_PAGE;
    const filesInFolder = await driveFolderService.getFolderFiles(folderId, filesOffset, FILES_LIMIT_PER_PAGE);

    const thereAreMoreFiles = filesInFolder.result.length === FILES_LIMIT_PER_PAGE;

    const foldersOffset = (currentFoldersPage - 1) * FOLDERS_LIMIT_PER_PAGE;
    const foldersInFolder = await driveFolderService.getFolderFolders(folderId, foldersOffset, FOLDERS_LIMIT_PER_PAGE);
    const thereAreMoreFolders = foldersInFolder.result.length === FOLDERS_LIMIT_PER_PAGE;

    return {
      thereAreMoreFiles,
      thereAreMoreFolders,
      folders: foldersInFolder.result.map((folder) => {
        const driveFolder: DriveFolderForTree = {
          updatedAt: folder.updatedAt,
          createdAt: folder.createdAt,
          // @ts-expect-error - SDK type is plain_name, missing plainName
          plainName: folder.plainName,
          parentId: folder.parentId,
          name: folder.name,
          // @ts-expect-error - Missing type from SDK
          uuid: folder.uuid,
          id: folder.id,
          userId: folder.userId,
          // @ts-expect-error - API is returning status, missing from SDK
          status: folder.status,
        };

        return driveFolder;
      }),
      files: filesInFolder.result.map((file) => {
        const driveFile: DriveFileForTree = {
          // @ts-expect-error - API is returning UUID, type missing
          uuid: file.uuid,
          id: file.id,
          // @ts-expect-error - API is returning fileID, type missing
          fileId: file.fileId,
          // @ts-expect-error - SDK type is plain_name, missing plainName
          plainName: file.plainName,
          type: file.type,
          bucket: file.bucket,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          // @ts-expect-error - API is returning status, missing from SDK
          status: file.status,
          // @ts-expect-error - API is returning size, missing from SDK
          size: typeof file.size === 'string' ? parseInt(file.size) : file.size,
          // @ts-expect-error - API is returning folderId, missing from SDK
          folderId: file.folderId,
          // @ts-expect-error - API is returning thumbnails, missing from SDK
          thumbnails: file.thumbnails,
        };

        return driveFile;
      }),
    };
  };

  const loadFolderContent = async (folderId: number, options?: LoadFolderContentOptions) => {
    const shouldResetPagination = options?.resetPagination;
    const driveFolderTreeNode: DriveFoldersTreeNode = driveFoldersTree[folderId] ?? ROOT_FOLDER_NODE;

    if (!driveFolderTreeNode) throw new Error('Cannot load this folder');
    if (options?.focusFolder && driveFolderTreeNode) {
      setCurrentFolder(driveFolderTreeNode);
    }

    const nextFilesPage = options?.resetPagination
      ? 1
      : Math.ceil(driveFolderTreeNode.files.length / FILES_LIMIT_PER_PAGE) + 1;
    const nextFoldersPage = options?.resetPagination
      ? 1
      : Math.ceil(driveFolderTreeNode.folders.length / FILES_LIMIT_PER_PAGE) + 1;

    const { files, folders } = await fetchFolderContent(folderId, nextFilesPage, nextFoldersPage);

    updateDriveFoldersTree({
      folderId,
      parentId: driveFolderTreeNode.parentId,
      newFiles: files,
      newFolders: folders,
      error: undefined,
      resetPagination: shouldResetPagination ?? false,
    });
  };

  const updateDriveFoldersTree = ({
    newFiles,
    newFolders,
    error,
    folderId,
    parentId,
    resetPagination,
  }: {
    parentId: number;
    folderId: number;
    newFiles: DriveFileForTree[];
    resetPagination: boolean;
    newFolders: DriveFolderForTree[];
    error?: Error;
  }) => {
    const driveFolderTreeNode = driveFoldersTree[folderId];

    const allFiles = resetPagination ? newFiles : [...(driveFolderTreeNode?.files ?? []), ...newFiles];

    const allFolders = resetPagination ? newFolders : [...(driveFolderTreeNode?.folders ?? []), ...newFolders];

    const newTreeNodes = {
      [folderId]: {
        name: driveFolderTreeNode?.name || 'Drive',
        parentId: parentId,
        id: folderId,
        files: allFiles,
        folders: allFolders,
        loading: false,
        error,
      } as DriveFoldersTreeNode,
    };

    allFolders.forEach((folder) => {
      const existingNode = driveFoldersTree[folder.id];
      if (!existingNode) {
        newTreeNodes[folder.id] = {
          uuid: folder.uuid,
          name: folder.plainName,
          parentId: folder.parentId,
          id: folder.id,
          updatedAt: folder.updatedAt,
          createdAt: folder.createdAt,
          loading: true,
          files: [],
          folders: [],
          currentFoldersPage: 2,
          error: undefined,
        } as DriveFoldersTreeNode;
      }
    });

    setDriveFoldersTree({
      ...driveFoldersTree,
      ...newTreeNodes,
    });
  };

  const handleToggleViewMode = () => {
    const newViewMode = viewMode === DriveListViewMode.List ? DriveListViewMode.Grid : DriveListViewMode.List;
    setViewMode(newViewMode);
    asyncStorageService.saveItem(AsyncStorageKey.PreferredDriveViewMode, newViewMode);
  };

  return (
    <DriveContext.Provider
      value={{
        toggleViewMode: handleToggleViewMode,
        driveFoldersTree,
        viewMode,
        loadFolderContent,
        // Default current folder is the root folder
        focusedFolder: currentFolder,
        rootFolderId: rootFolderId || -1,
      }}
    >
      {children}
    </DriveContext.Provider>
  );
};
