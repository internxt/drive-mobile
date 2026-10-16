const mockGetFolderFiles = jest.fn();
const mockGetFolderFolders = jest.fn();

jest.mock('@internxt-mobile/services/drive/folder', () => ({
  driveFolderService: {
    getFolderFiles: (...args: unknown[]) => mockGetFolderFiles(...args),
    getFolderFolders: (...args: unknown[]) => mockGetFolderFolders(...args),
  },
}));

jest.mock('@internxt-mobile/services/AsyncStorageService', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    saveItem: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@internxt-mobile/services/AppService', () => ({
  __esModule: true,
  default: { onAppStateChange: jest.fn(() => ({ remove: jest.fn() })) },
}));

jest.mock('@internxt-mobile/services/ErrorService', () => ({
  __esModule: true,
  default: { reportError: jest.fn(), castError: jest.fn(() => ({ message: 'error' })) },
}));

jest.mock('@internxt-mobile/services/NotificationsService', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { DEFAULT_SORT_MODE, SortDirection, SortMode, SortType } from '@internxt-mobile/types/drive/ui';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React, { useContext } from 'react';
import { DriveContext, DriveContextProvider, DriveContextType } from './Drive.context';

const ROOT_FOLDER_UUID = 'root-folder-uuid';
const PAGE_SIZE = 50;
const NEWER_FIRST: SortMode = { type: SortType.UpdatedAt, direction: SortDirection.Asc };

const buildFile = (fileNumber: number) => ({
  id: fileNumber,
  uuid: `file-${fileNumber}`,
  fileId: `file-id-${fileNumber}`,
  plainName: `file ${fileNumber}`,
  type: 'txt',
  bucket: 'bucket',
  createdAt: '2025-02-16T00:00:00.000Z',
  updatedAt: '2025-02-16T00:00:00.000Z',
  status: 'EXISTS',
  size: '1',
  folderId: 1,
});

const buildFullPageOfFiles = (firstFileNumber: number) =>
  Array.from({ length: PAGE_SIZE }, (_, index) => buildFile(firstFileNumber + index));

const buildFolder = (folderNumber: number) => ({
  id: folderNumber,
  uuid: `folder-${folderNumber}`,
  plainName: `folder ${folderNumber}`,
  name: `folder ${folderNumber}`,
  parentId: 1,
  userId: 1,
  createdAt: '2025-02-16T00:00:00.000Z',
  updatedAt: '2025-02-16T00:00:00.000Z',
  status: 'EXISTS',
});

const buildFolders = (firstFolderNumber: number, foldersCount: number) =>
  Array.from({ length: foldersCount }, (_, index) => buildFolder(firstFolderNumber + index));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DriveContextProvider rootFolderId={ROOT_FOLDER_UUID}>{children}</DriveContextProvider>
);

const renderDriveContext = async () => {
  const rendered = renderHook(() => useContext(DriveContext) as DriveContextType, { wrapper });
  await waitFor(() => expect(rendered.result.current.driveFoldersTree[ROOT_FOLDER_UUID].loading).toBe(false));
  return rendered;
};

describe('Loading the content of a Drive folder in the chosen order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFolderFiles.mockResolvedValueOnce({ files: buildFullPageOfFiles(0) });
    mockGetFolderFiles.mockResolvedValue({ files: [buildFile(PAGE_SIZE)] });
    mockGetFolderFolders.mockResolvedValue({ folders: [] });
  });

  test('when a folder is opened, then its content is asked by name from A to Z', async () => {
    await renderDriveContext();

    expect(mockGetFolderFiles).toHaveBeenCalledWith(ROOT_FOLDER_UUID, 0, PAGE_SIZE, DEFAULT_SORT_MODE);
    expect(mockGetFolderFolders).toHaveBeenCalledWith(ROOT_FOLDER_UUID, 0, PAGE_SIZE, DEFAULT_SORT_MODE);
  });

  test('when the user scrolls down without changing the order, then the next page is asked in the same order', async () => {
    const { result } = await renderDriveContext();

    await act(async () => {
      await result.current.loadFolderContent(ROOT_FOLDER_UUID, { resetPagination: false });
    });

    expect(mockGetFolderFiles).toHaveBeenLastCalledWith(ROOT_FOLDER_UUID, PAGE_SIZE, PAGE_SIZE, DEFAULT_SORT_MODE);
    expect(result.current.driveFoldersTree[ROOT_FOLDER_UUID].files).toHaveLength(PAGE_SIZE + 1);
  });

  test('when the order changes, then a folder loaded in the previous order is asked again from the first page', async () => {
    const { result } = await renderDriveContext();

    act(() => {
      result.current.changeSortMode(NEWER_FIRST);
    });
    await act(async () => {
      await result.current.loadFolderContent(ROOT_FOLDER_UUID, { resetPagination: false });
    });

    expect(result.current.sortMode).toStrictEqual(NEWER_FIRST);
    expect(mockGetFolderFiles).toHaveBeenLastCalledWith(ROOT_FOLDER_UUID, 0, PAGE_SIZE, NEWER_FIRST);
    expect(mockGetFolderFolders).toHaveBeenLastCalledWith(ROOT_FOLDER_UUID, 0, PAGE_SIZE, NEWER_FIRST);
    expect(result.current.driveFoldersTree[ROOT_FOLDER_UUID].files).toHaveLength(1);
  });
});

