import * as RNFS from '@dr.pogodin/react-native-fs';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import * as MediaLibrary from 'expo-media-library';
import { uploadFile } from 'src/network/upload';
import asyncStorageService from 'src/services/AsyncStorageService';
import { isThumbnailSupported } from 'src/services/common/media/thumbnail.constants';
import { generateThumbnail } from 'src/services/common/media/thumbnail.generation';
import { uploadService } from 'src/services/common/network/upload/upload.service';
import { PhotoUploadService } from './PhotoUploadService';
import { photoBackupFolders } from './PhotoBackupFolders';

jest.mock('expo-media-library', () => ({
  getAssetInfoAsync: jest.fn(),
  MediaType: { photo: 'photo', video: 'video', audio: 'audio', unknown: 'unknown' },
}));

jest.mock('@dr.pogodin/react-native-fs', () => ({
  stat: jest.fn(),
  unlink: jest.fn(),
  copyFile: jest.fn(),
  CachesDirectoryPath: '/cache',
}));

jest.mock('src/network/upload', () => ({
  uploadFile: jest.fn(),
}));

jest.mock('src/services/AsyncStorageService', () => ({
  __esModule: true,
  default: { getUser: jest.fn() },
}));

jest.mock('src/lib/network', () => ({
  getEnvironmentConfigFromUser: jest.fn().mockReturnValue({
    bucketId: 'bucket-id',
    encryptionKey: 'mnemonic',
    bridgeUser: 'bridge-user',
    bridgePass: 'bridge-pass',
  }),
}));

jest.mock('src/services/AppService', () => ({
  constants: { BRIDGE_URL: 'https://bridge.example.com' },
}));

jest.mock('src/services/common/media/thumbnail.constants', () => ({
  isThumbnailSupported: jest.fn(),
}));

jest.mock('src/services/common/media/thumbnail.generation', () => ({
  generateThumbnail: jest.fn(),
}));

jest.mock('src/services/common/network/upload/upload.service', () => ({
  uploadService: {
    checkFileExistence: jest.fn(),
    createFileEntry: jest.fn(),
    replaceFileEntry: jest.fn(),
    createThumbnailEntry: jest.fn(),
  },
}));

jest.mock('./PhotoBackupFolders', () => ({
  photoBackupFolders: {
    getOrCreateFolderForDate: jest.fn(),
  },
}));

const mockGetAssetInfoAsync = MediaLibrary.getAssetInfoAsync as jest.Mock;
const mockRnfsStat = RNFS.stat as jest.Mock;
const mockRnfsUnlink = RNFS.unlink as jest.Mock;
const mockUploadFile = uploadFile as jest.Mock;
const mockGetUser = asyncStorageService.getUser as jest.Mock;
const mockGenerateThumbnail = generateThumbnail as jest.Mock;
const mockIsThumbnailSupported = jest.mocked(isThumbnailSupported);
const mockCheckFileExistence = uploadService.checkFileExistence as jest.Mock;
const mockCreateFileEntry = uploadService.createFileEntry as jest.Mock;
const mockReplaceFileEntry = uploadService.replaceFileEntry as jest.Mock;
const mockCreateThumbnailEntry = uploadService.createThumbnailEntry as jest.Mock;
const mockGetOrCreateFolder = photoBackupFolders.getOrCreateFolderForDate as jest.Mock;

const DEVICE_ID = 'device-123';
const LOCAL_PATH = '/var/mobile/Media/DCIM/photo.jpg';
const LOCAL_URI = `file://${LOCAL_PATH}`;

const makeAsset = (overrides?: Partial<MediaLibrary.Asset>): MediaLibrary.Asset =>
  ({
    id: 'asset-1',
    filename: 'photo.jpg',
    uri: LOCAL_URI,
    mediaType: MediaLibrary.MediaType.photo,
    creationTime: new Date('2024-06-15T10:00:00Z').getTime(),
    modificationTime: new Date('2024-06-15T12:00:00Z').getTime(),
    duration: 0,
    width: 1920,
    height: 1080,
    ...overrides,
  }) as MediaLibrary.Asset;

beforeEach(() => {
  jest.clearAllMocks();

  mockGetAssetInfoAsync.mockResolvedValue({ localUri: LOCAL_URI });
  mockRnfsStat.mockResolvedValue({ size: 2_000_000 });
  mockRnfsUnlink.mockResolvedValue(undefined);
  mockGetUser.mockResolvedValue({ bucket: 'bucket-id', mnemonic: 'mnemonic' });
  mockGetOrCreateFolder.mockResolvedValue('folder-uuid');

  mockUploadFile.mockResolvedValueOnce('bucket-file-id').mockResolvedValueOnce('thumb-bucket-file-id');

  mockCheckFileExistence.mockResolvedValue({ existentFiles: [] });
  mockCreateFileEntry.mockResolvedValue({ uuid: 'drive-file-uuid' });
  mockReplaceFileEntry.mockResolvedValue(undefined);

  mockIsThumbnailSupported.mockReturnValue(true);
  mockGenerateThumbnail.mockResolvedValue({
    path: '/tmp/thumb.jpg',
    width: 512,
    height: 288,
    size: 40_000,
    type: 'JPEG',
  });
  mockCreateThumbnailEntry.mockResolvedValue({});
});

