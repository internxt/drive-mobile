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
