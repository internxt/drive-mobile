import { act, renderHook } from '@testing-library/react-native';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';
import { useCloudAssets } from './useCloudAssets';

jest.useFakeTimers();

jest.mock('src/services/photos/database/photosLocalDB', () => ({
  photosLocalDB: {
    init: jest.fn().mockResolvedValue(undefined),
    getAllCloudAssets: jest.fn(),
    getSyncedRemoteFileIds: jest.fn(),
  },
}));

jest.mock('src/store/hooks', () => ({
  useAppSelector: jest.fn(),
}));

const mockPhotosLocalDB = photosLocalDB as jest.Mocked<typeof photosLocalDB>;
const mockUseAppSelector = useAppSelector as jest.Mock;

const makeStoreState = (overrides: { lastSyncTimestamp?: number | null; cloudFetchRevision?: number } = {}) => ({
  lastSyncTimestamp: overrides.lastSyncTimestamp ?? null,
  cloudFetchRevision: overrides.cloudFetchRevision ?? 0,
});

const flushAsync = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  mockPhotosLocalDB.getAllCloudAssets.mockResolvedValue([]);
  mockPhotosLocalDB.getSyncedRemoteFileIds.mockResolvedValue(new Set());
  mockUseAppSelector.mockImplementation((selector: (s: { photos: ReturnType<typeof makeStoreState> }) => unknown) =>
    selector({ photos: makeStoreState() }),
  );
});

describe('useCloudAssets', () => {
  test('when the hook mounts, then cloud items are loaded from the database', async () => {
    mockPhotosLocalDB.getAllCloudAssets.mockResolvedValueOnce([
      {
        remoteFileId: 'r1',
        deviceId: 'device-1',
        createdAt: 1000,
        fileName: 'photo.jpg',
        fileSize: null,
        thumbnailPath: null,
        thumbnailBucketId: null,
        thumbnailBucketFile: null,
        thumbnailType: null,
        discoveredAt: 1000,
      },
    ]);

    const { result } = renderHook(() => useCloudAssets());

    // Flush the immediate lastSyncTimestamp effect only — do not run timers
    // so the debounce from cloudFetchRevision has not yet fired
    await act(flushAsync);

    expect(result.current.cloudItems).toHaveLength(1);
    expect(result.current.cloudItems[0].id).toBe('r1');
  });

  test('when cloud fetch revision increments, then cloud items reload from the database after debounce', async () => {
    mockPhotosLocalDB.getAllCloudAssets
      .mockResolvedValueOnce([]) // immediate mount effect
      .mockResolvedValueOnce([
        {
          remoteFileId: 'r2',
          deviceId: 'device-1',
          createdAt: 2000,
          fileName: 'photo2.jpg',
          fileSize: null,
          thumbnailPath: null,
          thumbnailBucketId: null,
          thumbnailBucketFile: null,
          thumbnailType: null,
          discoveredAt: 2000,
        },
      ]);

    const { result, rerender } = renderHook(() => useCloudAssets());

    await act(flushAsync);
    expect(result.current.cloudItems).toHaveLength(0);

    mockUseAppSelector.mockImplementation((selector: (s: { photos: ReturnType<typeof makeStoreState> }) => unknown) =>
      selector({ photos: makeStoreState({ cloudFetchRevision: 1 }) }),
    );

    await act(async () => {
      rerender({});
      // Advance past the 500ms debounce, then flush the async reload
      jest.runAllTimers();
      await flushAsync();
    });

    expect(result.current.cloudItems).toHaveLength(1);
    expect(result.current.cloudItems[0].id).toBe('r2');
  });

  test('when last sync timestamp updates, then cloud items reload from the database immediately', async () => {
    mockPhotosLocalDB.getAllCloudAssets
      .mockResolvedValueOnce([]) // mount
      .mockResolvedValueOnce([
        {
          remoteFileId: 'r3',
          deviceId: 'device-1',
          createdAt: 3000,
          fileName: 'photo3.jpg',
          fileSize: null,
          thumbnailPath: null,
          thumbnailBucketId: null,
          thumbnailBucketFile: null,
          thumbnailType: null,
          discoveredAt: 3000,
        },
      ]);

    const { result, rerender } = renderHook(() => useCloudAssets());

    await act(flushAsync);
    expect(result.current.cloudItems).toHaveLength(0);

    mockUseAppSelector.mockImplementation((selector: (s: { photos: ReturnType<typeof makeStoreState> }) => unknown) =>
      selector({ photos: makeStoreState({ lastSyncTimestamp: Date.now() }) }),
    );

    // lastSyncTimestamp effect is immediate — no timer needed
    await act(async () => {
      rerender({});
      await flushAsync();
    });

    expect(result.current.cloudItems).toHaveLength(1);
    expect(result.current.cloudItems[0].id).toBe('r3');
  });

  test('when synced remote ids overlap with cloud assets, then duplicates are excluded', async () => {
    mockPhotosLocalDB.getAllCloudAssets.mockResolvedValueOnce([
      {
        remoteFileId: 'r1',
        deviceId: 'device-1',
        createdAt: 1000,
        fileName: 'photo.jpg',
        fileSize: null,
        thumbnailPath: null,
        thumbnailBucketId: null,
        thumbnailBucketFile: null,
        thumbnailType: null,
        discoveredAt: 1000,
      },
      {
        remoteFileId: 'r2',
        deviceId: 'device-1',
        createdAt: 2000,
        fileName: 'photo2.jpg',
        fileSize: null,
        thumbnailPath: null,
        thumbnailBucketId: null,
        thumbnailBucketFile: null,
        thumbnailType: null,
        discoveredAt: 2000,
      },
    ]);
    mockPhotosLocalDB.getSyncedRemoteFileIds.mockResolvedValueOnce(new Set(['r1']));

    const { result } = renderHook(() => useCloudAssets());

    await act(flushAsync);

    expect(result.current.cloudItems).toHaveLength(1);
    expect(result.current.cloudItems[0].id).toBe('r2');
  });
});
