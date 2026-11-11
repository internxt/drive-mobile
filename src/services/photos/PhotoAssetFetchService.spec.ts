import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import * as ExpoFileSystemLegacy from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { CloudPhotoItem, PhotoItem } from 'src/screens/PhotosScreen/types';
import fileSystemService from 'src/services/FileSystemService';
import storageService from '@internxt-mobile/services/StorageService';
import { PhotoAssetFetchService } from './PhotoAssetFetchService';
import { photoMediaLibraryService } from './PhotoMediaLibraryService';
import { photosLocalDB } from './database/photosLocalDB';

jest.mock('./PhotoMediaLibraryService', () => ({
  photoMediaLibraryService: { getAssetInfo: jest.fn() },
}));

jest.mock('./database/photosLocalDB', () => ({
  photosLocalDB: { getCloudAssetById: jest.fn(), upsertCloudAsset: jest.fn() },
}));

jest.mock('src/services/FileSystemService', () => ({
  __esModule: true,
  default: {
    getCacheDir: jest.fn(() => '/cache'),
    exists: jest.fn(),
    ensureDir: jest.fn(),
    pathToUri: jest.fn((p: string) => `file://${p}`),
    unlinkIfExists: jest.fn(),
    readDir: jest.fn(),
  },
}));

jest.mock('@internxt-mobile/services/StorageService', () => ({
  __esModule: true,
  default: { getFileMetadata: jest.fn() },
}));

jest.mock('@internxt-mobile/services/AsyncStorageService', () => ({
  __esModule: true,
  default: { getUser: jest.fn() },
}));

jest.mock('@internxt-mobile/services/drive/file', () => ({
  driveFileService: { downloadFile: jest.fn() },
}));