describe('PhotoUploadService.upload', () => {
  test('when uploading a supported image, then a thumbnail is generated and registered with the drive file uuid', async () => {
    const asset = makeAsset();

    await PhotoUploadService.upload(asset, DEVICE_ID);

    expect(mockGenerateThumbnail).toHaveBeenCalledWith(LOCAL_PATH, 'jpg');
    expect(mockCreateThumbnailEntry).toHaveBeenCalledWith({
      fileUuid: 'drive-file-uuid',
      type: 'JPEG',
      size: 40_000,
      maxWidth: 512,
      maxHeight: 288,
      bucketId: 'bucket-id',
      bucketFile: 'thumb-bucket-file-id',
      encryptVersion: EncryptionVersion.Aes03,
    });
  });

  test('when uploading a supported image, then the drive file uuid is returned', async () => {
    const result = await PhotoUploadService.upload(makeAsset(), DEVICE_ID);
    expect(result).toBe('drive-file-uuid');
  });

  test('when the photo already exists in Drive, then its existing uuid is returned without uploading again', async () => {
    mockCheckFileExistence.mockResolvedValue({ existentFiles: [{ uuid: 'existing-uuid' }] });

    const result = await PhotoUploadService.upload(makeAsset(), DEVICE_ID);

    expect(result).toBe('existing-uuid');
    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockCreateFileEntry).not.toHaveBeenCalled();
  });

  test('when the main file upload fails, then the error is propagated to the caller', async () => {
    mockUploadFile.mockReset().mockRejectedValueOnce(new Error('network timeout'));

    await expect(PhotoUploadService.upload(makeAsset(), DEVICE_ID)).rejects.toThrow('network timeout');
    expect(mockCreateFileEntry).not.toHaveBeenCalled();
  });

  test('when the asset extension is not supported for thumbnails, then no thumbnail is created and the upload still succeeds', async () => {
    mockIsThumbnailSupported.mockReturnValue(false);
    mockUploadFile.mockReset().mockResolvedValueOnce('bucket-file-id');

    const result = await PhotoUploadService.upload(makeAsset({ filename: 'photo.dng' }), DEVICE_ID);

    expect(mockGenerateThumbnail).not.toHaveBeenCalled();
    expect(mockCreateThumbnailEntry).not.toHaveBeenCalled();
    expect(result).toBe('drive-file-uuid');
  });

  test('when thumbnail generation throws, then the upload still returns the drive file uuid', async () => {
    mockGenerateThumbnail.mockRejectedValue(new Error('OOM'));
    // Only one uploadFile call for the main file
    mockUploadFile.mockReset().mockResolvedValueOnce('bucket-file-id');

    const result = await PhotoUploadService.upload(makeAsset(), DEVICE_ID);

    expect(result).toBe('drive-file-uuid');
    expect(mockCreateThumbnailEntry).not.toHaveBeenCalled();
  });

  test('when the thumbnail bucket upload throws, then the main upload still returns the drive file uuid', async () => {
    mockUploadFile.mockReset().mockResolvedValueOnce('bucket-file-id').mockRejectedValueOnce(new Error('network error'));

    const result = await PhotoUploadService.upload(makeAsset(), DEVICE_ID);

    expect(result).toBe('drive-file-uuid');
    expect(mockCreateThumbnailEntry).not.toHaveBeenCalled();
  });

  test('when the thumbnail bucket upload throws, then the thumbnail temp file is still cleaned up', async () => {
    mockUploadFile.mockReset().mockResolvedValueOnce('bucket-file-id').mockRejectedValueOnce(new Error('network error'));

    await PhotoUploadService.upload(makeAsset(), DEVICE_ID);

    expect(mockRnfsUnlink).toHaveBeenCalledWith('/tmp/thumb.jpg');
  });
});

describe('PhotoUploadService.replace', () => {
  test('when replacing an asset, then a thumbnail is regenerated and registered against the existing file uuid', async () => {
    const asset = makeAsset();

    await PhotoUploadService.replace(asset, 'existing-remote-id', DEVICE_ID);

    expect(mockGenerateThumbnail).toHaveBeenCalledWith(LOCAL_PATH, 'jpg');
    expect(mockCreateThumbnailEntry).toHaveBeenCalledWith(
      expect.objectContaining({ fileUuid: 'existing-remote-id' }),
    );
  });

  test('when replacing an asset, then the existing remote file id is returned', async () => {
    const result = await PhotoUploadService.replace(makeAsset(), 'existing-remote-id', DEVICE_ID);
    expect(result).toBe('existing-remote-id');
  });

  test('when thumbnail generation fails during a replace, then the replace still returns the existing remote file id', async () => {
    mockGenerateThumbnail.mockRejectedValue(new Error('codec error'));
    mockUploadFile.mockReset().mockResolvedValueOnce('bucket-file-id');

    const result = await PhotoUploadService.replace(makeAsset(), 'existing-remote-id', DEVICE_ID);

    expect(result).toBe('existing-remote-id');
  });
});
