import { renderHook, waitFor } from '@testing-library/react-native';
import { photosLocalDB } from '../../../services/photos/database/photosLocalDB';
import { photoMediaLibraryService } from '../../../services/photos/PhotoMediaLibraryService';
import { TimelinePhotoItem } from '../../PhotosScreen/types';
import { useItemTimestamp } from './useItemTimestamp';

jest.mock('../../../services/photos/database/photosLocalDB', () => ({
  photosLocalDB: {
    getCloudAssetById: jest.fn(),
    getStatus: jest.fn(),
  },
}));

jest.mock('../../../services/photos/PhotoMediaLibraryService', () => ({
  photoMediaLibraryService: {
    getAssetInfo: jest.fn(),
  },
}));

const mockGetCloudAssetById = photosLocalDB.getCloudAssetById as jest.Mock;
const mockGetStatus = photosLocalDB.getStatus as jest.Mock;
const mockGetAssetInfo = photoMediaLibraryService.getAssetInfo as jest.Mock;

const makeLocalItem = (overrides?: Partial<TimelinePhotoItem>): TimelinePhotoItem =>
  ({
    type: 'local',
    id: 'local-1',
    uri: 'file:///photo.jpg',
    createdAt: 1_700_000_000_000,
    backupState: 'not-backed',
    mediaType: 'photo',
    ...overrides,
  }) as TimelinePhotoItem;

const makeCloudItem = (overrides?: object): TimelinePhotoItem =>
  ({
    type: 'cloud-only',
    id: 'cloud-1',
    createdAt: 1_700_000_000_000,
    fileName: 'photo.jpg',
    thumbnailPath: null,
    mediaType: 'photo',
    ...overrides,
  }) as TimelinePhotoItem;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCloudAssetById.mockResolvedValue(null);
  mockGetStatus.mockResolvedValue(null);
  mockGetAssetInfo.mockResolvedValue({
    creationTime: 1_700_000_000_000,
    modificationTime: 0,
    filename: 'photo.jpg',
    width: 0,
    height: 0,
  });
});

describe('useItemTimestamp', () => {
  test('when item is undefined, then timestamp is undefined', () => {
    const { result } = renderHook(() => useItemTimestamp(undefined));
    expect(result.current).toBeUndefined();
  });

  test('when item is cloud-only with cached creation time, then it returns the cached api time', async () => {
    const REAL_TIME = 1_700_123_456_000;
    mockGetCloudAssetById.mockResolvedValue({ creationTimeApi: REAL_TIME });

    const { result } = renderHook(() => useItemTimestamp(makeCloudItem()));

    await waitFor(() => expect(result.current).toBe(REAL_TIME));
    expect(mockGetAssetInfo).not.toHaveBeenCalled();
  });

  test('when item is cloud-only without cached creation time, then it falls back to createdAt', async () => {
    mockGetCloudAssetById.mockResolvedValue({ creationTimeApi: null });
    const item = makeCloudItem({ createdAt: 1_700_000_000_000 });

    const { result } = renderHook(() => useItemTimestamp(item));

    await waitFor(() => expect(mockGetCloudAssetById).toHaveBeenCalledWith('cloud-1'));
    expect(result.current).toBe(1_700_000_000_000);
  });

  test('when item is local with cached creation time, then it returns cached value without calling MediaLibrary', async () => {
    const CACHED_TIME = 1_700_555_555_000;
    mockGetStatus.mockResolvedValue({ creationTime: CACHED_TIME });

    const { result } = renderHook(() => useItemTimestamp(makeLocalItem()));

    await waitFor(() => expect(result.current).toBe(CACHED_TIME));
    expect(mockGetAssetInfo).not.toHaveBeenCalled();
  });

  test('when item is local without cached creation time, then it calls MediaLibrary and returns creationTime', async () => {
    const ML_TIME = 1_700_777_777_000;
    mockGetStatus.mockResolvedValue(null);
    mockGetAssetInfo.mockResolvedValue({
      creationTime: ML_TIME,
      modificationTime: 0,
      filename: 'photo.jpg',
      width: 0,
      height: 0,
    });

    const { result } = renderHook(() => useItemTimestamp(makeLocalItem()));

    await waitFor(() => expect(result.current).toBe(ML_TIME));
  });

  test('when MediaLibrary call fails, then it keeps the initial seed without crashing', async () => {
    mockGetStatus.mockResolvedValue(null);
    mockGetAssetInfo.mockRejectedValue(new Error('permission denied'));
    const item = makeLocalItem({ createdAt: 1_700_000_000_000 });

    const { result } = renderHook(() => useItemTimestamp(item));

    await waitFor(() => expect(mockGetAssetInfo).toHaveBeenCalled());
    expect(result.current).toBe(1_700_000_000_000);
  });
});
