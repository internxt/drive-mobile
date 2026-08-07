import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { CloudPhotoItem, PhotoItem } from 'src/screens/PhotosScreen/types';
import fileSystemService from 'src/services/FileSystemService';
import { PhotoThumbnailBackfillService } from './PhotoThumbnailBackfillService';
import { uploadThumbnailForAsset } from './PhotoUploadService';
import { photosLocalDB } from './database/photosLocalDB';

jest.mock('./database/photosLocalDB', () => ({
  photosLocalDB: { getCloudAssetById: jest.fn(), setCloudThumbnailRefs: jest.fn() },
}));

jest.mock('./PhotoUploadService', () => ({
  uploadThumbnailForAsset: jest.fn(),
}));

jest.mock('src/lib/network', () => ({
  getEnvironmentConfigFromUser: jest.fn().mockReturnValue({
    bridgeUser: 'user',
    bridgePass: 'user-id',
    encryptionKey: 'mnemonic',
    bucketId: 'drive-bucket',
  }),
}));

jest.mock('src/services/FileSystemService', () => ({
  __esModule: true,
  default: {
    getCacheDir: jest.fn(() => '/cache'),
    ensureDir: jest.fn(),
    moveFile: jest.fn(),
    pathToUri: jest.fn((p: string) => `file://${p}`),
  },
}));

jest.mock('@internxt-mobile/services/AsyncStorageService', () => ({
  __esModule: true,
  default: { getUser: jest.fn() },
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockGetCloudAssetById = photosLocalDB.getCloudAssetById as jest.Mock;
const mockSetCloudThumbnailRefs = photosLocalDB.setCloudThumbnailRefs as jest.Mock;
const mockUploadThumbnailForAsset = uploadThumbnailForAsset as jest.Mock;
const mockGetUser = asyncStorageService.getUser as jest.Mock;
const mockMoveFile = fileSystemService.moveFile as jest.Mock;

const makeCloudItem = (overrides: Partial<CloudPhotoItem> = {}): CloudPhotoItem => ({
  id: 'cloud-uuid-1',
  type: 'cloud-only',
  mediaType: 'photo',
  fileName: 'IMG_5068.DNG',
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

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCloudAssetById.mockResolvedValue({ bucket: 'photos-bucket' });
  mockGetUser.mockResolvedValue({
    bridgeUser: 'user',
    userId: 'user-id',
    mnemonic: 'mnemonic',
    bucket: 'drive-bucket',
  });
  mockUploadThumbnailForAsset.mockResolvedValue({
    bucketId: 'photos-bucket',
    bucketFile: 'thumb-file-id',
    type: 'JPEG',
    localPath: '/tmp/thumb.jpg',
  });
});

describe('backfillCloudThumbnail', () => {
  test('when the item already has a thumbnail, then nothing is uploaded', async () => {
    const item = makeCloudItem({ thumbnailBucketFile: 'existing-file-id' });

    const result = await PhotoThumbnailBackfillService.backfillCloudThumbnail({ item, localUri: '/cache/photo.dng' });

    expect(result).toBeNull();
    expect(mockUploadThumbnailForAsset).not.toHaveBeenCalled();
  });

  test('when the item is a local item, then nothing is uploaded', async () => {
    const item: PhotoItem = {
      id: 'local-1',
      type: 'local',
      mediaType: 'photo',
      createdAt: Date.now(),
      modificationTime: Date.now(),
      backupState: 'backed',
    };

    const result = await PhotoThumbnailBackfillService.backfillCloudThumbnail({ item, localUri: '/cache/photo.dng' });

    expect(result).toBeNull();
    expect(mockUploadThumbnailForAsset).not.toHaveBeenCalled();
  });

  test('when the file extension has no thumbnail generator, then nothing is uploaded', async () => {
    const item = makeCloudItem({ fileName: 'archive.zip' });

    const result = await PhotoThumbnailBackfillService.backfillCloudThumbnail({ item, localUri: '/cache/archive.zip' });

    expect(result).toBeNull();
    expect(mockUploadThumbnailForAsset).not.toHaveBeenCalled();
  });

  test('when the cloud asset has no bucket in the database, then nothing is uploaded', async () => {
    mockGetCloudAssetById.mockResolvedValue({ bucket: null });
    const item = makeCloudItem();

    const result = await PhotoThumbnailBackfillService.backfillCloudThumbnail({ item, localUri: '/cache/photo.dng' });

    expect(result).toBeNull();
    expect(mockUploadThumbnailForAsset).not.toHaveBeenCalled();
  });

  test('when the thumbnail is generated and uploaded, then it is moved to a stable cache path, persisted in the database, and the new refs are returned', async () => {
    const item = makeCloudItem();

    const result = await PhotoThumbnailBackfillService.backfillCloudThumbnail({
      item,
      localUri: 'file:///cache/photo_preview/cloud-uuid-1.dng',
    });

    expect(result).toEqual({
      thumbnailBucketId: 'photos-bucket',
      thumbnailBucketFile: 'thumb-file-id',
      thumbnailType: 'JPEG',
      thumbnailPath: 'file:///cache/photo_thumbnail_backfill/cloud-uuid-1.jpg',
    });
    expect(mockUploadThumbnailForAsset).toHaveBeenCalledWith(
      '/cache/photo_preview/cloud-uuid-1.dng',
      'DNG',
      'cloud-uuid-1',
      expect.objectContaining({ bucketId: 'photos-bucket' }),
      true,
    );
    expect(mockMoveFile).toHaveBeenCalledWith('/tmp/thumb.jpg', '/cache/photo_thumbnail_backfill/cloud-uuid-1.jpg');
    expect(mockSetCloudThumbnailRefs).toHaveBeenCalledWith('cloud-uuid-1', {
      bucketId: 'photos-bucket',
      bucketFile: 'thumb-file-id',
      type: 'JPEG',
      localPath: 'file:///cache/photo_thumbnail_backfill/cloud-uuid-1.jpg',
    });
  });

  test('when the upload fails, then nothing is persisted in the database', async () => {
    mockUploadThumbnailForAsset.mockResolvedValue(null);
    const item = makeCloudItem();

    const result = await PhotoThumbnailBackfillService.backfillCloudThumbnail({ item, localUri: '/cache/photo.dng' });

    expect(result).toBeNull();
    expect(mockSetCloudThumbnailRefs).not.toHaveBeenCalled();
  });

  test('when an unexpected error is thrown, then it does not propagate', async () => {
    mockGetUser.mockRejectedValue(new Error('storage unavailable'));
    const item = makeCloudItem();

    const result = await PhotoThumbnailBackfillService.backfillCloudThumbnail({ item, localUri: '/cache/photo.dng' });

    expect(result).toBeNull();
  });
});
