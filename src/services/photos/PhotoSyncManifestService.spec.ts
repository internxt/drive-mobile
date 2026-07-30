import * as RNFS from '@dr.pogodin/react-native-fs';
import { uploadFile } from 'src/network/upload';
import asyncStorageService from 'src/services/AsyncStorageService';
import { uploadService } from 'src/services/common/network/upload/upload.service';
import { driveFolderService } from 'src/services/drive/folder/driveFolder.service';
import fileSystemService from 'src/services/FileSystemService';
import { photosLocalDB } from './database/photosLocalDB';
import { PhotoAssetScanner } from './PhotoAssetScanner';
import { photoBackupFolders } from './PhotoBackupFolders';
import { photoSyncManifestService } from './PhotoSyncManifestService';

jest.mock('@dr.pogodin/react-native-fs', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
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
    encryptionKey: 'mnemonic',
    bridgeUser: 'bridge-user',
    bridgePass: 'bridge-pass',
  }),
}));

jest.mock('src/services/AppService', () => ({
  constants: { BRIDGE_URL: 'https://bridge.example.com' },
}));

jest.mock('src/services/common/network/upload/upload.service', () => ({
  uploadService: {
    checkFileExistence: jest.fn(),
    createFileEntry: jest.fn(),
    replaceFileEntry: jest.fn(),
  },
}));

jest.mock('src/services/drive/file/driveFile.service', () => ({
  driveFileService: { downloadFile: jest.fn() },
}));

jest.mock('src/services/drive/folder/driveFolder.service', () => ({
  driveFolderService: { getFolderContentByUuid: jest.fn() },
}));

jest.mock('src/services/FileSystemService', () => ({
  __esModule: true,
  default: {
    getCacheDir: jest.fn().mockReturnValue('/cache'),
    stat: jest.fn(),
    unlinkIfExists: jest.fn(),
  },
}));

jest.mock('./database/photosLocalDB', () => ({
  photosLocalDB: {
    getManifestEntries: jest.fn(),
    restoreEntries: jest.fn(),
  },
}));

jest.mock('./PhotoAssetScanner', () => ({
  PhotoAssetScanner: { getAssetsByIds: jest.fn() },
}));

jest.mock('./PhotoBackupFolders', () => ({
  photoBackupFolders: { getOrCreateSyncFolder: jest.fn() },
}));

const mockWriteFile = RNFS.writeFile as jest.Mock;
const mockReadFile = RNFS.readFile as jest.Mock;
const mockUploadFile = uploadFile as jest.Mock;
const mockGetUser = asyncStorageService.getUser as jest.Mock;
const mockCheckFileExistence = uploadService.checkFileExistence as jest.Mock;
const mockCreateFileEntry = uploadService.createFileEntry as jest.Mock;
const mockReplaceFileEntry = uploadService.replaceFileEntry as jest.Mock;
const mockGetFolderContentByUuid = driveFolderService.getFolderContentByUuid as jest.Mock;
const mockStat = fileSystemService.stat as jest.Mock;
const mockGetOrCreateSyncFolder = photoBackupFolders.getOrCreateSyncFolder as jest.Mock;
const mockGetManifestEntries = photosLocalDB.getManifestEntries as jest.Mock;
const mockRestoreEntries = photosLocalDB.restoreEntries as jest.Mock;
const mockGetAssetsByIds = PhotoAssetScanner.getAssetsByIds as jest.Mock;

const DEVICE_ID = 'device-123';
const PHOTOS_BUCKET = 'photos-bucket';
const SYNC_FOLDER_UUID = 'sync-folder-uuid';
const SYNCED_ENTRIES = [{ assetId: 'asset-1', status: 'synced' }];

