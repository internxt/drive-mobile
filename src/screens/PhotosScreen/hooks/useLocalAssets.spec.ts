import { act, renderHook } from '@testing-library/react-native';
import * as MediaLibrary from 'expo-media-library';
import { AppState } from 'react-native';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useLocalAssets } from './useLocalAssets';

jest.mock('expo-media-library', () => ({
  MediaType: { photo: 'photo', video: 'video' },
  SortBy: { creationTime: 'creationTime' },
  getAssetsAsync: jest.fn(),
}));

jest.mock('src/services/photos/database/photosLocalDB', () => ({
  photosLocalDB: {
    init: jest.fn().mockResolvedValue(undefined),
    getSyncedEntries: jest.fn(),
  },
}));

jest.mock('src/store/hooks', () => ({
  useAppSelector: jest.fn().mockReturnValue({
    syncStatus: 'idle',
    uploadingAssetIds: [],
    sessionUploadedAssets: 0,
  }),
}));

const mockMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>;
const mockPhotosLocalDB = photosLocalDB as jest.Mocked<typeof photosLocalDB>;

const makeAsset = (id: string): MediaLibrary.Asset =>
  ({ id, uri: `file://${id}.jpg`, creationTime: 1000, mediaType: 'photo' }) as never;

const makePage = (
  assets: MediaLibrary.Asset[],
  hasNextPage = false,
  endCursor = 'cursor-1',
): MediaLibrary.PagedInfo<MediaLibrary.Asset> => ({ assets, hasNextPage, endCursor, totalCount: assets.length });

beforeEach(() => {
  jest.clearAllMocks();
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

  test('when the first page loads, then loading is set to false', async () => {
    mockMediaLibrary.getAssetsAsync.mockResolvedValueOnce(makePage([]));

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

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

  test('when the app returns to the foreground, then assets reload from the start', async () => {
    const firstLoad = [makeAsset('a1')];
    const reloadAssets = [makeAsset('a2'), makeAsset('a3')];
    mockMediaLibrary.getAssetsAsync
      .mockResolvedValueOnce(makePage(firstLoad))
      .mockResolvedValueOnce(makePage(reloadAssets));

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

    expect(result.current.assets).toEqual(reloadAssets);
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

  test('when sync status changes and there are assets loaded, then synced ids refresh from the database', async () => {
    mockMediaLibrary.getAssetsAsync.mockResolvedValueOnce(makePage([makeAsset('a1')]));
    mockPhotosLocalDB.getSyncedEntries.mockResolvedValue(new Map([['a1', { modificationTime: null }]]));

    const { result } = renderHook(() => useLocalAssets());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockPhotosLocalDB.getSyncedEntries).toHaveBeenCalledWith(['a1']);
    expect(result.current.syncedIds.has('a1')).toBe(true);
  });
});
