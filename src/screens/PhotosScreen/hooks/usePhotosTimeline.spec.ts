import { renderHook } from '@testing-library/react-native';
import { useAppSelector } from 'src/store/hooks';
import { CloudPhotoItem } from '../types';
import { useCloudAssets } from './useCloudAssets';
import { useLocalAssets } from './useLocalAssets';
import { usePhotosTimeline } from './usePhotosTimeline';

jest.mock('./useLocalAssets', () => ({
  useLocalAssets: jest.fn(),
}));

jest.mock('./useCloudAssets', () => ({
  useCloudAssets: jest.fn(),
}));

jest.mock('src/store/hooks', () => ({
  useAppSelector: jest.fn(),
}));

const mockUseLocalAssets = useLocalAssets as jest.Mock;
const mockUseCloudAssets = useCloudAssets as jest.Mock;
const mockUseAppSelector = useAppSelector as jest.Mock;

const photosState = {
  deviceId: 'current-device',
  syncStatus: 'idle',
  sessionTotalAssets: 0,
  sessionUploadedAssets: 0,
  isFetchingCloudHistory: false,
  isPaused: false,
  pendingBackupAssets: 0,
  disabledReason: null,
  assetUploadErroredCount: 0,
};

// Only the fields read by assetToPhotoItem/groupAssetsByDate are needed here.
const localAsset = {
  id: 'local-1',
  uri: 'file://local-1.jpg',
  creationTime: 1_000_000,
  mediaType: 'photo',
  duration: 0,
} as never;

const cloudItem: CloudPhotoItem = {
  id: 'cloud-1',
  type: 'cloud-only',
  mediaType: 'photo',
  thumbnailPath: null,
  thumbnailBucketId: null,
  thumbnailBucketFile: null,
  thumbnailType: null,
  deviceId: 'other-device',
  createdAt: 1_000_000,
  fileName: 'cloud-1.jpg',
  isLivePhoto: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAppSelector.mockImplementation((selector: (s: { photos: typeof photosState }) => unknown) =>
    selector({ photos: photosState }),
  );
  mockUseLocalAssets.mockReturnValue({
    assets: [localAsset],
    isLoading: false,
    hasLoadedLocalAssetsOnce: true,
    syncedIds: new Set(),
    uploadingIdSet: new Set(),
    burstRepresentativeIdSet: new Set(),
    incompleteUploadBurstIdSet: new Set(),
    localDeletionDetectedCount: 0,
    loadNextPage: jest.fn(),
    reload: jest.fn(),
  });
  mockUseCloudAssets.mockReturnValue({
    cloudItems: [cloudItem],
    reloadCloud: jest.fn(),
  });
});

describe('usePhotosTimeline', () => {
  test('when the filter is "All devices", then both local and cloud items are shown', () => {
    const { result } = renderHook(() => usePhotosTimeline(null));

    const allIds = result.current.timelineDateGroups.flatMap((entry) => entry.group.photos.map((photo) => photo.id));
    expect(allIds).toEqual(expect.arrayContaining(['local-1', 'cloud-1']));
  });

  test('when the filter matches the current device, then both local and cloud items are shown', () => {
    const { result } = renderHook(() => usePhotosTimeline('current-device'));

    const allIds = result.current.timelineDateGroups.flatMap((entry) => entry.group.photos.map((photo) => photo.id));
    expect(allIds).toEqual(expect.arrayContaining(['local-1', 'cloud-1']));
  });

  test('when the filter is a different device, then local items are hidden and only that device cloud items show', () => {
    const { result } = renderHook(() => usePhotosTimeline('other-device'));

    const allIds = result.current.timelineDateGroups.flatMap((entry) => entry.group.photos.map((photo) => photo.id));
    expect(allIds).toEqual(['cloud-1']);
    expect(allIds).not.toContain('local-1');
  });

  test('when local assets have not finished their first load yet, then cloud items are withheld to avoid a reorder-after-mount scroll jump', () => {
    mockUseLocalAssets.mockReturnValue({
      assets: [],
      isLoading: true,
      hasLoadedLocalAssetsOnce: false,
      syncedIds: new Set(),
      uploadingIdSet: new Set(),
      burstRepresentativeIdSet: new Set(),
      incompleteUploadBurstIdSet: new Set(),
      localDeletionDetectedCount: 0,
      loadNextPage: jest.fn(),
      reload: jest.fn(),
    });

    const { result } = renderHook(() => usePhotosTimeline(null));

    expect(result.current.timelineDateGroups).toEqual([]);
  });

  test('when local assets have not finished loading but the filter targets another device, then that device cloud items still show', () => {
    mockUseLocalAssets.mockReturnValue({
      assets: [],
      isLoading: true,
      hasLoadedLocalAssetsOnce: false,
      syncedIds: new Set(),
      uploadingIdSet: new Set(),
      burstRepresentativeIdSet: new Set(),
      incompleteUploadBurstIdSet: new Set(),
      localDeletionDetectedCount: 0,
      loadNextPage: jest.fn(),
      reload: jest.fn(),
    });

    const { result } = renderHook(() => usePhotosTimeline('other-device'));

    const allIds = result.current.timelineDateGroups.flatMap((entry) => entry.group.photos.map((photo) => photo.id));
    expect(allIds).toEqual(['cloud-1']);
  });
});
