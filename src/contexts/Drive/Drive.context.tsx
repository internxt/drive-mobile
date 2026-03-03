import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { DriveFileForTree, Thumbnail } from '@internxt-mobile/types/drive/file';
import { DriveFolderForTree } from '@internxt-mobile/types/drive/folder';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { DriveListViewMode } from '@internxt-mobile/types/drive/ui';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import React, { useEffect, useRef, useState } from 'react';

import appService from '@internxt-mobile/services/AppService';
import errorService from '@internxt-mobile/services/ErrorService';
import notificationsService from '@internxt-mobile/services/NotificationsService';
import { AppStateStatus, NativeEventSubscription } from 'react-native';
import { NotificationType } from '@internxt-mobile/types/index';

import { driveFolderService } from '@internxt-mobile/services/drive/folder';
import { mapFileWithIsFolder, mapFolderWithIsFolder } from 'src/helpers/driveItemMappers';

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
  updateItemInTree: (
    folderId: string,
    itemId: number,
    updates: { name?: string; plainName?: string; thumbnails?: Thumbnail[] },
  ) => void;
  removeItemFromTree: (folderId: string, itemId: number) => void;
  addItemToTree: (folderId: string, item: DriveItemData, isFolder: boolean) => void;
}

type LoadFolderContentOptions = {
  pullFrom?: 'network'[];
  resetPagination?: boolean;
  focusFolder?: boolean;
  loadAllContent?: boolean;
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
        // TODO: Refactor to custom hook (useDriveWithNotifications) to separate notification concerns from context
        errorService.reportError(error);
        const err = errorService.castError(error, 'content');
        notificationsService.show({
          type: NotificationType.Error,
          text1: err.message,
        });
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
        // TODO: Refactor to custom hook (useDriveWithNotifications) to separate notification concerns from context
        errorService.reportError(err);
        const error = errorService.castError(err, 'content');
        notificationsService.show({
          type: NotificationType.Error,
          text1: error.message,
        });
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
      folders: foldersInFolder.folders.map((folder) =>
        mapFolderWithIsFolder({
          ...folder,
          updatedAt: folder.updatedAt.toString(),
          createdAt: folder.createdAt.toString(),
          plainName: folder.plainName,
          parentId: folder.parentId,
          name: folder.name,
          uuid: folder.uuid,
          id: folder.id,
          userId: folder.userId,
          status: folder.status,
        }),
      ),
      files: filesInFolder.files.map((file) =>
        mapFileWithIsFolder({
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
          deleted: false,
          status: file.status,
          size: Number(file.size),
          folderId: file.folderId,
          // @ts-expect-error - API is returning thumbnails, missing from SDK
          thumbnails: file.thumbnails ?? [],
        }),
      ),
    };
  };

  const fetchAllFolderContent = async (
    folderId: string,
  ): Promise<{
    files: DriveFileForTree[];
    folders: DriveFolderForTree[];
  }> => {
    const folderContent = await driveFolderService.getFolderContentByUuid(folderId);

    return {
      folders: folderContent.children.map((folder) =>
        mapFolderWithIsFolder({
          uuid: folder.uuid,
          plainName: folder.plainName || folder.plain_name || '',
          id: folder.id,
          bucket: folder.bucket || null,
          createdAt: folder.createdAt,
          deleted: false,
          name: folder.plainName ?? folder.plain_name ?? (folder.name || ''),
          parentId: folder.parentId || folder.parent_id || null,
          parentUuid: folderId,
          updatedAt: folder.updatedAt,
          userId: folder.userId,
          // @ts-expect-error - API is returning status, missing from SDK
          status: folder.status,
        }),
      ),
      files: folderContent.files.map((file) =>
        mapFileWithIsFolder({
          uuid: file.uuid,
          plainName: file.plainName || file.plain_name || '',
          bucket: file.bucket,
          createdAt: file.createdAt,
          deleted: file.deleted || false,
          deletedAt: file.deletedAt,
          fileId: file.fileId,
          folderId: file.folderId || file.folder_id,
          folderUuid: folderId,
          id: file.id,
          name: file.plainName || file.plain_name || file.name,
          size: typeof file.size === 'bigint' ? Number(file.size) : file.size,
          type: file.type,
          updatedAt: file.updatedAt,
          status: file.status,
          thumbnails: file.thumbnails ?? [],
          shares: file.shares,
          sharings: file.sharings,
          user: file.user,
        }),
      ),
    };
  };

  const loadFolderContent = async (folderId: string, options?: LoadFolderContentOptions) => {
    const shouldResetPagination = options?.resetPagination;
    const driveFolderTreeNode: DriveFoldersTreeNode = driveFoldersTree[folderId] ?? ROOT_FOLDER_NODE;
    if (!driveFolderTreeNode) throw new Error('Cannot load this folder');

    if (options?.focusFolder && driveFolderTreeNode) {
      setCurrentFolder(driveFolderTreeNode);
    }

    let files: DriveFileForTree[] = [];
    let folders: DriveFolderForTree[] = [];

    if (options?.loadAllContent) {
      const allContent = await fetchAllFolderContent(folderId);
      files = allContent.files;
      folders = allContent.folders;
    } else {
      const nextFilesPage = options?.resetPagination
        ? 1
        : Math.ceil(driveFolderTreeNode.files.length / FILES_LIMIT_PER_PAGE) + 1;
      const nextFoldersPage = options?.resetPagination
        ? 1
        : Math.ceil(driveFolderTreeNode.folders.length / FOLDERS_LIMIT_PER_PAGE) + 1;

      const paginatedContent = await fetchFolderContent(folderId, nextFilesPage, nextFoldersPage);
      files = paginatedContent.files;
      folders = paginatedContent.folders;
    }

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

  const updateItemInTree = (
    folderId: string,
    itemId: number,
    updates: { name?: string; plainName?: string; thumbnails?: Thumbnail[] },
  ) => {
    setDriveFoldersTree((prevTree) => {
      const folder = prevTree[folderId];
      if (!folder) return prevTree;

      return {
        ...prevTree,
        [folderId]: {
          ...folder,
          files: folder.files.map((file) => (file.id === itemId ? { ...file, ...updates } : file)),
          folders: folder.folders.map((folderItem) =>
            folderItem.id === itemId ? { ...folderItem, ...updates } : folderItem,
          ),
        },
      };
    });
  };

  const removeItemFromTree = (folderId: string, itemId: number) => {
    setDriveFoldersTree((prevTree) => {
      const folder = prevTree[folderId];
      if (!folder) return prevTree;
      return {
        ...prevTree,
        [folderId]: {
          ...folder,
          files: folder.files.filter((file) => file.id !== itemId),
          folders: folder.folders.filter((folderItem) => folderItem.id !== itemId),
        },
      };
    });
  };

  const addItemToTree = (folderId: string, item: DriveItemData, isFolder: boolean) => {
    setDriveFoldersTree((prevTree) => {
      const folder = prevTree[folderId];
      if (!folder) return prevTree;

      return {
        ...prevTree,
        [folderId]: {
          ...folder,
          files: !isFolder ? [...folder.files, item as DriveFileForTree] : folder.files,
          folders: isFolder ? [...folder.folders, item as DriveFolderForTree] : folder.folders,
        },
      };
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
        updateItemInTree,
        removeItemFromTree,
        addItemToTree,
      }}
    >
      {children}
    </DriveContext.Provider>
  );
};