describe('Joining the pages of a Drive folder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFolderFolders.mockResolvedValue({ folders: [] });
  });

  test('when the next page brings an item that was already loaded, then it only appears once', async () => {
    const lastFileOfFirstPage = buildFile(PAGE_SIZE - 1);
    mockGetFolderFiles.mockResolvedValueOnce({ files: buildFullPageOfFiles(0) });
    mockGetFolderFiles.mockResolvedValueOnce({ files: [lastFileOfFirstPage, buildFile(PAGE_SIZE)] });
    const { result } = await renderDriveContext();

    await act(async () => {
      await result.current.loadFolderContent(ROOT_FOLDER_UUID, { resetPagination: false });
    });

    const loadedFileUuids = result.current.driveFoldersTree[ROOT_FOLDER_UUID].files.map((file) => file.uuid);
    expect(loadedFileUuids).toHaveLength(PAGE_SIZE + 1);
    expect(new Set(loadedFileUuids).size).toBe(loadedFileUuids.length);
  });

  test('when the next page brings a loaded item that changed, then it shows the new version in its place', async () => {
    const renamedLastFileOfFirstPage = { ...buildFile(PAGE_SIZE - 1), plainName: 'renamed file' };
    mockGetFolderFiles.mockResolvedValueOnce({ files: buildFullPageOfFiles(0) });
    mockGetFolderFiles.mockResolvedValueOnce({ files: [renamedLastFileOfFirstPage, buildFile(PAGE_SIZE)] });
    const { result } = await renderDriveContext();

    await act(async () => {
      await result.current.loadFolderContent(ROOT_FOLDER_UUID, { resetPagination: false });
    });

    const loadedFiles = result.current.driveFoldersTree[ROOT_FOLDER_UUID].files;
    expect(loadedFiles[PAGE_SIZE - 1].plainName).toBe('renamed file');
    expect(loadedFiles[PAGE_SIZE].uuid).toBe(buildFile(PAGE_SIZE).uuid);
  });
});

