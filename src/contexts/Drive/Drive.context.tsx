import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { DriveFileForTree, Thumbnail } from '@internxt-mobile/types/drive/file';
import { DriveFolderForTree } from '@internxt-mobile/types/drive/folder';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { DEFAULT_SORT_MODE, DriveListViewMode, isSameSortMode, SortMode } from '@internxt-mobile/types/drive/ui';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import React, { useEffect, useRef, useState } from 'react';

import appService from '@internxt-mobile/services/AppService';
import errorService from '@internxt-mobile/services/ErrorService';
import notificationsService from '@internxt-mobile/services/NotificationsService';
import { NotificationType } from '@internxt-mobile/types/index';
import { AppStateStatus, NativeEventSubscription } from 'react-native';

import { driveFolderService } from '@internxt-mobile/services/drive/folder';
import { mapFileWithIsFolder, mapFolderWithIsFolder } from 'src/helpers/driveItemMappers';

export type DriveFoldersTreeNode = {
  name: string;
  parentId: string; //uuid of the parent folder
  uuid: string; //uuid of current folder
  updatedAt: string;
  createdAt: string;
  loading: boolean;
  files: DriveFileForTree[];
  folders: DriveFolderForTree[];
  sortMode?: SortMode;
  nextFoldersOffset: number | null; // null when there are no folders left
  nextFilesOffset: number | null; // null when there are no files left
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
  sortMode: SortMode;
  changeSortMode: (sortMode: SortMode) => void;
  loadFolderContent: (folderUuid: string, options?: LoadFolderContentOptions) => Promise<void>;
  focusedFolder: DriveFoldersTreeNode | null;
  focusFolder: (folderUuid: string) => void;
  updateItemInTree: (
    folderId: string,
    itemUuid: string,
    updates: { name?: string; plainName?: string; thumbnails?: Thumbnail[] },
  ) => void;
  removeItemFromTree: (folderId: string, itemUuid: string) => void;
  addItemToTree: (folderId: string, item: DriveItemData, isFolder: boolean) => void;
}

type FolderContent = {
  files: DriveFileForTree[];
  folders: DriveFolderForTree[];
  nextFoldersOffset: number | null;
  nextFilesOffset: number | null;
};

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

const getNextOffset = (offset: number, pageItemsCount: number, pageSize: number): number | null =>
  pageItemsCount === pageSize ? offset + pageItemsCount : null;

const getNextOffsetAfterRemoving = (nextOffset: number | null, removedItemsCount: number): number | null =>
  nextOffset === null ? null : nextOffset - removedItemsCount;

/**
 * Replaces the loaded items that come again in the page with their new version, keeping their position,
 * and appends the rest of the page.
 */
const mergePageIntoLoadedItems = <Item extends { uuid: string }>(loadedItems: Item[], pageItems: Item[]): Item[] => {
  const pageItemsByUuid = new Map(pageItems.map((pageItem) => [pageItem.uuid, pageItem]));
  const loadedUuids = new Set(loadedItems.map((loadedItem) => loadedItem.uuid));
  const updatedLoadedItems = loadedItems.map((loadedItem) => pageItemsByUuid.get(loadedItem.uuid) ?? loadedItem);
  const newPageItems = pageItems.filter((pageItem) => !loadedUuids.has(pageItem.uuid));
  return [...updatedLoadedItems, ...newPageItems];
};