describe('photo sync manifest service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({});
    mockGetOrCreateSyncFolder.mockResolvedValue(SYNC_FOLDER_UUID);
    mockStat.mockResolvedValue({ size: 1234 });
    mockUploadFile.mockResolvedValue('bridge-file-id');
  });

  describe('uploadManifest', () => {
    test('when the manifest does not exist yet in Drive, then a new file entry is created', async () => {
      mockGetManifestEntries.mockResolvedValue(SYNCED_ENTRIES);
      mockCheckFileExistence.mockResolvedValue({ existentFiles: [] });

      await photoSyncManifestService.uploadManifest(DEVICE_ID, PHOTOS_BUCKET);

      expect(mockCreateFileEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          plainName: 'manifest',
          type: 'json',
          folderUuid: SYNC_FOLDER_UUID,
          bucket: PHOTOS_BUCKET,
        }),
      );
      expect(mockReplaceFileEntry).not.toHaveBeenCalled();
    });

    test('when a manifest already exists in Drive, then it is replaced instead of duplicated', async () => {
      mockGetManifestEntries.mockResolvedValue(SYNCED_ENTRIES);
      mockCheckFileExistence.mockResolvedValue({ existentFiles: [{ uuid: 'existing-manifest-uuid' }] });

      await photoSyncManifestService.uploadManifest(DEVICE_ID, PHOTOS_BUCKET);

      expect(mockReplaceFileEntry).toHaveBeenCalledWith('existing-manifest-uuid', {
        fileId: 'bridge-file-id',
        size: 1234,
      });
      expect(mockCreateFileEntry).not.toHaveBeenCalled();
    });

    test('when synced assets exist, then the uploaded manifest content includes them and the temp file is cleaned up', async () => {
      mockGetManifestEntries.mockResolvedValue([{ assetId: 'asset-1', status: 'synced' }]);
      mockCheckFileExistence.mockResolvedValue({ existentFiles: [] });

      await photoSyncManifestService.uploadManifest(DEVICE_ID, PHOTOS_BUCKET);

      const [, content] = mockWriteFile.mock.calls[0];
      const manifest = JSON.parse(content);
      expect(manifest.deviceId).toBe(DEVICE_ID);
      expect(manifest.entries).toEqual([{ assetId: 'asset-1', status: 'synced' }]);
      expect(fileSystemService.unlinkIfExists).toHaveBeenCalled();
    });

    test('when uploading the manifest fails, then the error is swallowed and never thrown', async () => {
      mockGetManifestEntries.mockRejectedValue(new Error('DB error'));

      await expect(photoSyncManifestService.uploadManifest(DEVICE_ID, PHOTOS_BUCKET)).resolves.toBeUndefined();
    });

    test('when there are no synced assets to export, then no manifest is uploaded', async () => {
      mockGetManifestEntries.mockResolvedValue([]);

      await photoSyncManifestService.uploadManifest(DEVICE_ID, PHOTOS_BUCKET);

      expect(mockUploadFile).not.toHaveBeenCalled();
      expect(mockCreateFileEntry).not.toHaveBeenCalled();
      expect(mockReplaceFileEntry).not.toHaveBeenCalled();
    });
  });

  describe('maybeUploadManifest', () => {
    let currentTime = 1_700_000_000_000;
    let nowSpy: jest.SpyInstance;

    beforeEach(async () => {
      currentTime = 1_700_000_000_000;
      nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
      mockGetManifestEntries.mockResolvedValue(SYNCED_ENTRIES);
      mockCheckFileExistence.mockResolvedValue({ existentFiles: [] });

      await photoSyncManifestService.uploadManifest(DEVICE_ID, PHOTOS_BUCKET);
      jest.clearAllMocks();
      mockGetManifestEntries.mockResolvedValue(SYNCED_ENTRIES);
      mockCheckFileExistence.mockResolvedValue({ existentFiles: [] });
    });

    afterEach(() => {
      nowSpy.mockRestore();
    });

    test('when fewer assets than the checkpoint threshold have synced and the TTL has not elapsed, then no checkpoint upload happens', async () => {
      for (let i = 0; i < 99; i++) {
        await photoSyncManifestService.maybeUploadManifest(DEVICE_ID, PHOTOS_BUCKET);
      }

      expect(mockCreateFileEntry).not.toHaveBeenCalled();
      expect(mockReplaceFileEntry).not.toHaveBeenCalled();
    });

    test('when the checkpoint asset threshold is reached, then the manifest is uploaded', async () => {
      for (let i = 0; i < 100; i++) {
        await photoSyncManifestService.maybeUploadManifest(DEVICE_ID, PHOTOS_BUCKET);
      }

      expect(mockCreateFileEntry).toHaveBeenCalledTimes(1);
    });

    test('when the checkpoint TTL has elapsed, then the manifest is uploaded even with a single asset synced', async () => {
      currentTime += 5 * 60 * 1000 + 1;

      await photoSyncManifestService.maybeUploadManifest(DEVICE_ID, PHOTOS_BUCKET);

      expect(mockCreateFileEntry).toHaveBeenCalledTimes(1);
    });

    test('when a checkpoint just fired, then the very next asset synced does not trigger another one', async () => {
      for (let i = 0; i < 100; i++) {
        await photoSyncManifestService.maybeUploadManifest(DEVICE_ID, PHOTOS_BUCKET);
      }
      expect(mockCreateFileEntry).toHaveBeenCalledTimes(1);

      await photoSyncManifestService.maybeUploadManifest(DEVICE_ID, PHOTOS_BUCKET);

      expect(mockCreateFileEntry).toHaveBeenCalledTimes(1);
    });
  });

  describe('restoreManifest', () => {
    test('when no manifest file exists in the sync folder, then restore is a no-op', async () => {
      mockGetFolderContentByUuid.mockResolvedValue({ files: [] });

      const result = await photoSyncManifestService.restoreManifest(DEVICE_ID);

      expect(result).toBeNull();
      expect(mockRestoreEntries).not.toHaveBeenCalled();
    });

    test('when the manifest belongs to a different device, then it is discarded', async () => {
      mockGetFolderContentByUuid.mockResolvedValue({
        files: [{ plainName: 'manifest', type: 'json', fileId: 'file-1', bucket: PHOTOS_BUCKET, size: 10 }],
      });
      mockReadFile.mockResolvedValue(
        JSON.stringify({ schemaVersion: 1, deviceId: 'other-device', entries: [{ assetId: 'asset-1' }] }),
      );

      const result = await photoSyncManifestService.restoreManifest(DEVICE_ID);

      expect(result).toBeNull();
      expect(mockRestoreEntries).not.toHaveBeenCalled();
    });

    test('when the manifest was written with a different schema version, then it is discarded', async () => {
      mockGetFolderContentByUuid.mockResolvedValue({
        files: [{ plainName: 'manifest', type: 'json', fileId: 'file-1', bucket: PHOTOS_BUCKET, size: 10 }],
      });
      mockReadFile.mockResolvedValue(
        JSON.stringify({ schemaVersion: 2, deviceId: DEVICE_ID, entries: [{ assetId: 'asset-1' }] }),
      );

      const result = await photoSyncManifestService.restoreManifest(DEVICE_ID);

      expect(result).toBeNull();
      expect(mockRestoreEntries).not.toHaveBeenCalled();
    });

    test('when a manifest entry no longer exists in the local gallery, then it is not restored', async () => {
      mockGetFolderContentByUuid.mockResolvedValue({
        files: [{ plainName: 'manifest', type: 'json', fileId: 'file-1', bucket: PHOTOS_BUCKET, size: 10 }],
      });
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          schemaVersion: 1,
          deviceId: DEVICE_ID,
          entries: [
            { assetId: 'asset-still-here', status: 'synced' },
            { assetId: 'asset-deleted-from-device', status: 'synced' },
          ],
        }),
      );
      mockGetAssetsByIds.mockResolvedValue([{ id: 'asset-still-here' }]);

      const result = await photoSyncManifestService.restoreManifest(DEVICE_ID);

      expect(result).toEqual({ restoredCount: 1 });
      expect(mockRestoreEntries).toHaveBeenCalledWith([{ assetId: 'asset-still-here', status: 'synced' }]);
    });

    test('when restoring the manifest fails, then the error is swallowed and null is returned', async () => {
      mockGetFolderContentByUuid.mockRejectedValue(new Error('network error'));

      const result = await photoSyncManifestService.restoreManifest(DEVICE_ID);

      expect(result).toBeNull();
    });

    test('when restoreManifest is called twice concurrently, then the second call reuses the first call result instead of running again', async () => {
      let resolveFolderContent!: (value: { files: unknown[] }) => void;
      mockGetFolderContentByUuid.mockReturnValue(
        new Promise((resolve) => {
          resolveFolderContent = resolve;
        }),
      );

      const firstCall = photoSyncManifestService.restoreManifest(DEVICE_ID);
      const secondCall = photoSyncManifestService.restoreManifest(DEVICE_ID);
      resolveFolderContent({ files: [] });
      const [firstResult, secondResult] = await Promise.all([firstCall, secondCall]);

      expect(mockGetFolderContentByUuid).toHaveBeenCalledTimes(1);
      expect(firstResult).toBeNull();
      expect(secondResult).toBeNull();
    });
  });
});