jest.mock('expo-file-system/legacy', () => ({
  copyAsync: jest.fn(),
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockGetAssetInfo = photoMediaLibraryService.getAssetInfo as jest.Mock;
const mockExists = fileSystemService.exists as jest.Mock;
const mockCopyAsync = ExpoFileSystemLegacy.copyAsync as jest.Mock;
const mockGetCloudAssetById = photosLocalDB.getCloudAssetById as jest.Mock;
const mockGetUser = asyncStorageService.getUser as jest.Mock;
const mockDownloadFile = driveFileService.downloadFile as jest.Mock;
const mockReadDir = fileSystemService.readDir as jest.Mock;
const mockGetFileMetadata = storageService.getFileMetadata as jest.Mock;
const mockUpsertCloudAsset = photosLocalDB.upsertCloudAsset as jest.Mock;

const makeLocalItem = (overrides: Partial<PhotoItem> = {}): PhotoItem => ({
  id: 'ABCD-1234/L0/001',
  type: 'local',
  uri: 'ph://ABCD-1234/L0/001',
  mediaType: 'photo',
  createdAt: Date.now(),
  modificationTime: Date.now(),
  backupState: 'backed',
  ...overrides,
});

const makeCloudItem = (overrides: Partial<CloudPhotoItem> = {}): CloudPhotoItem => ({
  id: 'cloud-uuid-1',
  type: 'cloud-only',
  mediaType: 'photo',
  fileName: 'photo.jpg',
  thumbnailPath: null,
  thumbnailBucketId: null,
  thumbnailBucketFile: null,
  thumbnailType: null,
  deviceId: 'device-1',
  folderDate: Date.now(),
  uploadedAt: Date.now(),
  isFavorite: false,
  ...overrides,
});

const makeSignal = () => new AbortController().signal;

beforeEach(() => {
  jest.clearAllMocks();
  mockExists.mockResolvedValue(false);
  mockCopyAsync.mockResolvedValue(undefined);
  mockGetAssetInfo.mockResolvedValue({ localUri: 'file:///cache/photo.jpg', filename: 'IMG_1234.JPG' });
  mockGetUser.mockResolvedValue({ bucket: 'bucket-id', mnemonic: 'mnemonic' });
  mockDownloadFile.mockResolvedValue(undefined);
});

describe('fetchUri — local item', () => {
  test('when getAssetInfo returns a localUri, then that URI is returned', async () => {
    mockGetAssetInfo.mockResolvedValue({ localUri: 'file:///dcim/photo.jpg', filename: 'photo.jpg' });

    const result = await PhotoAssetFetchService.fetchUri(makeLocalItem(), makeSignal());

    expect(result).toBe('file:///dcim/photo.jpg');
  });

  test('when getAssetInfo returns no localUri, then item.uri is returned as fallback', async () => {
    mockGetAssetInfo.mockResolvedValue({ localUri: undefined, filename: 'photo.jpg' });

    const result = await PhotoAssetFetchService.fetchUri(makeLocalItem({ uri: 'ph://ABCD-1234/L0/001' }), makeSignal());

    expect(result).toBe('ph://ABCD-1234/L0/001');
  });

  test('when getAssetInfo throws, then item.uri is returned as fallback', async () => {
    mockGetAssetInfo.mockRejectedValue(new Error('asset not found'));

    const result = await PhotoAssetFetchService.fetchUri(makeLocalItem({ uri: 'ph://ABCD-1234/L0/001' }), makeSignal());

    expect(result).toBe('ph://ABCD-1234/L0/001');
  });
});

describe('fetchUri — cloud item', () => {
  test('when asset is already cached, then downloadFile is not called and the cached URI is returned', async () => {
    mockExists.mockResolvedValue(true);
    (fileSystemService.pathToUri as jest.Mock).mockReturnValue('file:///cache/photo_preview/cloud-uuid-1.jpg');

    const result = await PhotoAssetFetchService.fetchUri(makeCloudItem(), makeSignal());

    expect(mockDownloadFile).not.toHaveBeenCalled();
    expect(result).toBe('file:///cache/photo_preview/cloud-uuid-1.jpg');
  });

  test('when asset is not cached and has no fileId in the database, then null is returned without downloading', async () => {
    mockGetCloudAssetById.mockResolvedValue(null);

    const result = await PhotoAssetFetchService.fetchUri(makeCloudItem(), makeSignal());

    expect(mockDownloadFile).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('when asset is not cached and has a fileId, then downloadFile is called with the asset bucket and the cache path is returned', async () => {
    mockGetCloudAssetById.mockResolvedValue({ fileId: 'file-id-123', fileSize: 500_000, bucket: 'photos-bucket' });
    mockGetUser.mockResolvedValue({ bucket: 'drive-root-bucket', mnemonic: 'mnemonic' });
    (fileSystemService.pathToUri as jest.Mock).mockReturnValue('file:///cache/photo_preview/cloud-uuid-1.jpg');

    const result = await PhotoAssetFetchService.fetchUri(makeCloudItem(), makeSignal());

    expect(mockDownloadFile).toHaveBeenCalledWith(
      expect.anything(),
      'photos-bucket',
      'file-id-123',
      expect.objectContaining({ downloadPath: '/cache/photo_preview/cloud-uuid-1.jpg' }),
      500_000,
    );
    expect(result).toBe('file:///cache/photo_preview/cloud-uuid-1.jpg');
  });

  test('when asset is not cached but has no bucket, then null is returned without downloading', async () => {
    mockGetCloudAssetById.mockResolvedValue({ fileId: 'file-id-123', fileSize: 500_000, bucket: null });

    const result = await PhotoAssetFetchService.fetchUri(makeCloudItem(), makeSignal());

    expect(mockDownloadFile).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});

describe('fetchPlaybackUri — iOS local video', () => {
  test('when a local video is requested on iOS, then ph:// is returned without calling getAssetInfo', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    const item = makeLocalItem({ mediaType: 'video', uri: 'ph://ABCD-1234/L0/001' });

    const result = await PhotoAssetFetchService.fetchPlaybackUri(item, makeSignal());

    expect(result).toBe('ph://ABCD-1234/L0/001');
    expect(mockGetAssetInfo).not.toHaveBeenCalled();
  });

  test('when a local video has no uri on iOS, then null is returned', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    const item = makeLocalItem({ mediaType: 'video', uri: undefined });

    const result = await PhotoAssetFetchService.fetchPlaybackUri(item, makeSignal());

    expect(result).toBeNull();
  });

  test('when a local photo is requested on iOS, then fetchUri is used and getAssetInfo is called', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    mockGetAssetInfo.mockResolvedValue({ localUri: 'file:///var/mobile/IMG_1234.JPG', filename: 'IMG_1234.JPG' });
    const item = makeLocalItem({ mediaType: 'photo' });

    const result = await PhotoAssetFetchService.fetchPlaybackUri(item, makeSignal());

    expect(result).toBe('file:///var/mobile/IMG_1234.JPG');
    expect(mockGetAssetInfo).toHaveBeenCalledTimes(1);
  });

  test('when a local video is requested on Android, then fetchUri is used and getAssetInfo is called', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
    mockGetAssetInfo.mockResolvedValue({ localUri: 'file:///sdcard/DCIM/video.mp4', filename: 'video.mp4' });
    const item = makeLocalItem({ mediaType: 'video', uri: 'content://media/video/123' });

    const result = await PhotoAssetFetchService.fetchPlaybackUri(item, makeSignal());

    expect(result).toBe('file:///sdcard/DCIM/video.mp4');
    expect(mockGetAssetInfo).toHaveBeenCalledTimes(1);
  });
});

describe('resolveExportUri', () => {
  test('when item is local and platform is iOS, then the asset is copied to sandbox and a cleanup is returned', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    mockGetAssetInfo.mockResolvedValue({ localUri: 'file:///dcim/photo.jpg', filename: 'IMG_1234.JPG' });

    const result = await PhotoAssetFetchService.resolveExportUri(makeLocalItem(), makeSignal());

    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: 'ph://ABCD-1234/L0/001',
      to: 'file:///cache/photo_share/ABCD-1234_L0_001.JPG',
    });
    expect(result?.uri).toBe('/cache/photo_share/ABCD-1234_L0_001.JPG');
    expect(result?.cleanup).toBeInstanceOf(Function);
  });

  test('when item is local and platform is Android, then fetchUri is used without sandbox copy', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
    mockGetAssetInfo.mockResolvedValue({ localUri: 'file:///sdcard/photo.jpg', filename: 'photo.jpg' });

    const result = await PhotoAssetFetchService.resolveExportUri(makeLocalItem(), makeSignal());

    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(result?.uri).toBe('file:///sdcard/photo.jpg');
    expect(result?.cleanup).toBeUndefined();
  });

  test('when item is cloud-only, then fetchUri is used regardless of platform', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    (photosLocalDB.getCloudAssetById as jest.Mock).mockResolvedValue(null);

    const result = await PhotoAssetFetchService.resolveExportUri(makeCloudItem(), makeSignal());

    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('when iOS sandbox copy cleanup is called, then unlinkIfExists is called on the sandbox path', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    (fileSystemService.unlinkIfExists as jest.Mock).mockResolvedValue(undefined);

    const result = await PhotoAssetFetchService.resolveExportUri(makeLocalItem(), makeSignal());
    result?.cleanup?.();

    expect(fileSystemService.unlinkIfExists).toHaveBeenCalledWith('/cache/photo_share/ABCD-1234_L0_001.JPG');
  });
});