export const DriveContextProvider: React.FC<DriveContextProviderProps> = ({ children, rootFolderId }) => {
  const ROOT_FOLDER_NODE: DriveFoldersTreeNode = {
    name: 'Drive',
    parentId: '',
    uuid: rootFolderId as string,
    updatedAt: '',
    createdAt: '',
    loading: true,
    files: [],
    folders: [],
    nextFoldersOffset: 0,
    nextFilesOffset: 0,
  };

  const [viewMode, setViewMode] = useState(DriveListViewMode.List);
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT_MODE);
  const sortModeRef = useRef<SortMode>(DEFAULT_SORT_MODE);
  const [driveFoldersTree, setDriveFoldersTree] = useState<DriveFoldersTree>({
    [rootFolderId]: ROOT_FOLDER_NODE,
  });

  const [currentFolder, setCurrentFolder] = useState<DriveFoldersTreeNode | null>(null);
  const currentFolderId = useRef<string | null>(null);
  const onAppStateChangeListener = useRef<NativeEventSubscription | null>(null);
  const folderAbortControllers = useRef<Map<string, AbortController>>(new Map());
  const driveFoldersTreeRef = useRef<DriveFoldersTree>({ [rootFolderId]: ROOT_FOLDER_NODE });

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
    driveFoldersTreeRef.current = driveFoldersTree;
  }, [driveFoldersTree]);

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

  const fetchFoldersPage = async (
    folderId: string,
    offset: number,
    requestedSortMode: SortMode,
  ): Promise<DriveFolderForTree[]> => {
    const foldersInFolder = await driveFolderService.getFolderFolders(
      folderId,
      offset,
      FOLDERS_LIMIT_PER_PAGE,
      requestedSortMode,
    );

    return foldersInFolder.folders.map((folder) =>
      mapFolderWithIsFolder({
        ...folder,
        updatedAt: folder.updatedAt.toString(),
        createdAt: folder.createdAt.toString(),
        plainName: folder.plainName,
        parentId: folder.parentId,
        name: folder.name,
        uuid: folder.uuid,
        userId: folder.userId,
        status: folder.status,
      }),
    );
  };

  const fetchFilesPage = async (
    folderId: string,
    offset: number,
    requestedSortMode: SortMode,
  ): Promise<DriveFileForTree[]> => {
    const filesInFolder = await driveFolderService.getFolderFiles(
      folderId,
      offset,
      FILES_LIMIT_PER_PAGE,
      requestedSortMode,
    );

    return filesInFolder.files.map((file) =>
      mapFileWithIsFolder({
        ...file,
        uuid: file.uuid,
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
    );
  };

  /**
   * Fetches the next page of folders while there are folders left, and the next page of files once
   * there are none.
   */
  const fetchNextFolderContentPage = async (
    folderId: string,
    shouldResetPagination: boolean,
    requestedSortMode: SortMode,
  ): Promise<FolderContent> => {
    const currentNode = driveFoldersTreeRef.current[folderId] ?? ROOT_FOLDER_NODE;
    const foldersOffset = shouldResetPagination ? 0 : currentNode.nextFoldersOffset;
    const filesOffset = shouldResetPagination ? 0 : currentNode.nextFilesOffset;

    const folders = foldersOffset === null ? [] : await fetchFoldersPage(folderId, foldersOffset, requestedSortMode);
    const nextFoldersOffset =
      foldersOffset === null ? null : getNextOffset(foldersOffset, folders.length, FOLDERS_LIMIT_PER_PAGE);

    if (nextFoldersOffset !== null) {
      return { folders, files: [], nextFoldersOffset, nextFilesOffset: filesOffset };
    }

    const files = filesOffset === null ? [] : await fetchFilesPage(folderId, filesOffset, requestedSortMode);
    const nextFilesOffset =
      filesOffset === null ? null : getNextOffset(filesOffset, files.length, FILES_LIMIT_PER_PAGE);

    return { folders, files, nextFoldersOffset, nextFilesOffset };
  };

  const fetchAllFolderContent = async (folderId: string): Promise<FolderContent> => {
    const folderContent = await driveFolderService.getFolderContentByUuid(folderId);

    return {
      nextFoldersOffset: null,
      nextFilesOffset: null,
      folders: folderContent.children.map((folder) =>
        mapFolderWithIsFolder({
          uuid: folder.uuid,
          plainName: folder.plainName || folder.plain_name || '',
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

  const refreshFolderAbortController = (folderId: string): AbortController => {
    folderAbortControllers.current.get(folderId)?.abort();
    const controller = new AbortController();
    folderAbortControllers.current.set(folderId, controller);
    return controller;
  };

  const updateFolderNode = (folderId: string, updates: Partial<DriveFoldersTreeNode>) => {
    setDriveFoldersTree((prevTree) => {
      const node = prevTree[folderId];
      if (!node) {
        return prevTree;
      }
      return { ...prevTree, [folderId]: { ...node, ...updates } };
    });
  };

  const fetchFolderData = async ({
    folderId,
    controller,
    options,
    requestedSortMode,
  }: {
    folderId: string;
    controller: AbortController;
    options?: LoadFolderContentOptions;
    requestedSortMode: SortMode;
  }): Promise<FolderContent | null> => {
    if (controller.signal.aborted) {
      return null;
    }

    if (options?.loadAllContent) {
      return fetchAllFolderContent(folderId);
    }

    return fetchNextFolderContentPage(folderId, options?.resetPagination ?? false, requestedSortMode);
  };

  const loadFolderContent = async (folderId: string, options?: LoadFolderContentOptions) => {
    const driveFolderNode = driveFoldersTreeRef.current[folderId] ?? ROOT_FOLDER_NODE;
    if (options?.focusFolder) {
      setCurrentFolder(driveFolderNode);
    }

    const requestedSortMode = sortModeRef.current;
    const wasLoadedWithAnotherSort = !isSameSortMode(driveFolderNode.sortMode, requestedSortMode);
    const shouldResetPagination = (options?.resetPagination ?? false) || wasLoadedWithAnotherSort;
    const hasNothingMoreToLoad =
      !shouldResetPagination &&
      !options?.loadAllContent &&
      driveFolderNode.nextFoldersOffset === null &&
      driveFolderNode.nextFilesOffset === null;

    if (hasNothingMoreToLoad) {
      return;
    }

    const controller = refreshFolderAbortController(folderId);
    updateFolderNode(folderId, { loading: true, error: undefined });

    try {
      const driveFolderNodeContent = await fetchFolderData({
        folderId,
        controller,
        options: { ...options, resetPagination: shouldResetPagination },
        requestedSortMode,
      });
      if (!driveFolderNodeContent || controller.signal.aborted) {
        return;
      }

      updateDriveFoldersTree({
        folderId,
        parentId: driveFolderNode.parentId,
        newFiles: driveFolderNodeContent.files,
        newFolders: driveFolderNodeContent.folders,
        nextFoldersOffset: driveFolderNodeContent.nextFoldersOffset,
        nextFilesOffset: driveFolderNodeContent.nextFilesOffset,
        error: undefined,
        resetPagination: shouldResetPagination,
        sortMode: requestedSortMode,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      updateFolderNode(folderId, { loading: false, error: error as Error });
      throw error;
    } finally {
      if (folderAbortControllers.current.get(folderId) === controller) {
        folderAbortControllers.current.delete(folderId);
      }
    }
  };

  const updateDriveFoldersTree = ({
    newFiles,
    newFolders,
    error,
    folderId,
    parentId,
    resetPagination,
    sortMode: loadedSortMode,
    nextFoldersOffset,
    nextFilesOffset,
  }: {
    parentId: string;
    folderId: string;
    newFiles: DriveFileForTree[];
    resetPagination: boolean;
    sortMode: SortMode;
    nextFoldersOffset: number | null;
    nextFilesOffset: number | null;
    newFolders: DriveFolderForTree[];
    error?: Error;
  }) => {
    setDriveFoldersTree((prevDriveFoldersTree) => {
      const driveFolderTreeNode = prevDriveFoldersTree[folderId];

      const allFiles = resetPagination
        ? newFiles
        : mergePageIntoLoadedItems(driveFolderTreeNode?.files ?? [], newFiles);

      const allFolders = resetPagination
        ? newFolders
        : mergePageIntoLoadedItems(driveFolderTreeNode?.folders ?? [], newFolders);

      const newTreeNodes = {
        [folderId]: {
          name: driveFolderTreeNode?.name || 'Drive',
          parentId: parentId,
          uuid: folderId,
          files: allFiles,
          folders: allFolders,
          sortMode: loadedSortMode,
          nextFoldersOffset,
          nextFilesOffset,
          loading: false,
          error,
        } as DriveFoldersTreeNode,
      };

      allFolders.forEach((folder) => {
        const existingNode = prevDriveFoldersTree[folder.uuid];
        if (!existingNode) {
          newTreeNodes[folder.uuid] = {
            uuid: folder.uuid,
            name: folder.plainName ?? '',
            parentId: folder.parentUuid,
            updatedAt: folder.updatedAt,
            createdAt: folder.createdAt,
            loading: true,
            files: [],
            folders: [],
            nextFoldersOffset: 0,
            nextFilesOffset: 0,
            error: undefined,
          };
        }
      });

      return { ...prevDriveFoldersTree, ...newTreeNodes };
    });
  };

  const updateItemInTree = (
    folderId: string,
    itemUuid: string,
    updates: { name?: string; plainName?: string; thumbnails?: Thumbnail[] },
  ) => {
    setDriveFoldersTree((prevTree) => {
      const folder = prevTree[folderId];
      if (!folder) {
        return prevTree;
      }

      return {
        ...prevTree,
        [folderId]: {
          ...folder,
          files: folder.files.map((file) => (file.uuid === itemUuid ? { ...file, ...updates } : file)),
          folders: folder.folders.map((folderItem) =>
            folderItem.uuid === itemUuid ? { ...folderItem, ...updates } : folderItem,
          ),
        },
      };
    });
  };

  const removeItemFromTree = (folderId: string, itemUuid: string) => {
    setDriveFoldersTree((prevTree) => {
      const folder = prevTree[folderId];
      if (!folder) {
        return prevTree;
      }
      const remainingFiles = folder.files.filter((file) => file.uuid !== itemUuid);
      const remainingFolders = folder.folders.filter((folderItem) => folderItem.uuid !== itemUuid);
      return {
        ...prevTree,
        [folderId]: {
          ...folder,
          files: remainingFiles,
          folders: remainingFolders,
          nextFilesOffset: getNextOffsetAfterRemoving(
            folder.nextFilesOffset,
            folder.files.length - remainingFiles.length,
          ),
          nextFoldersOffset: getNextOffsetAfterRemoving(
            folder.nextFoldersOffset,
            folder.folders.length - remainingFolders.length,
          ),
        },
      };
    });
  };

  const addItemToTree = (folderId: string, item: DriveItemData, isFolder: boolean) => {
    setDriveFoldersTree((prevTree) => {
      const folder = prevTree[folderId];
      if (!folder) {
        return prevTree;
      }

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

  /**
   * Makes an already loaded folder the focused one, without loading it. Does nothing if the folder is not
   * in the tree.
   */
  const focusFolder = (folderUuid: string) => {
    const folderNode = driveFoldersTreeRef.current[folderUuid];
    if (!folderNode) {
      return;
    }
    setCurrentFolder(folderNode);
  };

  const changeSortMode = (newSortMode: SortMode) => {
    sortModeRef.current = newSortMode;
    setSortMode(newSortMode);
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
        sortMode,
        changeSortMode,
        loadFolderContent,
        // Default current folder is the root folder
        focusedFolder: currentFolder,
        focusFolder,
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
