import { act, renderHook, waitFor } from '@testing-library/react-native';
import { shareDriveService } from '../services/shareDriveService';
import { ShareFileItem, ShareFolderItem } from '../types';
import { useFolderNavigation } from './useFolderNavigation';

jest.mock('../services/shareDriveService', () => ({
  shareDriveService: {
    getFolderFolders: jest.fn(),
    getFolderFiles: jest.fn(),
    createFolder: jest.fn(),
  },
}));

jest.mock('src/services/ErrorService', () => ({
  __esModule: true,
  default: { reportError: jest.fn() },
}));

const mockService = shareDriveService as jest.Mocked<typeof shareDriveService>;

const ROOT_UUID = 'root-uuid';
const SUBFOLDER_UUID = 'sub-uuid';
const FULL_PAGE_SIZE = 50;
const NETWORK_ERROR = new Error('Network request failed');

const buildFolders = (count: number, prefix = 'folder'): ShareFolderItem[] =>
  Array.from({ length: count }, (_, i) => ({ uuid: `${prefix}-${i}`, plainName: `${prefix} ${i}`, updatedAt: '' }));

const foldersPage = (items: ShareFolderItem[]) => ({ items, hasMore: items.length >= FULL_PAGE_SIZE });
const emptyFilesPage = { items: [] as ShareFileItem[], hasMore: false };

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderLoadedHook = async () => {
  const rendered = renderHook(() => useFolderNavigation(ROOT_UUID));
  await waitFor(() => expect(rendered.result.current.loading).toBe(false));
  return rendered;
};

const callLoadMoreTimes = async (loadMore: () => Promise<void>, times: number) => {
  await act(async () => {
    for (let i = 0; i < times; i++) {
      await loadMore();
    }
  });
};

const totalServiceCalls = () =>
  mockService.getFolderFolders.mock.calls.length + mockService.getFolderFiles.mock.calls.length;

beforeEach(() => {
  jest.clearAllMocks();
  mockService.getFolderFiles.mockResolvedValue(emptyFilesPage);
});

describe('useFolderNavigation', () => {
  test('when the first folder listing fails and the end of the list is reached many times, then the hook reports a load error and sends no more requests', async () => {
    mockService.getFolderFolders.mockRejectedValue(NETWORK_ERROR);
    const { result } = await renderLoadedHook();

    expect(result.current.hasLoadError).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.folders).toEqual([]);
    expect(result.current.files).toEqual([]);

    await callLoadMoreTimes(result.current.loadMore, 20);

    expect(mockService.getFolderFolders).toHaveBeenCalledTimes(1);
    expect(mockService.getFolderFiles).not.toHaveBeenCalled();
    expect(result.current.loadingMore).toBe(false);
  });

  test('when a stale listing fails after the user moved to another folder, then the new folder shows no error', async () => {
    const staleRootListing = deferred<ReturnType<typeof foldersPage>>();
    const subfolderItems = buildFolders(2, 'sub');
    mockService.getFolderFolders
      .mockReturnValueOnce(staleRootListing.promise)
      .mockResolvedValueOnce(foldersPage(subfolderItems));
    const { result } = renderHook(() => useFolderNavigation(ROOT_UUID));

    act(() => result.current.navigate(SUBFOLDER_UUID, 'Sub'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => staleRootListing.reject(NETWORK_ERROR));

    expect(result.current.hasLoadError).toBe(false);
    expect(result.current.folders).toEqual(subfolderItems);
  });

  test('when retrying after a failed load returns a full page, then the contents are shown, the error clears and scrolling loads the next page again', async () => {
    mockService.getFolderFolders.mockRejectedValueOnce(NETWORK_ERROR);
    const { result } = await renderLoadedHook();
    const retryListing = deferred<ReturnType<typeof foldersPage>>();
    const folderItems = buildFolders(FULL_PAGE_SIZE);
    mockService.getFolderFolders.mockReturnValueOnce(retryListing.promise);

    let refreshPromise: Promise<void> = Promise.resolve();
    act(() => {
      refreshPromise = result.current.refresh();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.hasLoadError).toBe(false);

    await act(async () => {
      retryListing.resolve(foldersPage(folderItems));
      await refreshPromise;
    });

    expect(result.current.folders).toEqual(folderItems);
    expect(result.current.hasLoadError).toBe(false);

    await callLoadMoreTimes(result.current.loadMore, 1);

    expect(mockService.getFolderFolders).toHaveBeenLastCalledWith(ROOT_UUID, FULL_PAGE_SIZE);
  });

  test('when loading the next page fails, then the promise resolves, loaded items are kept and further scrolling sends no more requests until a reload', async () => {
    const firstPage = buildFolders(FULL_PAGE_SIZE);
    mockService.getFolderFolders.mockResolvedValueOnce(foldersPage(firstPage)).mockRejectedValueOnce(NETWORK_ERROR);
    const { result } = await renderLoadedHook();

    await expect(callLoadMoreTimes(result.current.loadMore, 1)).resolves.toBeUndefined();

    expect(result.current.folders).toEqual(firstPage);
    expect(result.current.loadingMore).toBe(false);
    expect(result.current.hasLoadError).toBe(false);

    const callsAfterFailure = totalServiceCalls();
    await callLoadMoreTimes(result.current.loadMore, 10);

    expect(totalServiceCalls()).toBe(callsAfterFailure);

    mockService.getFolderFolders.mockResolvedValue(foldersPage(firstPage));
    await act(() => result.current.refresh());
    await callLoadMoreTimes(result.current.loadMore, 1);

    expect(mockService.getFolderFolders).toHaveBeenLastCalledWith(ROOT_UUID, FULL_PAGE_SIZE);
  });

  test('when opening a subfolder and going back after failed loads, then each successful load clears the error', async () => {
    const rootItems = buildFolders(2, 'root');
    const subfolderItems = buildFolders(2, 'sub');
    mockService.getFolderFolders
      .mockRejectedValueOnce(NETWORK_ERROR)
      .mockResolvedValueOnce(foldersPage(subfolderItems))
      .mockRejectedValueOnce(NETWORK_ERROR)
      .mockResolvedValueOnce(foldersPage(rootItems));
    const { result } = await renderLoadedHook();

    act(() => result.current.navigate(SUBFOLDER_UUID, 'Sub'));
    await waitFor(() => expect(result.current.folders).toEqual(subfolderItems));

    expect(result.current.hasLoadError).toBe(false);
    expect(mockService.getFolderFolders).toHaveBeenLastCalledWith(SUBFOLDER_UUID, 0);

    await act(() => result.current.refresh());

    expect(result.current.hasLoadError).toBe(true);

    act(() => result.current.goBack());
    await waitFor(() => expect(result.current.folders).toEqual(rootItems));

    expect(result.current.hasLoadError).toBe(false);
    expect(result.current.currentFolder.uuid).toBe(ROOT_UUID);
  });

  test('when the folder is genuinely empty, then exactly one folders and one files request are sent', async () => {
    mockService.getFolderFolders.mockResolvedValue(foldersPage([]));
    const { result } = await renderLoadedHook();

    await callLoadMoreTimes(result.current.loadMore, 10);

    expect(mockService.getFolderFolders).toHaveBeenCalledTimes(1);
    expect(mockService.getFolderFiles).toHaveBeenCalledTimes(1);
    expect(result.current.hasLoadError).toBe(false);
    expect(result.current.files).toEqual([]);
  });
});
