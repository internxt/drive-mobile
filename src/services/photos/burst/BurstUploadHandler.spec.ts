import { AbortError } from 'src/network/errors';
import { photosLocalDB } from '../database/photosLocalDB';
import { BurstNativeModule } from './BurstNativeModule';
import { retryIncompleteBursts, uploadBurstMembers } from './BurstUploadHandler';

jest.mock('./BurstNativeModule', () => ({
  BurstNativeModule: {
    getBurstRepresentativeIds: jest.fn(),
    exportBurstMembers: jest.fn(),
    saveBurst: jest.fn(),
  },
}));

jest.mock('src/services/FileSystemService', () => ({
  __esModule: true,
  default: {
    unlinkIfExists: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('src/services/photos/database/photosLocalDB', () => ({
  photosLocalDB: {
    getIncompleteBurstAssets: jest.fn().mockResolvedValue([]),
    markSyncedBurst: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('src/services/AsyncStorageService', () => ({
  __esModule: true,
  default: {
    getUser: jest.fn().mockResolvedValue({
      userId: 'user-1',
      email: 'test@internxt.com',
      mnemonic: 'word '.repeat(12).trim(),
      bridgeUser: 'bridge-user',
      bridgePass: 'bridge-pass',
    }),
  },
}));

jest.mock('src/services/photos/PhotoBackupFolders', () => ({
  photoBackupFolders: {
    getOrCreateFolderForDate: jest.fn().mockResolvedValue('folder-uuid-abc'),
  },
}));

jest.mock('src/lib/network', () => ({
  getEnvironmentConfigFromUser: jest.fn().mockReturnValue({
    encryptionKey: 'enc-key',
    bridgeUser: 'bridge-user',
    bridgePass: 'bridge-pass',
  }),
}));

const mockExportBurstMembers = BurstNativeModule.exportBurstMembers as jest.MockedFunction<
  typeof BurstNativeModule.exportBurstMembers
>;
const mockPhotosLocalDB = photosLocalDB as jest.Mocked<typeof photosLocalDB>;

const baseParams = {
  assetId: 'local-id-123',
  representativePlainName: 'IMG_1234',
  folderUuid: 'folder-uuid-abc',
  creationIso: '2024-01-01T00:00:00.000Z',
  modificationIso: '2024-01-01T00:00:00.000Z',
  credentials: { bucketId: 'bucket', encryptionKey: 'key', bridgeUser: 'user', bridgePass: 'pass' },
};

describe('burst upload handler — maybeUploadBurstMembers', () => {
  beforeEach(() => jest.clearAllMocks());

  test('when the asset has no burst members, then it returns null without calling the upload function', async () => {
    mockExportBurstMembers.mockResolvedValue([]);
    const uploadMember = jest.fn();

    const result = await uploadBurstMembers({ ...baseParams, uploadMember });

    expect(result).toBeNull();
    expect(uploadMember).not.toHaveBeenCalled();
  });

  test('when the asset has two burst members, then it uploads each one with a numbered plain name and returns their uuids', async () => {
    mockExportBurstMembers.mockResolvedValue([
      { uri: 'file:///tmp/member0.heic', size: 1000, fileName: 'member0.heic' },
      { uri: 'file:///tmp/member1.heic', size: 1200, fileName: 'member1.heic' },
    ]);
    const uploadMember = jest.fn().mockResolvedValueOnce('uuid-0').mockResolvedValueOnce('uuid-1');

    const result = await uploadBurstMembers({ ...baseParams, uploadMember });

    expect(result).toEqual({ burstId: 'local-id-123', memberUuids: ['uuid-0', 'uuid-1'] });
    expect(uploadMember).toHaveBeenCalledTimes(2);
    expect(uploadMember).toHaveBeenCalledWith(
      expect.objectContaining({
        plainName: 'IMG_1234.burst.0',
        fileExtension: 'heic',
        localFilePath: '/tmp/member0.heic',
      }),
    );
    expect(uploadMember).toHaveBeenCalledWith(
      expect.objectContaining({
        plainName: 'IMG_1234.burst.1',
        fileExtension: 'heic',
        localFilePath: '/tmp/member1.heic',
      }),
    );
  });

  test('when the member uri starts with file://, then the prefix is stripped before upload', async () => {
    mockExportBurstMembers.mockResolvedValue([
      { uri: 'file:///var/mobile/tmp/burst0.jpg', size: 800, fileName: 'burst0.jpg' },
    ]);
    const uploadMember = jest.fn().mockResolvedValue('uuid-strip');

    await uploadBurstMembers({ ...baseParams, uploadMember });

    expect(uploadMember).toHaveBeenCalledWith(expect.objectContaining({ localFilePath: '/var/mobile/tmp/burst0.jpg' }));
  });

  test('when a member has no file extension, then that member is skipped and does not reach the upload function', async () => {
    mockExportBurstMembers.mockResolvedValue([
      { uri: 'file:///tmp/noext', size: 500, fileName: 'noext' },
      { uri: 'file:///tmp/member1.heic', size: 900, fileName: 'member1.heic' },
    ]);
    const uploadMember = jest.fn().mockResolvedValue('uuid-1');

    const result = await uploadBurstMembers({ ...baseParams, uploadMember });

    expect(uploadMember).toHaveBeenCalledTimes(1);
    expect(uploadMember).toHaveBeenCalledWith(expect.objectContaining({ localFilePath: '/tmp/member1.heic' }));
    expect(result?.memberUuids).toEqual(['uuid-1']);
  });

  test('when the abort signal fires between members, then processing stops and an AbortError is thrown', async () => {
    const controller = new AbortController();
    mockExportBurstMembers.mockResolvedValue([
      { uri: 'file:///tmp/member0.heic', size: 1000, fileName: 'member0.heic' },
      { uri: 'file:///tmp/member1.heic', size: 1000, fileName: 'member1.heic' },
    ]);
    const uploadMember = jest.fn().mockImplementation(async () => {
      controller.abort();
      return 'uuid-0';
    });

    await expect(uploadBurstMembers({ ...baseParams, signal: controller.signal, uploadMember })).rejects.toBeInstanceOf(
      AbortError,
    );

    expect(uploadMember).toHaveBeenCalledTimes(1);
  });

  test('when exportBurstMembers throws, then it returns null without propagating the error', async () => {
    mockExportBurstMembers.mockRejectedValue(new Error('PHKit error'));
    const uploadMember = jest.fn();

    const result = await uploadBurstMembers({ ...baseParams, uploadMember });

    expect(result).toBeNull();
    expect(uploadMember).not.toHaveBeenCalled();
  });
});

describe('burst upload handler — retryIncompleteBursts', () => {
  const uploadMember = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    uploadMember.mockResolvedValue('uuid-member');
  });

  test('when there are no incomplete bursts, then the upload function is never called', async () => {
    mockPhotosLocalDB.getIncompleteBurstAssets.mockResolvedValue([]);

    await retryIncompleteBursts({ deviceId: 'dev-1', photosBucket: 'bucket-1', uploadMember });

    expect(uploadMember).not.toHaveBeenCalled();
  });

  test('when a burst still has no members after retry, then it stays incomplete and markSyncedBurst is not called', async () => {
    mockPhotosLocalDB.getIncompleteBurstAssets.mockResolvedValue([
      {
        assetId: 'burst-1',
        remoteFileId: 'remote-1',
        fileName: 'IMG_0001.heic',
        creationTime: 1000,
        modificationTime: 1000,
      },
    ]);
    mockExportBurstMembers.mockResolvedValue([]);

    await retryIncompleteBursts({ deviceId: 'dev-1', photosBucket: 'bucket-1', uploadMember });

    expect(mockPhotosLocalDB.markSyncedBurst).not.toHaveBeenCalled();
  });

  test('when a burst gains members on retry, then it is marked complete with the member count', async () => {
    mockPhotosLocalDB.getIncompleteBurstAssets.mockResolvedValue([
      {
        assetId: 'burst-1',
        remoteFileId: 'remote-1',
        fileName: 'IMG_0001.heic',
        creationTime: 1714000000000,
        modificationTime: 1714000000000,
      },
    ]);
    mockExportBurstMembers.mockResolvedValue([
      { uri: 'file:///tmp/f0.heic', size: 1000, fileName: 'f0.heic' },
      { uri: 'file:///tmp/f1.heic', size: 1000, fileName: 'f1.heic' },
    ]);
    uploadMember.mockResolvedValueOnce('member-uuid-0').mockResolvedValueOnce('member-uuid-1');

    await retryIncompleteBursts({ deviceId: 'dev-1', photosBucket: 'bucket-1', uploadMember });

    expect(mockPhotosLocalDB.markSyncedBurst).toHaveBeenCalledWith(
      'burst-1',
      'remote-1',
      1714000000000,
      'burst-1',
      ['member-uuid-0', 'member-uuid-1'],
      2,
    );
  });

  test('when the signal is aborted before processing starts, then no burst is processed', async () => {
    const controller = new AbortController();
    controller.abort();
    mockPhotosLocalDB.getIncompleteBurstAssets.mockResolvedValue([
      {
        assetId: 'burst-1',
        remoteFileId: 'remote-1',
        fileName: 'IMG_0001.heic',
        creationTime: 1000,
        modificationTime: 1000,
      },
    ]);

    await retryIncompleteBursts({
      deviceId: 'dev-1',
      photosBucket: 'bucket-1',
      signal: controller.signal,
      uploadMember,
    });

    expect(uploadMember).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.markSyncedBurst).not.toHaveBeenCalled();
  });

  test('when one burst fails, then it logs the error and continues with the next burst', async () => {
    mockPhotosLocalDB.getIncompleteBurstAssets.mockResolvedValue([
      {
        assetId: 'burst-fail',
        remoteFileId: 'remote-fail',
        fileName: 'IMG_FAIL.heic',
        creationTime: 1000,
        modificationTime: 1000,
      },
      {
        assetId: 'burst-ok',
        remoteFileId: 'remote-ok',
        fileName: 'IMG_OK.heic',
        creationTime: 1714000000000,
        modificationTime: 1714000000000,
      },
    ]);
    mockExportBurstMembers
      .mockRejectedValueOnce(new Error('export error'))
      .mockResolvedValueOnce([{ uri: 'file:///tmp/f0.heic', size: 1000, fileName: 'f0.heic' }]);

    await retryIncompleteBursts({ deviceId: 'dev-1', photosBucket: 'bucket-1', uploadMember });

    expect(mockPhotosLocalDB.markSyncedBurst).toHaveBeenCalledTimes(1);
    expect(mockPhotosLocalDB.markSyncedBurst).toHaveBeenCalledWith(
      'burst-ok',
      'remote-ok',
      1714000000000,
      'burst-ok',
      ['uuid-member'],
      1,
    );
  });
});