describe('Loading the next page of a Drive folder with many subfolders', () => {
  const loadNextPage = async (result: { current: DriveContextType }) => {
    await act(async () => {
      await result.current.loadFolderContent(ROOT_FOLDER_UUID, { resetPagination: false });
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFolderFiles.mockResolvedValue({ files: [buildFile(0)] });
  });

  test('when the first page is full of folders, then the files are not asked yet', async () => {
    mockGetFolderFolders.mockResolvedValue({ folders: buildFolders(0, PAGE_SIZE) });

    const { result } = await renderDriveContext();

    expect(mockGetFolderFolders).toHaveBeenCalledWith(ROOT_FOLDER_UUID, 0, PAGE_SIZE, DEFAULT_SORT_MODE);
    expect(mockGetFolderFiles).not.toHaveBeenCalled();
    expect(result.current.driveFoldersTree[ROOT_FOLDER_UUID].files).toHaveLength(0);
  });

  test('when the last page of folders arrives, then the first page of files comes with it', async () => {
    mockGetFolderFolders.mockResolvedValueOnce({ folders: buildFolders(0, PAGE_SIZE) });
    mockGetFolderFolders.mockResolvedValueOnce({ folders: buildFolders(PAGE_SIZE, 10) });
    const { result } = await renderDriveContext();

    await loadNextPage(result);

    expect(mockGetFolderFolders).toHaveBeenLastCalledWith(ROOT_FOLDER_UUID, PAGE_SIZE, PAGE_SIZE, DEFAULT_SORT_MODE);
    expect(mockGetFolderFiles).toHaveBeenCalledWith(ROOT_FOLDER_UUID, 0, PAGE_SIZE, DEFAULT_SORT_MODE);
    expect(result.current.driveFoldersTree[ROOT_FOLDER_UUID].folders).toHaveLength(PAGE_SIZE + 10);
    expect(result.current.driveFoldersTree[ROOT_FOLDER_UUID].files).toHaveLength(1);
  });

  test('when there are no folders left, then only the files are asked', async () => {
    mockGetFolderFolders.mockResolvedValue({ folders: buildFolders(0, 10) });
    mockGetFolderFiles.mockResolvedValueOnce({ files: buildFullPageOfFiles(0) });
    const { result } = await renderDriveContext();
    jest.clearAllMocks();

    await loadNextPage(result);

    expect(mockGetFolderFolders).not.toHaveBeenCalled();
    expect(mockGetFolderFiles).toHaveBeenCalledWith(ROOT_FOLDER_UUID, PAGE_SIZE, PAGE_SIZE, DEFAULT_SORT_MODE);
  });

  test('when every item of the folder is loaded, then Drive is not asked again', async () => {
    mockGetFolderFolders.mockResolvedValue({ folders: buildFolders(0, 10) });
    const { result } = await renderDriveContext();
    jest.clearAllMocks();

    await loadNextPage(result);

    expect(mockGetFolderFolders).not.toHaveBeenCalled();
    expect(mockGetFolderFiles).not.toHaveBeenCalled();
  });

  test('when exactly one page of folders exists, then the empty second page comes with the first page of files', async () => {
    mockGetFolderFolders.mockResolvedValueOnce({ folders: buildFolders(0, PAGE_SIZE) });
    mockGetFolderFolders.mockResolvedValueOnce({ folders: [] });
    const { result } = await renderDriveContext();

    await loadNextPage(result);

    expect(mockGetFolderFolders).toHaveBeenLastCalledWith(ROOT_FOLDER_UUID, PAGE_SIZE, PAGE_SIZE, DEFAULT_SORT_MODE);
    expect(mockGetFolderFiles).toHaveBeenCalledWith(ROOT_FOLDER_UUID, 0, PAGE_SIZE, DEFAULT_SORT_MODE);
    expect(result.current.driveFoldersTree[ROOT_FOLDER_UUID].files).toHaveLength(1);
  });

  test('when a file is added to the folder before its files are loaded, then the files still start from the first page', async () => {
    mockGetFolderFolders.mockResolvedValueOnce({ folders: buildFolders(0, PAGE_SIZE) });
    mockGetFolderFolders.mockResolvedValueOnce({ folders: buildFolders(PAGE_SIZE, 10) });
    const { result } = await renderDriveContext();

    act(() => {
      result.current.addItemToTree(ROOT_FOLDER_UUID, buildFile(PAGE_SIZE) as unknown as DriveItemData, false);
    });
    await loadNextPage(result);

    expect(mockGetFolderFiles).toHaveBeenCalledWith(ROOT_FOLDER_UUID, 0, PAGE_SIZE, DEFAULT_SORT_MODE);
  });

  test('when a fully loaded folder is refreshed, then it is asked again from the first page', async () => {
    mockGetFolderFolders.mockResolvedValue({ folders: buildFolders(0, 10) });
    const { result } = await renderDriveContext();
    jest.clearAllMocks();

    await act(async () => {
      await result.current.loadFolderContent(ROOT_FOLDER_UUID, { resetPagination: true });
    });

    expect(mockGetFolderFolders).toHaveBeenCalledWith(ROOT_FOLDER_UUID, 0, PAGE_SIZE, DEFAULT_SORT_MODE);
    expect(mockGetFolderFiles).toHaveBeenCalledWith(ROOT_FOLDER_UUID, 0, PAGE_SIZE, DEFAULT_SORT_MODE);
  });

  test('when the order changes on a fully loaded folder, then it is asked again from the first page', async () => {
    mockGetFolderFolders.mockResolvedValue({ folders: buildFolders(0, 10) });
    const { result } = await renderDriveContext();
    jest.clearAllMocks();

    act(() => {
      result.current.changeSortMode(NEWER_FIRST);
    });
    await loadNextPage(result);

    expect(mockGetFolderFolders).toHaveBeenCalledWith(ROOT_FOLDER_UUID, 0, PAGE_SIZE, NEWER_FIRST);
    expect(mockGetFolderFiles).toHaveBeenCalledWith(ROOT_FOLDER_UUID, 0, PAGE_SIZE, NEWER_FIRST);
  });
});
