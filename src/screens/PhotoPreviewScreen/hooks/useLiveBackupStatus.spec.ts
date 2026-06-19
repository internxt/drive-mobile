import { renderHook, waitFor } from '@testing-library/react-native';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';
import { CloudPhotoItem, PhotoItem } from '../../PhotosScreen/types';
import { useLiveBackupStatus } from './useLiveBackupStatus';

jest.mock('src/store/hooks', () => ({
  useAppSelector: jest.fn(),
}));

jest.mock('src/services/photos/database/photosLocalDB', () => ({
  photosLocalDB: {
    getStatus: jest.fn().mockResolvedValue(null),
  },
}));

const mockUseAppSelector = useAppSelector as jest.Mock;
const mockGetStatus = photosLocalDB.getStatus as jest.Mock;

const photosState = {
  uploadingAssetIds: [] as string[],
  uploadProgressById: {} as Record<string, number>,
  burstUploadProgressById: {} as Record<string, { uploaded: number; total: number }>,
  sessionCompletedAssetIds: [] as string[],
};

const makeLocalItem = (id: string, backupState: PhotoItem['backupState']): PhotoItem => ({
  id,
  type: 'local',
  createdAt: 1000,
  backupState,
  mediaType: 'photo',
});

const makeCloudItem = (id: string): CloudPhotoItem => ({
  id,
  type: 'cloud-only',
  mediaType: 'photo',
  thumbnailPath: null,
  thumbnailBucketId: null,
  thumbnailBucketFile: null,
  thumbnailType: null,
  deviceId: 'device-1',
  createdAt: 1000,
  fileName: 'photo.jpg',
});

beforeEach(() => {
  jest.clearAllMocks();
  photosState.uploadingAssetIds = [];
  photosState.uploadProgressById = {};
  photosState.burstUploadProgressById = {};
  photosState.sessionCompletedAssetIds = [];
  mockGetStatus.mockResolvedValue(null);
  mockUseAppSelector.mockImplementation((selector: (state: { photos: typeof photosState }) => unknown) =>
    selector({ photos: photosState }),
  );
});

describe('useLiveBackupStatus', () => {
  test('when the asset is in the upload queue, then uploading is reported with its progress', () => {
    photosState.uploadingAssetIds = ['a1'];
    photosState.uploadProgressById = { a1: 0.42 };

    const { result } = renderHook(() => useLiveBackupStatus(makeLocalItem('a1', 'not-backed')));

    expect(result.current.isUploading).toBe(true);
    expect(result.current.isWaitingToUpload).toBe(false);
    expect(result.current.progress).toBe(0.42);
  });

  test('when the asset has never been queued and is not backed, then it is reported as waiting to upload', () => {
    const { result } = renderHook(() => useLiveBackupStatus(makeLocalItem('a1', 'not-backed')));

    expect(result.current.isWaitingToUpload).toBe(true);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  test('when the asset leaves the queue after being marked as completed, then it is neither waiting nor uploading', () => {
    photosState.uploadingAssetIds = ['a1'];
    photosState.uploadProgressById = { a1: 0.9 };
    const item = makeLocalItem('a1', 'not-backed');

    const { result, rerender } = renderHook(({ current }) => useLiveBackupStatus(current), {
      initialProps: { current: item },
    });
    expect(result.current.isUploading).toBe(true);

    photosState.uploadingAssetIds = [];
    photosState.uploadProgressById = {};
    photosState.sessionCompletedAssetIds = ['a1'];
    rerender({ current: item });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.isWaitingToUpload).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  test('when the asset leaves the queue due to a failed upload, then it is still shown as waiting to upload', () => {
    photosState.uploadingAssetIds = ['a1'];
    photosState.uploadProgressById = { a1: 0.5 };
    const item = makeLocalItem('a1', 'not-backed');

    const { result, rerender } = renderHook(({ current }) => useLiveBackupStatus(current), {
      initialProps: { current: item },
    });
    expect(result.current.isUploading).toBe(true);

    // asset removed from queue after failure — not added to sessionCompletedAssetIds
    photosState.uploadingAssetIds = [];
    photosState.uploadProgressById = {};
    rerender({ current: item });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.isWaitingToUpload).toBe(true);
    expect(result.current.progress).toBe(0);
  });

  test('when the snapshot says uploading but the queue no longer contains the asset, then it is shown as backed', () => {
    const { result } = renderHook(() => useLiveBackupStatus(makeLocalItem('a1', 'uploading')));

    expect(result.current.isUploading).toBe(false);
    expect(result.current.isWaitingToUpload).toBe(false);
  });

  test('when the photo only exists in the cloud, then no upload status is reported', () => {
    photosState.uploadingAssetIds = ['c1'];
    photosState.uploadProgressById = { c1: 0.5 };

    const { result } = renderHook(() => useLiveBackupStatus(makeCloudItem('c1')));

    expect(result.current.isUploading).toBe(false);
    expect(result.current.isWaitingToUpload).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  test('when there is no item, then no upload status is reported', () => {
    const { result } = renderHook(() => useLiveBackupStatus(undefined));

    expect(result.current.isUploading).toBe(false);
    expect(result.current.isWaitingToUpload).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  test('when a burst is uploading, then live member progress is reported', () => {
    photosState.uploadingAssetIds = ['b1'];
    photosState.uploadProgressById = { b1: 0.6 };
    photosState.burstUploadProgressById = { b1: { uploaded: 3, total: 5 } };

    const item: PhotoItem = { id: 'b1', type: 'local', createdAt: 1000, backupState: 'not-backed', mediaType: 'photo', isBurst: true };
    const { result } = renderHook(() => useLiveBackupStatus(item));

    expect(result.current.isBurst).toBe(true);
    expect(result.current.isUploading).toBe(true);
    expect(result.current.burstLiveProgress).toEqual({ uploaded: 3, total: 5 });
    expect(result.current.burstTotal).toBe(5);
  });

  test('when a burst is backed, then the member count from the database is reported as total', async () => {
    mockGetStatus.mockResolvedValue({ burstMemberCount: 4 });

    const item: PhotoItem = { id: 'b2', type: 'local', createdAt: 1000, backupState: 'backed', mediaType: 'photo', isBurst: true };
    const { result } = renderHook(() => useLiveBackupStatus(item));

    await waitFor(() => expect(result.current.burstTotal).toBe(5)); // 4 members + 1 representative

    expect(result.current.isBurst).toBe(true);
    expect(result.current.burstLiveProgress).toBeNull();
  });

  test('when the item is not a burst, then no burst info is reported', () => {
    const { result } = renderHook(() => useLiveBackupStatus(makeLocalItem('a1', 'backed')));

    expect(result.current.isBurst).toBe(false);
    expect(result.current.burstLiveProgress).toBeNull();
    expect(result.current.burstTotal).toBeNull();
  });
});
