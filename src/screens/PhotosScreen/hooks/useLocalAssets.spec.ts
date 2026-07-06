import { act, renderHook } from '@testing-library/react-native';
import * as MediaLibrary from 'expo-media-library';
import { AppState } from 'react-native';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';
import { useLocalAssets } from './useLocalAssets';

jest.mock('expo-media-library', () => ({
  MediaType: { photo: 'photo', video: 'video' },
  SortBy: { creationTime: 'creationTime' },
  getAssetsAsync: jest.fn(),
  addListener: jest.fn(),
}));

jest.mock('src/services/photos/database/photosLocalDB', () => ({
  photosLocalDB: {
    init: jest.fn().mockResolvedValue(undefined),
    getSyncedEntries: jest.fn(),
    getIncompleteBurstAssets: jest.fn().mockResolvedValue([]),
    deleteAssetSync: jest.fn().mockResolvedValue(undefined),
    cleanupOrphanedAssetSync: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('src/store/hooks', () => ({
  useAppSelector: jest.fn(),
}));

const mockMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>;
const mockPhotosLocalDB = photosLocalDB as jest.Mocked<typeof photosLocalDB>;
const mockUseAppSelector = useAppSelector as jest.Mock;
const photosState = {
  syncStatus: 'idle',
  uploadingAssetIds: [] as string[],
  sessionUploadedAssets: 0,
  isFetchingCloudHistory: false,
};

const makeAsset = (id: string, creationTime = 1000): MediaLibrary.Asset =>
  ({ id, uri: `file://${id}.jpg`, creationTime, mediaType: 'photo' }) as never;

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const makePage = (
  assets: MediaLibrary.Asset[],
  hasNextPage = false,
  endCursor = 'cursor-1',
): MediaLibrary.PagedInfo<MediaLibrary.Asset> => ({ assets, hasNextPage, endCursor, totalCount: assets.length });

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(photosState, {
    syncStatus: 'idle',
    uploadingAssetIds: [],
    sessionUploadedAssets: 0,
    isFetchingCloudHistory: false,
  });
  mockUseAppSelector.mockImplementation((selector: (state: { photos: typeof photosState }) => unknown) =>
    selector({ photos: photosState }),
  );
  mockPhotosLocalDB.getSyncedEntries.mockResolvedValue(new Map());
});

describe('useLocalAssets', () => {
  test('when the hook mounts, then the first page of local assets is loaded', async () => {
    const assets = [makeAsset('a1'), makeAsset('a2')];
    mockMediaLibrary.getAssetsAsync.mockResolvedValueOnce(makePage(assets));

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.assets).toEqual(assets);
    expect(result.current.isLoading).toBe(false);
  });

  test('when loadNextPage is called and there is a next page, then the new assets are appended', async () => {
    const firstAssets = [makeAsset('a1')];
    const secondAssets = [makeAsset('a2')];
    mockMediaLibrary.getAssetsAsync
      .mockResolvedValueOnce(makePage(firstAssets, true, 'cursor-1'))
      .mockResolvedValueOnce(makePage(secondAssets, false));

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.loadNextPage();
      await Promise.resolve();
    });

    expect(result.current.assets).toEqual([...firstAssets, ...secondAssets]);
  });

  test('when loadNextPage is called but there is no next page, then no additional fetch is made', async () => {
    mockMediaLibrary.getAssetsAsync.mockResolvedValueOnce(makePage([makeAsset('a1')], false));

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.loadNextPage();
      await Promise.resolve();
    });

    expect(mockMediaLibrary.getAssetsAsync).toHaveBeenCalledTimes(1);
  });

  test('when the app returns to the foreground and a recent photo was deleted while locked, then the deleted photo is removed from the gallery', async () => {
    const firstLoad = [makeAsset('a1'), makeAsset('a2')];
    const afterDelete = [makeAsset('a2')];
    mockMediaLibrary.getAssetsAsync
      .mockResolvedValueOnce(makePage(firstLoad))
      .mockResolvedValueOnce(makePage(afterDelete));

    let appStateCallback: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
      appStateCallback = cb as (state: string) => void;
      return { remove: jest.fn() } as never;
    });

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      appStateCallback?.('background');
      appStateCallback?.('active');
      await Promise.resolve();
    });

    expect(result.current.assets).toEqual(afterDelete);
  });

  test('when the device is unlocked after a photo was taken while locked, then the new photo appears at the top without discarding the already-loaded gallery', async () => {
    const existingAssets = [makeAsset('a1', 2000), makeAsset('a2', 1000)];
    const newPhoto = makeAsset('new', 3000);
    mockMediaLibrary.getAssetsAsync
      .mockResolvedValueOnce(makePage(existingAssets, false))
      .mockResolvedValueOnce(makePage([newPhoto, ...existingAssets], false));

    let appStateCallback: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
      appStateCallback = cb as (state: string) => void;
      return { remove: jest.fn() } as never;
    });

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      appStateCallback?.('background');
      appStateCallback?.('active');
      await Promise.resolve();
    });

    expect(result.current.assets[0]).toEqual(newPhoto);
    expect(result.current.assets).toContainEqual(existingAssets[0]);
    expect(result.current.assets).toContainEqual(existingAssets[1]);
  });

  test('when the device is unlocked mid-gallery, then assets loaded beyond the first page are preserved without re-pagination', async () => {
    const headAssets = [makeAsset('head1', 3000), makeAsset('head2', 2000)];
    const tailAssets = [makeAsset('tail1', 100), makeAsset('tail2', 50)];
    mockMediaLibrary.getAssetsAsync
      .mockResolvedValueOnce(makePage(headAssets, true, 'cursor-1'))
      .mockResolvedValueOnce(makePage(tailAssets, false))
      .mockResolvedValueOnce(makePage(headAssets, false));

    let appStateCallback: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
      appStateCallback = cb as (state: string) => void;
      return { remove: jest.fn() } as never;
    });

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => { await Promise.resolve(); }); // page 1
    await act(async () => { await Promise.resolve(); }); // page 2 eager

    expect(result.current.assets).toEqual([...headAssets, ...tailAssets]);

    await act(async () => {
      appStateCallback?.('background');
      appStateCallback?.('active');
      await Promise.resolve();
    });

    expect(result.current.assets).toEqual([...headAssets, ...tailAssets]);
    expect(mockMediaLibrary.getAssetsAsync).toHaveBeenCalledTimes(3);
  });

  test('when the first page has more pages, then all remaining pages are loaded on mount without waiting for a scroll', async () => {
    const page1 = [makeAsset('a1'), makeAsset('a2')];
    const page2 = [makeAsset('a3'), makeAsset('a4')];
    const page3 = [makeAsset('a5')];

    mockMediaLibrary.getAssetsAsync
      .mockResolvedValueOnce(makePage(page1, true, 'cursor-1'))
      .mockResolvedValueOnce(makePage(page2, true, 'cursor-2'))
      .mockResolvedValueOnce(makePage(page3, false));

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    }); // first page
    await act(async () => {
      await Promise.resolve();
    }); // page 2 (eager)
    await act(async () => {
      await Promise.resolve();
    }); // page 3 (eager)

    expect(result.current.assets).toEqual([...page1, ...page2, ...page3]);
    expect(mockMediaLibrary.getAssetsAsync).toHaveBeenCalledTimes(3);
  });

  test('when reload is called, then the gallery re-paginates from the start with fresh results', async () => {
    const firstAssets = [makeAsset('a1'), makeAsset('a2')];
    const reloadAssets = [makeAsset('a3')];
    mockMediaLibrary.getAssetsAsync
      .mockResolvedValueOnce(makePage(firstAssets))
      .mockResolvedValueOnce(makePage(reloadAssets));

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.assets).toEqual(reloadAssets);
    expect(mockMediaLibrary.getAssetsAsync).toHaveBeenCalledTimes(2);
  });

  test('when sync status changes and there are assets loaded, then synced ids refresh from the database', async () => {
    mockMediaLibrary.getAssetsAsync.mockResolvedValueOnce(makePage([makeAsset('a1')]));
    mockPhotosLocalDB.getSyncedEntries.mockResolvedValue(
      new Map([['a1', { modificationTime: null, status: 'synced' as const }]]),
    );

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockPhotosLocalDB.getSyncedEntries).toHaveBeenCalledWith(['a1']);
    expect(result.current.syncedIds.has('a1')).toBe(true);
    expect(result.current.cloudDeletedIds.has('a1')).toBe(false);
  });

  test('when the cloud history sync finishes, then synced ids refresh so cloud-deleted assets are reflected immediately', async () => {
    mockMediaLibrary.getAssetsAsync.mockResolvedValue(makePage([makeAsset('a1')]));
    mockPhotosLocalDB.getSyncedEntries
      .mockResolvedValueOnce(new Map([['a1', { modificationTime: null, status: 'synced' as const }]]))
      .mockResolvedValueOnce(new Map([['a1', { modificationTime: null, status: 'cloud_deleted' as const }]]));

    photosState.isFetchingCloudHistory = true;

    const { result, rerender } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.syncedIds.has('a1')).toBe(true);

    photosState.isFetchingCloudHistory = false;

    await act(async () => {
      rerender({});
      await Promise.resolve();
    });

    expect(result.current.syncedIds.has('a1')).toBe(false);
    expect(result.current.cloudDeletedIds.has('a1')).toBe(true);
  });

  test('when a photo is deleted from the device while the app is open, then it is removed from the gallery immediately and the cloud copy becomes visible', async () => {
    const existingAssets = [makeAsset('a1', 3000), makeAsset('a2', 2000), makeAsset('old', 100)];
    mockMediaLibrary.getAssetsAsync.mockResolvedValueOnce(makePage(existingAssets));

    let libraryChangeCallback: ((event: MediaLibrary.MediaLibraryAssetsChangeEvent) => void) | undefined;
    (mockMediaLibrary.addListener as jest.Mock).mockImplementation((cb) => {
      libraryChangeCallback = cb;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      libraryChangeCallback?.({
        hasIncrementalChanges: true,
        deletedAssets: [makeAsset('old', 100)],
        insertedAssets: [],
        updatedAssets: [],
      });
      await flushPromises();
    });

    expect(result.current.assets.find((a) => a.id === 'old')).toBeUndefined();
    expect(result.current.assets).toHaveLength(2);
    expect(mockPhotosLocalDB.deleteAssetSync).toHaveBeenCalledWith('old');
    expect(result.current.localDeletionDetectedCount).toBe(1);
    // getAssetsAsync should NOT have been called for the incremental update
    expect(mockMediaLibrary.getAssetsAsync).toHaveBeenCalledTimes(1);
  });

  test('when a new photo is taken while the app is open, then it appears at the top of the gallery immediately', async () => {
    const existingAssets = [makeAsset('a1', 2000), makeAsset('a2', 1000)];
    const newPhoto = makeAsset('new', 3000);
    mockMediaLibrary.getAssetsAsync.mockResolvedValueOnce(makePage(existingAssets));

    let libraryChangeCallback: ((event: MediaLibrary.MediaLibraryAssetsChangeEvent) => void) | undefined;
    (mockMediaLibrary.addListener as jest.Mock).mockImplementation((cb) => {
      libraryChangeCallback = cb;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      libraryChangeCallback?.({
        hasIncrementalChanges: true,
        insertedAssets: [newPhoto],
        deletedAssets: [],
        updatedAssets: [],
      });
      await flushPromises();
    });

    expect(result.current.assets[0]).toEqual(newPhoto);
    expect(result.current.assets).toHaveLength(3);
    expect(mockMediaLibrary.getAssetsAsync).toHaveBeenCalledTimes(1);
  });

  test('when a photo is edited on the device while the app is open, then its data is updated in place without triggering a cloud reload', async () => {
    const originalAsset = makeAsset('a1', 2000);
    const editedAsset = { ...originalAsset, uri: 'file://a1-edited.jpg', modificationTime: 9999 } as MediaLibrary.Asset;
    mockMediaLibrary.getAssetsAsync.mockResolvedValueOnce(makePage([originalAsset, makeAsset('a2', 1000)]));

    let libraryChangeCallback: ((event: MediaLibrary.MediaLibraryAssetsChangeEvent) => void) | undefined;
    (mockMediaLibrary.addListener as jest.Mock).mockImplementation((cb) => {
      libraryChangeCallback = cb;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      libraryChangeCallback?.({
        hasIncrementalChanges: true,
        updatedAssets: [editedAsset],
        insertedAssets: [],
        deletedAssets: [],
      });
      await flushPromises();
    });

    expect(result.current.assets.find((a) => a.id === 'a1')).toEqual(editedAsset);
    expect(result.current.localDeletionDetectedCount).toBe(0);
    expect(mockPhotosLocalDB.deleteAssetSync).not.toHaveBeenCalled();
  });

  test('when the media library fires a non-incremental event, then it falls back to a head-window reconcile fetch', async () => {
    jest.useFakeTimers();
    const initialAssets = [makeAsset('a1', 2000)];
    mockMediaLibrary.getAssetsAsync
      .mockResolvedValueOnce(makePage(initialAssets))
      .mockResolvedValueOnce(makePage(initialAssets));

    let libraryChangeCallback: ((event: MediaLibrary.MediaLibraryAssetsChangeEvent) => void) | undefined;
    (mockMediaLibrary.addListener as jest.Mock).mockImplementation((cb) => {
      libraryChangeCallback = cb;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      libraryChangeCallback?.({ hasIncrementalChanges: false });
      jest.runAllTimers();
      await Promise.resolve();
    });

    expect(mockMediaLibrary.getAssetsAsync).toHaveBeenCalledTimes(2);
    expect(result.current.assets).toEqual(initialAssets);
    jest.useRealTimers();
  });

  test('when the hook unmounts, then the media library listener is removed', async () => {
    mockMediaLibrary.getAssetsAsync.mockResolvedValueOnce(makePage([makeAsset('a1')]));

    const removeMock = jest.fn();
    (mockMediaLibrary.addListener as jest.Mock).mockReturnValue({ remove: removeMock });

    const { unmount } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    unmount();

    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  test('when an asset is cloud deleted, then it appears in cloudDeletedIds and not in syncedIds', async () => {
    mockMediaLibrary.getAssetsAsync.mockResolvedValueOnce(makePage([makeAsset('a1')]));
    mockPhotosLocalDB.getSyncedEntries.mockResolvedValue(
      new Map([['a1', { modificationTime: null, status: 'cloud_deleted' as const }]]),
    );

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.cloudDeletedIds.has('a1')).toBe(true);
    expect(result.current.syncedIds.has('a1')).toBe(false);
  });
});
