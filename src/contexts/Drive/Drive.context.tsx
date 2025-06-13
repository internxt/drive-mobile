import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { DriveFileForTree, DriveFolderForTree, DriveListViewMode } from '@internxt-mobile/types/drive';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import React, { useEffect, useRef, useState } from 'react';

import appService from '@internxt-mobile/services/AppService';
import errorService from '@internxt-mobile/services/ErrorService';
import { AppStateStatus, NativeEventSubscription } from 'react-native';

import { driveFolderService } from '@internxt-mobile/services/drive/folder';

export type DriveFoldersTreeNode = {
  name: string;
  parentId: string; //uuid of the parent folder
  id: number;
  uuid: string; //uuid of current folder
  updatedAt: string;
  createdAt: string;
  loading: boolean;
  files: DriveFileForTree[];
  folders: DriveFolderForTree[];
  error?: Error;
};
type DriveFoldersTree = {
  [folderId: string]: DriveFoldersTreeNode;
};

export interface DriveContextType {
  driveFoldersTree: DriveFoldersTree;
  viewMode: DriveListViewMode;
  rootFolderId: string;
  toggleViewMode: () => void;
  loadFolderContent: (folderUuid: string, options?: LoadFolderContentOptions) => Promise<void>;
  focusedFolder: DriveFoldersTreeNode | null;
}

type LoadFolderContentOptions = {
  pullFrom?: 'network'[];
  resetPagination?: boolean;
  focusFolder?: boolean;
};

export const DriveContext = React.createContext<DriveContextType | undefined>(undefined);

interface DriveContextProviderProps {
  rootFolderId: string;
  children: React.ReactNode;
}

const FILES_LIMIT_PER_PAGE = 50;
const FOLDERS_LIMIT_PER_PAGE = 50;

export const DriveContextProvider: React.FC<DriveContextProviderProps> = ({ children, rootFolderId }) => {
  const ROOT_FOLDER_NODE: DriveFoldersTreeNode = {
    name: 'Drive',
    parentId: '',
    id: -1,
    uuid: rootFolderId as string,
    updatedAt: '',
    createdAt: '',
    loading: true,
    files: [],
    folders: [],
  };

  const [viewMode, setViewMode] = useState(DriveListViewMode.List);
  const [driveFoldersTree, setDriveFoldersTree] = useState<DriveFoldersTree>({
    [rootFolderId]: ROOT_FOLDER_NODE,
  });

  const [currentFolder, setCurrentFolder] = useState<DriveFoldersTreeNode | null>(null);
  const currentFolderId = useRef<string | null>(null);
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
    folderId: string,
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

    const thereAreMoreFiles = filesInFolder.files.length === FILES_LIMIT_PER_PAGE;

    const foldersOffset = (currentFoldersPage - 1) * FOLDERS_LIMIT_PER_PAGE;
    const foldersInFolder = await driveFolderService.getFolderFolders(folderId, foldersOffset, FOLDERS_LIMIT_PER_PAGE);
    const thereAreMoreFolders = foldersInFolder.folders.length === FOLDERS_LIMIT_PER_PAGE;

    return {
      thereAreMoreFiles,
      thereAreMoreFolders,
      folders: foldersInFolder.folders.map((folder) => {
        const driveFolder = {
          ...folder,
          updatedAt: folder.updatedAt.toString(),
          createdAt: folder.createdAt.toString(),
          plainName: folder.plainName,
          parentId: folder.parentId,
          name: folder.name,
          uuid: folder.uuid,
          id: folder.id,
          userId: folder.userId,
          // @ts-expect-error - API is returning status, missing from SDK
          status: folder.status,
          isFolder: true,
        };

        return driveFolder;
      }),
      files: filesInFolder.files.map((file) => {
        const driveFile = {
          ...file,
          uuid: file.uuid,
          id: file.id,
          fileId: file.fileId,
          plainName: file.plainName,
          type: file.type,
          bucket: file.bucket,
          createdAt: file.createdAt.toString(),
          updatedAt: file.updatedAt.toString(),
          deletedAt: null,
          status: file.status,
          size: typeof file.size === 'bigint' ? Number(file.size) : file.size,
          folderId: file.folderId,
          thumbnails: file.thumbnails ?? [],
        };

        return driveFile;
      }),
    };
  };

  const loadFolderContent = async (folderId: string, options?: LoadFolderContentOptions) => {
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
    parentId: string;
    folderId: string;
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
        uuid: folderId,
        files: allFiles,
        folders: allFolders,
        loading: false,
        error,
      } as DriveFoldersTreeNode,
    };

    allFolders.forEach((folder) => {
      const existingNode = driveFoldersTree[folder.uuid];
      if (!existingNode) {
        newTreeNodes[folder.uuid] = {
          uuid: folder.uuid,
          name: folder.plainName ?? '',
          parentId: folder.parentUuid,
          id: folder.id,
          updatedAt: folder.updatedAt,
          createdAt: folder.createdAt,
          loading: true,
          files: [],
          folders: [],
          // @ts-expect-error - leave old implementation in order to not break anything
          currentFoldersPage: 2,
          error: undefined,
        };
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
        rootFolderId: rootFolderId ?? '',
      }}
    >
      {children}
    </DriveContext.Provider>
  );
};
