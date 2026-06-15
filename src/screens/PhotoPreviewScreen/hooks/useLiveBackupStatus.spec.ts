import { renderHook } from '@testing-library/react-native';
import { useAppSelector } from 'src/store/hooks';
import { CloudPhotoItem, PhotoItem } from '../../PhotosScreen/types';
import { useLiveBackupStatus } from './useLiveBackupStatus';

jest.mock('src/store/hooks', () => ({
  useAppSelector: jest.fn(),
}));

const mockUseAppSelector = useAppSelector as jest.Mock;

const photosState = {
  uploadingAssetIds: [] as string[],
  uploadProgressById: {} as Record<string, number>,
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
  photosState.sessionCompletedAssetIds = [];
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
});
