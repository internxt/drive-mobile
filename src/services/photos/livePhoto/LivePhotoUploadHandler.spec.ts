import { AbortError } from 'src/network/errors';
import { HTTP_QUOTA_EXCEEDED } from 'src/services/common/httpStatusCodes';
import fileSystemService from 'src/services/FileSystemService';
import { IncompleteLivePhoto, photosLocalDB } from '../database/photosLocalDB';
import { exportLivePhotoComponents } from '../LivePhotoNativeModule';
import { PhotoAssetScanner } from '../PhotoAssetScanner';
import { retryIncompleteLivePhotos } from './LivePhotoUploadHandler';

jest.mock('../PhotoAssetScanner', () => ({
  PhotoAssetScanner: { getAssetsByIds: jest.fn() },
}));

jest.mock('../LivePhotoNativeModule', () => ({
  exportLivePhotoComponents: jest.fn(),
}));

jest.mock('src/services/FileSystemService', () => ({
  __esModule: true,
  default: {
    unlinkIfExists: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('src/services/photos/database/photosLocalDB', () => ({
  photosLocalDB: {
    markPairedVideoSynced: jest.fn().mockResolvedValue(undefined),
    addPairedVideoAttempt: jest.fn().mockResolvedValue(undefined),
    stopPairedVideoRetries: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('src/services/AsyncStorageService', () => ({
  __esModule: true,
  default: {
    getUser: jest.fn().mockResolvedValue({ userId: 'user-1' }),
  },
}));

jest.mock('src/services/photos/PhotoBackupFolders', () => ({
  photoBackupFolders: {
    getOrCreateFolderForDate: jest.fn().mockResolvedValue('folder-uuid'),
  },
}));

jest.mock('src/lib/network', () => ({
  getEnvironmentConfigFromUser: jest.fn().mockReturnValue({
    encryptionKey: 'enc-key',
    bridgeUser: 'bridge-user',
    bridgePass: 'bridge-pass',
  }),
}));

const mockPhotosLocalDB = photosLocalDB as jest.Mocked<typeof photosLocalDB>;
const mockExportLivePhotoComponents = exportLivePhotoComponents as jest.MockedFunction<
  typeof exportLivePhotoComponents
>;
const mockUnlinkIfExists = fileSystemService.unlinkIfExists as jest.Mock;
const mockGetAssetsByIds = PhotoAssetScanner.getAssetsByIds as jest.Mock;

const PHOTO_CREATION_TIME = Date.UTC(2026, 0, 1);
const PHOTO_MODIFICATION_TIME = Date.UTC(2026, 0, 2);

const makeIncompleteLivePhoto = (overrides: Partial<IncompleteLivePhoto> = {}): IncompleteLivePhoto => ({
  assetId: 'asset-1',
  pairedVideoRemoteFileId: null,
  fileName: 'IMG_0001.HEIC',
  creationTime: PHOTO_CREATION_TIME,
  modificationTime: PHOTO_MODIFICATION_TIME,
  ...overrides,
});

const makeNativeError = (code: string) => Object.assign(new Error(`native ${code}`), { code });

const isQuotaExceededError = (error: Error) => (error as { status?: number }).status === HTTP_QUOTA_EXCEEDED;

describe('retrying the video of Live Photos whose video is missing or outdated in Drive', () => {
  const uploadPairedVideo = jest.fn();
  const onPairedVideoUploaded = jest.fn();
  let livePhotosToRetry: IncompleteLivePhoto[] = [];

  const runRetry = (signal?: AbortSignal) =>
    retryIncompleteLivePhotos({
      incompleteLivePhotos: livePhotosToRetry,
      deviceId: 'device-1',
      photosBucket: 'bucket-1',
      signal,
      uploadPairedVideo,
      isQuotaExceededError,
      onPairedVideoUploaded,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    livePhotosToRetry = [];
    mockExportLivePhotoComponents.mockResolvedValue({
      photo: { uri: 'file:///tmp/photo.heic', size: 1, fileName: 'FullSizeRender.heic' },
      video: { uri: 'file:///tmp/video.mov', size: 1, fileName: 'FullSizeRender.mov' },
    });
    mockGetAssetsByIds.mockResolvedValue([]);
    uploadPairedVideo.mockResolvedValue('video-uuid');
    onPairedVideoUploaded.mockResolvedValue(undefined);
  });

  test('when no Live Photo is waiting for its video, then nothing is exported or uploaded', async () => {
    const result = await runRetry();

    expect(mockExportLivePhotoComponents).not.toHaveBeenCalled();
    expect(result).toEqual({ completedCount: 0, isQuotaExceeded: false });
  });

  test('when a backed-up Live Photo has no video in Drive, then only its video is uploaded, named and dated after the photo, and linked to it', async () => {
    livePhotosToRetry = [makeIncompleteLivePhoto()];

    const result = await runRetry();

    expect(uploadPairedVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        videoLocalPath: '/tmp/video.mov',
        videoFileName: 'FullSizeRender.mov',
        photoPlainName: 'IMG_0001',
        existingPairedVideoRemoteFileId: undefined,
        folderUuid: 'folder-uuid',
        creationIso: '2026-01-01T00:00:00.000Z',
        modificationIso: '2026-01-02T00:00:00.000Z',
      }),
    );
    expect(mockPhotosLocalDB.markPairedVideoSynced).toHaveBeenCalledWith('asset-1', 'video-uuid');
    expect(result).toEqual({ completedCount: 1, isQuotaExceeded: false });
  });

  test('when a backed-up Live Photo still has the video from before an edit, then that video is the one that gets the new content', async () => {
    livePhotosToRetry = [makeIncompleteLivePhoto({ pairedVideoRemoteFileId: 'old-video-uuid' })];

    await runRetry();

    expect(uploadPairedVideo).toHaveBeenCalledWith(
      expect.objectContaining({ existingPairedVideoRemoteFileId: 'old-video-uuid' }),
    );
  });

  test('when a video replaces an older one, then the caller is told the date of the photo and the older video so it can refresh what it shows', async () => {
    livePhotosToRetry = [makeIncompleteLivePhoto({ pairedVideoRemoteFileId: 'old-video-uuid' })];
    uploadPairedVideo.mockResolvedValueOnce('new-video-uuid');

    await runRetry();

    expect(onPairedVideoUploaded).toHaveBeenCalledWith({
      creationTime: PHOTO_CREATION_TIME,
      previousPairedVideoUuid: 'old-video-uuid',
    });
  });

  test('when a Live Photo backed up by hand has no name or dates saved, then they are taken from the photo on the device', async () => {
    livePhotosToRetry = [makeIncompleteLivePhoto({ fileName: null, creationTime: null, modificationTime: null })];
    mockGetAssetsByIds.mockResolvedValueOnce([
      {
        id: 'asset-1',
        filename: 'IMG_0002.HEIC',
        creationTime: PHOTO_CREATION_TIME,
        modificationTime: PHOTO_MODIFICATION_TIME,
      },
    ]);

    await runRetry();

    expect(mockGetAssetsByIds).toHaveBeenCalledWith(['asset-1']);
    expect(uploadPairedVideo).toHaveBeenCalledWith(
      expect.objectContaining({ photoPlainName: 'IMG_0002', creationIso: '2026-01-01T00:00:00.000Z' }),
    );
  });

  test('when every Live Photo has its name and dates saved, then the photo library is not searched', async () => {
    livePhotosToRetry = [makeIncompleteLivePhoto()];

    await runRetry();

    expect(mockGetAssetsByIds).not.toHaveBeenCalled();
  });

  test('when a Live Photo without its name saved is no longer on the device, then it is not exported and not retried again', async () => {
    livePhotosToRetry = [makeIncompleteLivePhoto({ fileName: null })];

    await runRetry();

    expect(mockExportLivePhotoComponents).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.stopPairedVideoRetries).toHaveBeenCalledWith('asset-1');
  });

  test('when a retry ends, then the exported photo and video files are deleted', async () => {
    livePhotosToRetry = [makeIncompleteLivePhoto()];
    uploadPairedVideo.mockRejectedValueOnce(new Error('network down'));

    await runRetry();

    expect(mockUnlinkIfExists).toHaveBeenCalledWith('/tmp/photo.heic');
    expect(mockUnlinkIfExists).toHaveBeenCalledWith('/tmp/video.mov');
  });

  test('when the video upload fails for a temporary reason, then one attempt is counted and the next Live Photo is still retried', async () => {
    livePhotosToRetry = [
      makeIncompleteLivePhoto({ assetId: 'asset-1' }),
      makeIncompleteLivePhoto({ assetId: 'asset-2' }),
    ];
    uploadPairedVideo.mockRejectedValueOnce(new Error('network down'));

    const result = await runRetry();

    expect(mockPhotosLocalDB.addPairedVideoAttempt).toHaveBeenCalledWith('asset-1');
    expect(mockPhotosLocalDB.markPairedVideoSynced).toHaveBeenCalledWith('asset-2', 'video-uuid');
    expect(result.completedCount).toBe(1);
  });

  test('when exporting the video fails for a temporary reason, then one attempt is counted', async () => {
    livePhotosToRetry = [makeIncompleteLivePhoto()];
    mockExportLivePhotoComponents.mockRejectedValueOnce(makeNativeError('EXPORT_FAILED'));

    await runRetry();

    expect(mockPhotosLocalDB.addPairedVideoAttempt).toHaveBeenCalledWith('asset-1');
    expect(mockPhotosLocalDB.stopPairedVideoRetries).not.toHaveBeenCalled();
    expect(uploadPairedVideo).not.toHaveBeenCalled();
  });

  test.each(['NOT_FOUND', 'NOT_LIVE_PHOTO', 'NO_PHOTO_RESOURCE', 'NO_VIDEO_RESOURCE'])(
    'when the photo can never be exported, then it is not retried again',
    async (code) => {
      livePhotosToRetry = [makeIncompleteLivePhoto()];
      mockExportLivePhotoComponents.mockRejectedValueOnce(makeNativeError(code));

      await runRetry();

      expect(mockPhotosLocalDB.stopPairedVideoRetries).toHaveBeenCalledWith('asset-1');
      expect(mockPhotosLocalDB.addPairedVideoAttempt).not.toHaveBeenCalled();
    },
  );

  test('when the backup is paused during an upload, then the attempt is not counted and the remaining Live Photos are left for later', async () => {
    livePhotosToRetry = [
      makeIncompleteLivePhoto({ assetId: 'asset-1' }),
      makeIncompleteLivePhoto({ assetId: 'asset-2' }),
    ];
    uploadPairedVideo.mockRejectedValueOnce(new AbortError());

    const result = await runRetry();

    expect(mockPhotosLocalDB.addPairedVideoAttempt).not.toHaveBeenCalled();
    expect(uploadPairedVideo).toHaveBeenCalledTimes(1);
    expect(result.completedCount).toBe(0);
  });

  test('when the cycle is already cancelled, then no Live Photo is retried', async () => {
    livePhotosToRetry = [makeIncompleteLivePhoto()];
    const controller = new AbortController();
    controller.abort();

    await runRetry(controller.signal);

    expect(mockExportLivePhotoComponents).not.toHaveBeenCalled();
  });

  test('when the storage quota is exceeded, then the retry stops, the attempt is not counted and the caller is told', async () => {
    livePhotosToRetry = [
      makeIncompleteLivePhoto({ assetId: 'asset-1' }),
      makeIncompleteLivePhoto({ assetId: 'asset-2' }),
    ];
    uploadPairedVideo.mockRejectedValueOnce(Object.assign(new Error('quota'), { status: HTTP_QUOTA_EXCEEDED }));

    const result = await runRetry();

    expect(mockPhotosLocalDB.addPairedVideoAttempt).not.toHaveBeenCalled();
    expect(uploadPairedVideo).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ completedCount: 0, isQuotaExceeded: true });
  });

  test('when an upload fails after the cycle was cancelled, then the attempt is not counted and the retry stops', async () => {
    livePhotosToRetry = [
      makeIncompleteLivePhoto({ assetId: 'asset-1' }),
      makeIncompleteLivePhoto({ assetId: 'asset-2' }),
    ];
    const controller = new AbortController();
    uploadPairedVideo.mockImplementationOnce(async () => {
      controller.abort();
      throw new Error('socket closed');
    });

    await runRetry(controller.signal);

    expect(mockPhotosLocalDB.addPairedVideoAttempt).not.toHaveBeenCalled();
    expect(uploadPairedVideo).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['the backup is paused', () => new AbortError()],
    ['the storage quota is exceeded', () => Object.assign(new Error('quota'), { status: HTTP_QUOTA_EXCEEDED })],
  ])('when %s during an upload, then the exported photo and video files are still deleted', async (_, makeError) => {
    livePhotosToRetry = [makeIncompleteLivePhoto()];
    uploadPairedVideo.mockRejectedValueOnce(makeError());

    await runRetry();

    expect(mockUnlinkIfExists).toHaveBeenCalledWith('/tmp/photo.heic');
    expect(mockUnlinkIfExists).toHaveBeenCalledWith('/tmp/video.mov');
  });

  test('when the storage quota is exceeded after some videos were uploaded, then the caller is told how many were uploaded', async () => {
    livePhotosToRetry = [
      makeIncompleteLivePhoto({ assetId: 'asset-1' }),
      makeIncompleteLivePhoto({ assetId: 'asset-2' }),
    ];
    uploadPairedVideo
      .mockResolvedValueOnce('video-uuid')
      .mockRejectedValueOnce(Object.assign(new Error('quota'), { status: HTTP_QUOTA_EXCEEDED }));

    const result = await runRetry();

    expect(result).toEqual({ completedCount: 1, isQuotaExceeded: true });
  });

  test('when the cycle is cancelled after one video was uploaded, then the next Live Photo is not retried', async () => {
    livePhotosToRetry = [
      makeIncompleteLivePhoto({ assetId: 'asset-1' }),
      makeIncompleteLivePhoto({ assetId: 'asset-2' }),
    ];
    const controller = new AbortController();
    uploadPairedVideo.mockImplementationOnce(async () => {
      controller.abort();
      return 'video-uuid';
    });

    const result = await runRetry(controller.signal);

    expect(uploadPairedVideo).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ completedCount: 1, isQuotaExceeded: false });
  });
});