describe('getting the video of a Live Photo that is only in the cloud', () => {
  const PREVIEW_DIR = '/cache/photo_preview/';
  const savedVideo = {
    remoteFileId: 'video-uuid',
    fileId: 'old-content',
    bucket: 'photos-bucket',
    fileSize: 100,
    extension: 'mov',
  };
  const livePhoto = makeCloudItem({ isLivePhoto: true, pairedVideoRemoteFileId: 'video-uuid' });
  const cachedCopy = (name: string) => ({ name, path: `${PREVIEW_DIR}${name}` });

  beforeEach(() => {
    mockExists.mockResolvedValue(true);
    mockGetCloudAssetById.mockImplementation(async (remoteFileId: string) =>
      remoteFileId === 'video-uuid' ? savedVideo : { fileId: 'photo-content', bucket: 'photos-bucket' },
    );
    mockReadDir.mockResolvedValue([]);
  });

  test('when the cached copy has the content Drive has now, then it is used without downloading', async () => {
    mockGetFileMetadata.mockResolvedValue({ fileId: 'old-content', bucket: 'photos-bucket', size: '100' });
    mockReadDir.mockResolvedValue([cachedCopy('video-uuid.old-content.mov')]);

    const result = await PhotoAssetFetchService.fetchLivePhotoComponents(livePhoto, makeSignal());

    expect(result?.videoPath).toBe(`${PREVIEW_DIR}video-uuid.old-content.mov`);
    expect(mockDownloadFile).not.toHaveBeenCalled();
  });

  test('when the video was replaced in Drive, then the old copies are deleted, the new content is downloaded and saved as the current one', async () => {
    mockGetFileMetadata.mockResolvedValue({ fileId: 'new-content', bucket: 'photos-bucket', size: '200' });
    mockReadDir.mockResolvedValue([cachedCopy('video-uuid.old-content.mov'), cachedCopy('video-uuid.MOV')]);

    const result = await PhotoAssetFetchService.fetchLivePhotoComponents(livePhoto, makeSignal());

    expect(fileSystemService.unlinkIfExists).toHaveBeenCalledWith(`${PREVIEW_DIR}video-uuid.old-content.mov`);
    expect(fileSystemService.unlinkIfExists).toHaveBeenCalledWith(`${PREVIEW_DIR}video-uuid.MOV`);
    expect(mockDownloadFile).toHaveBeenCalledWith(
      expect.anything(),
      'photos-bucket',
      'new-content',
      expect.objectContaining({ downloadPath: `${PREVIEW_DIR}video-uuid.new-content.mov` }),
      200,
    );
    expect(mockUpsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 'new-content', fileSize: 200 }),
    );
    expect(result?.videoPath).toBe(`${PREVIEW_DIR}video-uuid.new-content.mov`);
  });

  test('when Drive cannot be asked and a copy is cached, then that copy is used', async () => {
    mockGetFileMetadata.mockRejectedValue(new Error('Network Error'));
    mockReadDir.mockResolvedValue([cachedCopy('video-uuid.mov')]);

    const result = await PhotoAssetFetchService.fetchLivePhotoComponents(livePhoto, makeSignal());

    expect(result?.videoPath).toBe(`${PREVIEW_DIR}video-uuid.mov`);
    expect(mockDownloadFile).not.toHaveBeenCalled();
  });

  test('when the cached copies of a video are removed, then every copy of that video is deleted in either name format and no other file is touched', async () => {
    mockReadDir.mockResolvedValue([
      cachedCopy('video-uuid.mov'),
      cachedCopy('video-uuid.old-content.mov'),
      cachedCopy('other-video-uuid.mov'),
    ]);

    await PhotoAssetFetchService.evictCachedPairedVideo('video-uuid');

    expect(fileSystemService.unlinkIfExists).toHaveBeenCalledTimes(2);
    expect(fileSystemService.unlinkIfExists).toHaveBeenCalledWith(`${PREVIEW_DIR}video-uuid.mov`);
    expect(fileSystemService.unlinkIfExists).toHaveBeenCalledWith(`${PREVIEW_DIR}video-uuid.old-content.mov`);
  });

  test('when Drive cannot be asked and no copy is cached, then the saved content is downloaded', async () => {
    mockGetFileMetadata.mockRejectedValue(new Error('Network Error'));

    const result = await PhotoAssetFetchService.fetchLivePhotoComponents(livePhoto, makeSignal());

    expect(mockDownloadFile).toHaveBeenCalledWith(
      expect.anything(),
      'photos-bucket',
      'old-content',
      expect.objectContaining({ downloadPath: `${PREVIEW_DIR}video-uuid.old-content.mov` }),
      100,
    );
    expect(mockUpsertCloudAsset).not.toHaveBeenCalled();
    expect(result?.videoPath).toBe(`${PREVIEW_DIR}video-uuid.old-content.mov`);
  });
});
