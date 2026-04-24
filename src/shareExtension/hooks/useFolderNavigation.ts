import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { shareDriveService } from '../services/shareDriveService';
import { DriveViewMode, ShareFileItem, ShareFolderItem } from '../types';

interface FolderNavEntry {
  uuid: string;
  name: string;
}

interface UseFolderNavigationResult {
  currentFolder: FolderNavEntry;
  folders: ShareFolderItem[];
  files: ShareFileItem[];
  loading: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  viewMode: DriveViewMode;
  setViewMode: (viewMode: DriveViewMode) => void;
  breadcrumb: FolderNavEntry[];
  navigate: (uuid: string, name: string) => void;
  goBack: () => void;
  refresh: () => Promise<void>;
  createFolder: (name: string) => Promise<void>;
}

const filterByName = <T extends { plainName: string }>(items: T[], query: string): T[] => {
  if (!query) return items;
  const queryLowerCase = query.toLowerCase();
  return items.filter((item) => item.plainName.toLowerCase().includes(queryLowerCase));
};

export const useFolderNavigation = (rootFolderUuid: string, rootFolderName = 'Drive'): UseFolderNavigationResult => {
  const [folderStack, setFolderStack] = useState<FolderNavEntry[]>([{ uuid: rootFolderUuid, name: rootFolderName }]);
  const [allFolders, setAllFolders] = useState<ShareFolderItem[]>([]);
  const [allFiles, setAllFiles] = useState<ShareFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<DriveViewMode>('list');

  const folderOffsetRef = useRef(0);
  const fileOffsetRef = useRef(0);
  const foldersExhaustedRef = useRef(false);
  const filesExhaustedRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const latestUuidRef = useRef<string>(rootFolderUuid);
  const loadSequentialRef = useRef(0);

  const currentFolder = folderStack[folderStack.length - 1];

  const loadFolder = useCallback(async (folderUuid: string) => {
    const capturedLoadSequence = ++loadSequentialRef.current;
    latestUuidRef.current = folderUuid;
    isLoadingMoreRef.current = false;
    folderOffsetRef.current = 0;
    fileOffsetRef.current = 0;
    foldersExhaustedRef.current = false;
    filesExhaustedRef.current = false;
    setLoading(true);
    setLoadingMore(false);
    setAllFolders([]);
    setAllFiles([]);

    try {
      const foldersPage = await shareDriveService.getFolderFolders(folderUuid, 0);
      if (loadSequentialRef.current !== capturedLoadSequence) return;

      setAllFolders(foldersPage.items);
      folderOffsetRef.current = foldersPage.items.length;

      if (!foldersPage.hasMore) {
        foldersExhaustedRef.current = true;
        const filesPage = await shareDriveService.getFolderFiles(folderUuid, 0);
        if (loadSequentialRef.current !== capturedLoadSequence) return;

        setAllFiles(filesPage.items);
        fileOffsetRef.current = filesPage.items.length;
        if (!filesPage.hasMore) filesExhaustedRef.current = true;
      }
    } catch (e) {
      console.error('loadFolder error:', e);
    } finally {
      if (loadSequentialRef.current === capturedLoadSequence) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolder(currentFolder.uuid);
  }, [currentFolder.uuid, loadFolder]);

  const loadMoreFiles = useCallback(async (uuid: string, capturedLoadSequence: number) => {
    const filesPage = await shareDriveService.getFolderFiles(uuid, fileOffsetRef.current);
    if (loadSequentialRef.current !== capturedLoadSequence) return;

    setAllFiles((prev) => [...prev, ...filesPage.items]);
    fileOffsetRef.current += filesPage.items.length;
    if (!filesPage.hasMore) filesExhaustedRef.current = true;
  }, []);

  const loadMoreFolders = useCallback(async (uuid: string, capturedLoadSequence: number) => {
    const foldersPage = await shareDriveService.getFolderFolders(uuid, folderOffsetRef.current);
    if (loadSequentialRef.current !== capturedLoadSequence) return;

    setAllFolders((prev) => [...prev, ...foldersPage.items]);
    folderOffsetRef.current += foldersPage.items.length;
    if (foldersPage.hasMore) return;

    foldersExhaustedRef.current = true;
    await loadMoreFiles(uuid, capturedLoadSequence);
  }, [loadMoreFiles]);

  const loadMore = useCallback(async () => {
    if (loading || isLoadingMoreRef.current || searchQuery) return;
    if (foldersExhaustedRef.current && filesExhaustedRef.current) return;

    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    const uuid = latestUuidRef.current;
    const capturedLoadSequence = loadSequentialRef.current;

    try {
      if (foldersExhaustedRef.current) {
        await loadMoreFiles(uuid, capturedLoadSequence);
      } else {
        await loadMoreFolders(uuid, capturedLoadSequence);
      }
    } finally {
      if (loadSequentialRef.current === capturedLoadSequence) setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [loading, searchQuery, loadMoreFiles, loadMoreFolders]);

  const navigateToFolder = useCallback((uuid: string, name: string) => {
    setSearchQuery('');
    setFolderStack((prev) => [...prev, { uuid, name }]);
  }, []);

  const goBack = useCallback(() => {
    setSearchQuery('');
    setFolderStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const refresh = useCallback(() => loadFolder(currentFolder.uuid), [currentFolder.uuid, loadFolder]);

  const createFolder = useCallback(
    async (name: string) => {
      await shareDriveService.createFolder(currentFolder.uuid, name);
      await loadFolder(currentFolder.uuid);
    },
    [currentFolder.uuid, loadFolder],
  );

  const folders = useMemo(() => filterByName(allFolders, searchQuery), [allFolders, searchQuery]);
  const files = useMemo(() => filterByName(allFiles, searchQuery), [allFiles, searchQuery]);

  return {
    currentFolder,
    folders,
    files,
    loading,
    loadingMore,
    loadMore,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    breadcrumb: folderStack,
    navigate: navigateToFolder,
    goBack,
    refresh,
    createFolder,
  };
};
