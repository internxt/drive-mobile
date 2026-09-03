import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { driveFolderService } from 'src/services/drive/folder/driveFolder.service';
import { photosLocalDB } from './database/photosLocalDB';
import { photoCloudBrowser } from './PhotoCloudBrowser';
import { photosDeviceService } from './photosDeviceService';

jest.mock('src/services/drive/folder/driveFolder.service', () => ({
  driveFolderService: {
    getFolderFolders: jest.fn(),
    getFolderContentByUuid: jest.fn(),
  },
}));

jest.mock('./photosDeviceService', () => ({
  photosDeviceService: {
    listDevices: jest.fn(),
  },
}));

jest.mock('./database/photosLocalDB', () => ({
  photosLocalDB: {
    getCloudFetchCacheAge: jest.fn(),
    upsertCloudAsset: jest.fn(),
    getCloudAssetRemoteIdsByDeviceAndMonth: jest.fn(),
    getSyncedRemoteIdsByCreationMonth: jest.fn(),
    getCloudDeletedRemoteIdsByCreationMonth: jest.fn().mockResolvedValue(new Set()),
    revertCloudDeleted: jest.fn(),
    markCloudDeleted: jest.fn(),
    deleteCloudAsset: jest.fn(),
    getCloudAssetMonthsByDevice: jest.fn(),
    getSyncedMonths: jest.fn(),
    getDistinctCloudAssetDeviceIds: jest.fn().mockResolvedValue([]),
    deleteCloudAssetsByDevice: jest.fn(),
    resetSyncedToPending: jest.fn(),
    getCachedThumbnailRefs: jest.fn(),
    getStatus: jest.fn(),
    getCloudAssetById: jest.fn(),
    deleteAssetSyncBulk: jest.fn().mockResolvedValue(undefined),
    getOrphanedAssetSyncIds: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@internxt-mobile/services/FileSystemService', () => ({
  __esModule: true,
  default: { unlinkIfExists: jest.fn() },
}));

const mockFolderService = driveFolderService as jest.Mocked<typeof driveFolderService>;
const mockDeviceService = photosDeviceService as jest.Mocked<typeof photosDeviceService>;
const mockPhotosLocalDB = photosLocalDB as jest.Mocked<typeof photosLocalDB>;
const mockFileSystemService = fileSystemService as jest.Mocked<typeof fileSystemService>;

const makeFolder = (uuid: string, plainName: string) => ({ uuid, plainName, name: plainName }) as never;
const defaultThumbnails = [{ bucket_id: 'bucket-1', bucket_file: 'file-1', type: 'jpg' }];
const makeFile = (uuid: string, plainName: string, thumbnails: unknown[] = defaultThumbnails) =>
  ({
    uuid,
    plainName,
    name: plainName,
    size: 1024,
    createdAt: '2024-06-15T12:00:00.000Z',
    thumbnails,
  }) as never;

const setupMonthFetch = (file: unknown) => {
  mockFolderService.getFolderFolders
    .mockResolvedValueOnce({ folders: [makeFolder('year-uuid', '2024')] })
    .mockResolvedValueOnce({ folders: [makeFolder('month-uuid', '06')] })
    .mockResolvedValueOnce({ folders: [makeFolder('day-uuid', '15')] });
  mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);
};
const makeDevice = (uuid: string, plainName: string, status: 'EXISTS' | 'TRASHED' | 'DELETED' = 'EXISTS') => ({
  uuid,
  plainName,
  bucket: 'photos-bucket',
  status,
});

afterEach(async () => {
  // queueMonthBackfill fires fire-and-forget — drain it so a test's dangling backfill can't run
  // during a later test and steal its mockResolvedValueOnce queue or its coalescing key.
  await photoCloudBrowser.waitForPendingCloudIndexUpdates();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPhotosLocalDB.upsertCloudAsset.mockResolvedValue(undefined);
  mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth.mockResolvedValue(new Set());
  mockPhotosLocalDB.getSyncedRemoteIdsByCreationMonth.mockResolvedValue(new Set());
  mockPhotosLocalDB.getCloudDeletedRemoteIdsByCreationMonth.mockResolvedValue(new Set());
  mockPhotosLocalDB.revertCloudDeleted.mockResolvedValue(undefined);
  mockPhotosLocalDB.markCloudDeleted.mockResolvedValue(undefined);
  mockPhotosLocalDB.deleteCloudAsset.mockResolvedValue(undefined);
  mockPhotosLocalDB.getCloudAssetMonthsByDevice.mockResolvedValue([]);
  mockPhotosLocalDB.getSyncedMonths.mockResolvedValue([]);
  mockPhotosLocalDB.getDistinctCloudAssetDeviceIds.mockResolvedValue([]);
  mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
  mockPhotosLocalDB.getCachedThumbnailRefs.mockResolvedValue(new Map());
  mockFileSystemService.unlinkIfExists.mockResolvedValue(true);
});

describe('PhotoCloudBrowser.listDeviceFolders', () => {
  test('when the device service returns no devices, then an empty list is returned without calling the drive API', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([]);

    const result = await photoCloudBrowser.listDeviceFolders();

    expect(result).toEqual([]);
    expect(mockFolderService.getFolderFolders).not.toHaveBeenCalled();
  });

  test('when the device service returns two devices, then both are mapped with uuid as name', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([
      makeDevice('d1-uuid', 'Internxt iPhone'),
      makeDevice('d2-uuid', 'Internxt iPad'),
    ]);

    const result = await photoCloudBrowser.listDeviceFolders();

    expect(result).toEqual([{ uuid: 'd1-uuid' }, { uuid: 'd2-uuid' }]);
  });

  test('when the device service returns a deleted device, then it is excluded from the list', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([
      makeDevice('d1-uuid', 'Internxt iPhone', 'EXISTS'),
      makeDevice('d2-uuid', 'Old Phone', 'DELETED'),
    ]);

    const result = await photoCloudBrowser.listDeviceFolders();

    expect(result).toHaveLength(1);
    expect(result[0].uuid).toBe('d1-uuid');
  });
});

const makeAssetSyncEntry = (overrides: Record<string, unknown> = {}) =>
  ({
    assetId: 'asset-1',
    status: 'synced',
    remoteFileId: 'remote-1',
    syncedAt: 1718000000000,
    deletedAt: null,
    errorMessage: null,
    attemptCount: 0,
    createdAt: 1717900000000,
    lastAttemptAt: null,
    modificationTime: null,
    fileName: 'photo.jpg',
    fileSize: 2048,
    creationTime: new Date('2024-06-15T10:30:00Z').getTime(),
    width: null,
    height: null,
    duration: null,
    mediaType: null,
    isLivePhoto: false,
    pairedVideoRemoteFileId: null,
    pairedVideoStatus: null,
    isBurst: false,
    burstId: null,
    burstMemberRemoteFileIds: null,
    burstMemberCount: null,
    ...overrides,
  }) as never;

describe('PhotoCloudBrowser.recordSyncedAsset', () => {
  test('when an asset just finished syncing, then it is recorded in the cloud index with the day it was taken and no discovery timestamp', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry());

    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteFileId: 'remote-1',
        deviceId: 'device-1',
        folderDate: new Date(2024, 5, 15).getTime(),
        fileName: 'photo.jpg',
        fileSize: 2048,
        discoveredAt: 0,
        uploadedAt: 1718000000000,
        isFavorite: false,
        // Real local capture time, used as a proxy so the timeline can interleave this row
        // correctly (BUGFIX_CROSS_PLATFORM_PHOTO_ORDER.md Parte 2) before any real Drive fetch
        // converges creationTimeApi to Drive's own value.
        creationTimeApi: new Date('2024-06-15T10:30:00Z').getTime(),
      }),
    );
  });

  test('when the synced asset has fresh thumbnail data, then the complete cloud entry also carries the real local capture time as creationTimeApi', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(
      makeAssetSyncEntry({ thumbnailBucketId: 'thumb-bucket-1', thumbnailBucketFile: 'thumb-file-1' }),
    );

    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ creationTimeApi: new Date('2024-06-15T10:30:00Z').getTime() }),
    );
  });

  test('when an asset just finished syncing, then a background refresh is kicked off so the thumbnail (missing from the minimal row) converges quickly', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry());
    const fetchMonthSpy = jest.spyOn(photoCloudBrowser, 'fetchMonth').mockResolvedValue(0);

    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    expect(fetchMonthSpy).toHaveBeenCalledWith({
      deviceId: 'device-1',
      deviceFolderUuid: 'device-1',
      year: 2024,
      month: 6,
      force: true,
      currentDeviceId: 'device-1',
    });
    fetchMonthSpy.mockRestore();
  });

  test('when the asset synced through any path — Live Photo, burst, replace, or a recovered duplicate — then it is still recorded, since this reads back asset_sync instead of depending on which upload path ran', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry({ isLivePhoto: true }));

    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalled();
  });

  test('when no device id is known, then nothing is recorded', async () => {
    await photoCloudBrowser.recordSyncedAsset('asset-1', null);

    expect(mockPhotosLocalDB.getStatus).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
  });

  test('when the asset has no remote file id yet, then nothing is recorded', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry({ remoteFileId: null }));

    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
  });

  test('when the synced asset has fresh thumbnail data from the upload, then a complete cloud entry is written without calling fetchMonth', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(
      makeAssetSyncEntry({
        thumbnailBucketId: 'thumb-bucket-1',
        thumbnailBucketFile: 'thumb-file-1',
        thumbnailType: 'jpg',
        contentFileId: 'content-file-1',
        bucket: 'bucket-1',
      }),
    );
    const fetchMonthSpy = jest.spyOn(photoCloudBrowser, 'fetchMonth');

    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteFileId: 'remote-1',
        deviceId: 'device-1',
        thumbnailBucketId: 'thumb-bucket-1',
        thumbnailBucketFile: 'thumb-file-1',
        thumbnailType: 'jpg',
        fileId: 'content-file-1',
        bucket: 'bucket-1',
        discoveredAt: 0,
      }),
    );
    expect(fetchMonthSpy).not.toHaveBeenCalled();
    fetchMonthSpy.mockRestore();
  });

  test('when the asset is a burst representative with fresh thumbnail data, then burstGroupId is the representative own remote file id, not the local burst id', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(
      makeAssetSyncEntry({
        thumbnailBucketId: 'thumb-bucket-1',
        thumbnailBucketFile: 'thumb-file-1',
        thumbnailType: 'jpg',
        contentFileId: 'content-file-1',
        bucket: 'bucket-1',
        isBurst: true,
        burstId: 'local-burst-asset-id',
      }),
    );

    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ burstRole: 'representative', burstGroupId: 'remote-1' }),
    );
  });

  test('when the asset is a Live Photo with fresh thumbnail data, then livePhotoRole and pairedRemoteFileId are set directly from asset_sync', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(
      makeAssetSyncEntry({
        thumbnailBucketId: 'thumb-bucket-1',
        thumbnailBucketFile: 'thumb-file-1',
        thumbnailType: 'jpg',
        isLivePhoto: true,
        pairedVideoRemoteFileId: 'paired-remote-1',
      }),
    );

    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ livePhotoRole: 'photo', pairedRemoteFileId: 'paired-remote-1' }),
    );
  });

  test('when a Live Photo has a thumbnail but no content file id yet, then a minimal entry is written and a backfill is queued instead of a null file id', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(
      makeAssetSyncEntry({
        thumbnailBucketId: 'thumb-bucket-1',
        thumbnailBucketFile: 'thumb-file-1',
        thumbnailType: 'jpg',
        contentFileId: null,
        bucket: null,
        isLivePhoto: true,
        pairedVideoRemoteFileId: 'paired-remote-1',
      }),
    );
    const fetchMonthSpy = jest.spyOn(photoCloudBrowser, 'fetchMonth').mockResolvedValueOnce(0);

    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(expect.objectContaining({ fileId: null }));
    expect(fetchMonthSpy).toHaveBeenCalled();
    fetchMonthSpy.mockRestore();
  });

  test('when the cloud entry already has a favorite mark, then a direct write from this device does not clear it', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(
      makeAssetSyncEntry({
        thumbnailBucketId: 'thumb-bucket-1',
        thumbnailBucketFile: 'thumb-file-1',
        thumbnailType: 'jpg',
        contentFileId: 'content-file-1',
        bucket: 'bucket-1',
      }),
    );
    mockPhotosLocalDB.getCloudAssetById.mockResolvedValueOnce({ isFavorite: true } as never);

    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(expect.objectContaining({ isFavorite: true }));
  });

  test('when there is no fresh thumbnail data but a complete cloud entry already exists, then nothing is written and no backfill is queued', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry());
    mockPhotosLocalDB.getCloudAssetById.mockResolvedValueOnce({ thumbnailBucketId: 'thumb-bucket-1' } as never);
    const fetchMonthSpy = jest.spyOn(photoCloudBrowser, 'fetchMonth');

    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
    expect(fetchMonthSpy).not.toHaveBeenCalled();
    fetchMonthSpy.mockRestore();
  });

  test('when there is no fresh thumbnail data and no existing complete entry, then the minimal entry is written and a backfill is queued', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry());
    mockPhotosLocalDB.getCloudAssetById.mockResolvedValueOnce(null);
    const fetchMonthSpy = jest.spyOn(photoCloudBrowser, 'fetchMonth').mockResolvedValue(0);

    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ remoteFileId: 'remote-1', thumbnailBucketId: undefined }),
    );
    expect(fetchMonthSpy).toHaveBeenCalledWith({
      deviceId: 'device-1',
      deviceFolderUuid: 'device-1',
      year: 2024,
      month: 6,
      force: true,
      currentDeviceId: 'device-1',
    });
    fetchMonthSpy.mockRestore();
  });
});

describe('PhotoCloudBrowser month backfill coalescing', () => {
  test('when a second backfill is queued for the same device/month while the first is still in flight, then only one extra fetchMonth call runs (not one per asset)', async () => {
    let resolveFirstFetch!: (count: number) => void;
    const firstFetch = new Promise<number>((resolve) => {
      resolveFirstFetch = resolve;
    });
    const fetchMonthSpy = jest
      .spyOn(photoCloudBrowser, 'fetchMonth')
      .mockReturnValueOnce(firstFetch)
      .mockResolvedValueOnce(1);

    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry({ assetId: 'asset-1', remoteFileId: 'remote-1' }));
    mockPhotosLocalDB.getCloudAssetById.mockResolvedValueOnce(null);
    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry({ assetId: 'asset-2', remoteFileId: 'remote-2' }));
    mockPhotosLocalDB.getCloudAssetById.mockResolvedValueOnce(null);
    await photoCloudBrowser.recordSyncedAsset('asset-2', 'device-1');

    // The second call arrived while the first fetchMonth was still in flight — it must not
    // trigger a second Drive call, only mark the key for a trailing re-run.
    expect(fetchMonthSpy).toHaveBeenCalledTimes(1);

    resolveFirstFetch(0);
    await photoCloudBrowser.waitForPendingCloudIndexUpdates();

    // Exactly one coalesced re-run happened after the first call settled — not a second full
    // fetchMonth per queued asset.
    expect(fetchMonthSpy).toHaveBeenCalledTimes(2);
    fetchMonthSpy.mockRestore();
  });

  test('when no backfill was queued while the first one was in flight, then no trailing re-run happens', async () => {
    const fetchMonthSpy = jest.spyOn(photoCloudBrowser, 'fetchMonth').mockResolvedValue(0);

    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry());
    mockPhotosLocalDB.getCloudAssetById.mockResolvedValueOnce(null);
    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');
    await photoCloudBrowser.waitForPendingCloudIndexUpdates();

    expect(fetchMonthSpy).toHaveBeenCalledTimes(1);
    fetchMonthSpy.mockRestore();
  });
});

describe('PhotoCloudBrowser.deleteAssetSyncPreservingCloudVisibility', () => {
  test('when the cloud index has no entry for the backed-up photo, then a minimal cloud entry is created before the sync row is removed', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry());
    mockPhotosLocalDB.getCloudAssetById.mockResolvedValueOnce(null);

    await photoCloudBrowser.deleteAssetSyncPreservingCloudVisibility(['asset-1'], 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ remoteFileId: 'remote-1', deviceId: 'device-1', fileName: 'photo.jpg' }),
    );
    expect(mockPhotosLocalDB.deleteAssetSyncBulk).toHaveBeenCalledWith(['asset-1']);
  });

  test('when the cloud index already has the photo, then no extra entry is created', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry());
    mockPhotosLocalDB.getCloudAssetById.mockResolvedValueOnce({
      remoteFileId: 'remote-1',
      deviceId: 'device-1',
      folderDate: 1,
      fileName: 'x',
    } as never);

    await photoCloudBrowser.deleteAssetSyncPreservingCloudVisibility(['asset-1'], 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.deleteAssetSyncBulk).toHaveBeenCalledWith(['asset-1']);
  });

  test('when the cloud index already has the photo but it may only be a thumbnail-less minimal row, then a background refresh is still kicked off', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry());
    mockPhotosLocalDB.getCloudAssetById.mockResolvedValueOnce({
      remoteFileId: 'remote-1',
      deviceId: 'device-1',
      folderDate: 1,
      fileName: 'x',
    } as never);
    const fetchMonthSpy = jest.spyOn(photoCloudBrowser, 'fetchMonth').mockResolvedValue(0);

    await photoCloudBrowser.deleteAssetSyncPreservingCloudVisibility(['asset-1'], 'device-1');

    expect(fetchMonthSpy).toHaveBeenCalledWith({
      deviceId: 'device-1',
      deviceFolderUuid: 'device-1',
      year: 2024,
      month: 6,
      force: true,
      currentDeviceId: 'device-1',
    });
    fetchMonthSpy.mockRestore();
  });

  test('when the deleted asset was never backed up, then nothing is added to the cloud index', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry({ status: 'pending', remoteFileId: null }));

    await photoCloudBrowser.deleteAssetSyncPreservingCloudVisibility(['asset-1'], 'device-1');

    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.deleteAssetSyncBulk).toHaveBeenCalledWith(['asset-1']);
  });

  test('when no device id is known, then the sync row is still removed but cloud visibility is not touched', async () => {
    await photoCloudBrowser.deleteAssetSyncPreservingCloudVisibility(['asset-1'], null);

    expect(mockPhotosLocalDB.getStatus).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.deleteAssetSyncBulk).toHaveBeenCalledWith(['asset-1']);
  });

  test('when a minimal entry is created, then a background refresh of that day is kicked off to fill in real thumbnails', async () => {
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry());
    mockPhotosLocalDB.getCloudAssetById.mockResolvedValueOnce(null);
    const fetchMonthSpy = jest.spyOn(photoCloudBrowser, 'fetchMonth').mockResolvedValue(0);

    await photoCloudBrowser.deleteAssetSyncPreservingCloudVisibility(['asset-1'], 'device-1');

    expect(fetchMonthSpy).toHaveBeenCalledWith({
      deviceId: 'device-1',
      deviceFolderUuid: 'device-1',
      year: 2024,
      month: 6,
      force: true,
      currentDeviceId: 'device-1',
    });
    fetchMonthSpy.mockRestore();
  });
});

describe('PhotoCloudBrowser.cleanupOrphanedAssetSync', () => {
  test('when there are orphaned asset_sync entries, then they are removed and the count reflects it', async () => {
    mockPhotosLocalDB.getOrphanedAssetSyncIds.mockResolvedValueOnce(['asset-2']);
    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(makeAssetSyncEntry({ assetId: 'asset-2' }));
    mockPhotosLocalDB.getCloudAssetById.mockResolvedValueOnce(null);

    const removedCount = await photoCloudBrowser.cleanupOrphanedAssetSync(new Set(['asset-1']), 'device-1');

    expect(removedCount).toBe(1);
    expect(mockPhotosLocalDB.deleteAssetSyncBulk).toHaveBeenCalledWith(['asset-2']);
  });

  test('when there are no orphaned asset_sync entries, then nothing is deleted', async () => {
    mockPhotosLocalDB.getOrphanedAssetSyncIds.mockResolvedValueOnce([]);

    const removedCount = await photoCloudBrowser.cleanupOrphanedAssetSync(new Set(['asset-1']), 'device-1');

    expect(removedCount).toBe(0);
    expect(mockPhotosLocalDB.deleteAssetSyncBulk).not.toHaveBeenCalled();
  });
});

describe('PhotoCloudBrowser.fetchMonth', () => {
  test('when the cache for the given month is still fresh, then no drive API calls are made', async () => {
    const freshTimestamp = Date.now() - 1000;
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(freshTimestamp);

    await photoCloudBrowser.fetchMonth({
      deviceId: 'd1-uuid',
      deviceFolderUuid: 'd1-uuid',
      year: 2024,
      month: 6,
    });

    expect(mockFolderService.getFolderFolders).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
  });

  test('when the cache is older than 24 hours, then the drive folder tree is traversed and assets are upserted', async () => {
    const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000;
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(staleTimestamp);

    const yearFolder = makeFolder('year-uuid', '2024');
    const monthFolder = makeFolder('month-uuid', '06');
    const dayFolder = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'IMG_20240615_120000.jpg');

    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [yearFolder] })
      .mockResolvedValueOnce({ folders: [monthFolder] })
      .mockResolvedValueOnce({ folders: [dayFolder] });

    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);

    await photoCloudBrowser.fetchMonth({
      deviceId: 'd1-uuid',
      deviceFolderUuid: 'd1-uuid',
      year: 2024,
      month: 6,
    });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledTimes(1);
    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteFileId: 'file-uuid',
        deviceId: 'd1-uuid',
        fileName: 'IMG_20240615_120000.jpg',
        thumbnailBucketId: 'bucket-1',
        thumbnailBucketFile: 'file-1',
        thumbnailType: 'jpg',
      }),
    );
  });

  test('when there is no cache entry for the month, then the drive folder tree is traversed', async () => {
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(null);

    mockFolderService.getFolderFolders.mockResolvedValue({ folders: [] });

    await photoCloudBrowser.fetchMonth({
      deviceId: 'd1-uuid',
      deviceFolderUuid: 'd1-uuid',
      year: 2024,
      month: 6,
    });

    expect(mockFolderService.getFolderFolders).toHaveBeenCalled();
  });

  test('when the year folder does not exist in drive, then no assets are upserted', async () => {
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(null);
    mockFolderService.getFolderFolders.mockResolvedValueOnce({ folders: [] });

    await photoCloudBrowser.fetchMonth({
      deviceId: 'd1-uuid',
      deviceFolderUuid: 'd1-uuid',
      year: 2024,
      month: 6,
    });

    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
  });

  test('when a cloud file has several thumbnails, then the most recently created one is used', async () => {
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(null);
    setupMonthFetch(
      makeFile('file-uuid', 'IMG_20240615_120000.jpg', [
        { id: 1, bucket_id: 'bucket-1', bucket_file: 'old-thumb', type: 'jpg', createdAt: '2024-06-15T10:00:00Z' },
        { id: 2, bucket_id: 'bucket-1', bucket_file: 'new-thumb', type: 'jpg', createdAt: '2024-06-16T10:00:00Z' },
      ]),
    );

    await photoCloudBrowser.fetchMonth({ deviceId: 'd1-uuid', deviceFolderUuid: 'd1-uuid', year: 2024, month: 6 });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ thumbnailBucketFile: 'new-thumb' }),
    );
  });

  test('when the thumbnails have no creation date, then the one with the highest identifier is used', async () => {
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(null);
    setupMonthFetch(
      makeFile('file-uuid', 'IMG_20240615_120000.jpg', [
        { id: 5, bucket_id: 'bucket-1', bucket_file: 'thumb-5', type: 'jpg' },
        { id: 9, bucket_id: 'bucket-1', bucket_file: 'thumb-9', type: 'jpg' },
      ]),
    );

    await photoCloudBrowser.fetchMonth({ deviceId: 'd1-uuid', deviceFolderUuid: 'd1-uuid', year: 2024, month: 6 });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ thumbnailBucketFile: 'thumb-9' }),
    );
  });

  test('when a cloud file has no thumbnails, then the thumbnail references are left empty', async () => {
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(null);
    setupMonthFetch(makeFile('file-uuid', 'IMG_20240615_120000.jpg', []));

    await photoCloudBrowser.fetchMonth({ deviceId: 'd1-uuid', deviceFolderUuid: 'd1-uuid', year: 2024, month: 6 });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ thumbnailBucketId: null, thumbnailBucketFile: null, thumbnailType: null }),
    );
  });

  test('when a file thumbnail bucket file changes, then the old cached thumbnail file is deleted', async () => {
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(null);
    mockPhotosLocalDB.getCachedThumbnailRefs.mockResolvedValueOnce(
      new Map([['file-uuid', { thumbnailPath: '/cache/old-thumb.jpg', thumbnailBucketFile: 'old-thumb' }]]),
    );
    setupMonthFetch(makeFile('file-uuid', 'IMG_20240615_120000.jpg'));

    await photoCloudBrowser.fetchMonth({ deviceId: 'd1-uuid', deviceFolderUuid: 'd1-uuid', year: 2024, month: 6 });

    expect(mockFileSystemService.unlinkIfExists).toHaveBeenCalledWith('/cache/old-thumb.jpg');
  });

  test('when a file thumbnail bucket file is unchanged, then no cached thumbnail file is deleted', async () => {
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(null);
    mockPhotosLocalDB.getCachedThumbnailRefs.mockResolvedValueOnce(
      new Map([['file-uuid', { thumbnailPath: '/cache/thumb.jpg', thumbnailBucketFile: 'file-1' }]]),
    );
    setupMonthFetch(makeFile('file-uuid', 'IMG_20240615_120000.jpg'));

    await photoCloudBrowser.fetchMonth({ deviceId: 'd1-uuid', deviceFolderUuid: 'd1-uuid', year: 2024, month: 6 });

    expect(mockFileSystemService.unlinkIfExists).not.toHaveBeenCalled();
  });

  test('when a folder has two files, then the count returned is two', async () => {
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(null);
    const yearFolder = makeFolder('year-uuid', '2024');
    const monthFolder = makeFolder('month-uuid', '06');
    const dayFolder = makeFolder('day-uuid', '15');
    const fileA = makeFile('file-a', 'photo-a.jpg');
    const fileB = makeFile('file-b', 'photo-b.jpg');

    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [yearFolder] })
      .mockResolvedValueOnce({ folders: [monthFolder] })
      .mockResolvedValueOnce({ folders: [dayFolder] });

    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [fileA, fileB] } as never);

    const result = await photoCloudBrowser.fetchMonth({
      deviceId: 'd1-uuid',
      deviceFolderUuid: 'd1-uuid',
      year: 2024,
      month: 6,
    });

    expect(result).toBe(2);
  });
});

describe('PhotoCloudBrowser.syncAllHistory', () => {
  test('when there are no device folders, then no fetches happen', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([]);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.getCloudFetchCacheAge).not.toHaveBeenCalled();
  });

  test('when devices have year and month subfolders, then every discovered month triggers an upsert flow', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const yearFolder = makeFolder('year-uuid', '2024');
    const monthA = makeFolder('mA-uuid', '06');
    const monthB = makeFolder('mB-uuid', '03');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [yearFolder] } as never)
      .mockResolvedValueOnce({ folders: [monthA, monthB] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValue({ files: [file] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledTimes(2);
  });

  test('when discovery returns months across two years, then results are processed in newest-first order', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year2023 = makeFolder('y23-uuid', '2023');
    const year2024 = makeFolder('y24-uuid', '2024');
    const m6_2023 = makeFolder('m6-23', '06');
    const m3_2024 = makeFolder('m3-24', '03');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year2023, year2024] } as never)
      .mockResolvedValueOnce({ folders: [m6_2023] } as never)
      .mockResolvedValueOnce({ folders: [m3_2024] } as never)
      .mockResolvedValue({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.getCloudFetchCacheAge.mock.calls[0]).toEqual(['d1-uuid', 2024, 3]);
    expect(mockPhotosLocalDB.getCloudFetchCacheAge.mock.calls[1]).toEqual(['d1-uuid', 2023, 6]);
  });

  test('when the current device and another device both have months to sync, then the current device is checked first', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([
      makeDevice('other-uuid', 'Internxt iPad'),
      makeDevice('current-uuid', 'Internxt iPhone'),
    ]);
    const otherYear = makeFolder('other-y-uuid', '2024');
    const otherMonth = makeFolder('other-m-uuid', '01');
    const currentYear = makeFolder('current-y-uuid', '2024');
    const currentMonth = makeFolder('current-m-uuid', '01');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [otherYear] } as never)
      .mockResolvedValueOnce({ folders: [currentYear] } as never)
      .mockResolvedValueOnce({ folders: [otherMonth] } as never)
      .mockResolvedValueOnce({ folders: [currentMonth] } as never)
      .mockResolvedValue({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'current-uuid' });

    expect(mockPhotosLocalDB.getCloudFetchCacheAge.mock.calls[0]).toEqual(['current-uuid', 2024, 1]);
    expect(mockPhotosLocalDB.getCloudFetchCacheAge.mock.calls[1]).toEqual(['other-uuid', 2024, 1]);
  });

  test('when isCancelled returns true, then fewer months are fetched than discovered', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const m1 = makeFolder('m1', '06');
    const m2 = makeFolder('m2', '05');
    const m3 = makeFolder('m3', '04');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [m1, m2, m3] } as never)
      .mockResolvedValue({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ isCancelled: () => true, currentDeviceId: undefined });

    expect(mockPhotosLocalDB.getCloudFetchCacheAge).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
  });

  test('when a discovered month is still within TTL, then it is skipped without listing day folders', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const m1 = makeFolder('m1-uuid', '06');
    const m2 = makeFolder('m2-uuid', '05');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    const fresh = Date.now() - 1000;
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(fresh).mockResolvedValueOnce(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [m1, m2] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledTimes(1);
    expect(mockFolderService.getFolderFolders).toHaveBeenCalledTimes(3);
  });

  test('when six months each have files, then the caller is notified once per month', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const months = Array.from({ length: 6 }, (_, i) => makeFolder(`m${i}`, String(i + 1).padStart(2, '0')));
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: months } as never)
      .mockResolvedValue({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValue({ files: [file] } as never);

    const onMonthFetched = jest.fn();
    await photoCloudBrowser.syncAllHistory({ onMonthFetched, currentDeviceId: undefined });

    expect(onMonthFetched).toHaveBeenCalledTimes(6);
  });

  test('when force is true and cache is fresh, then the month is re-fetched ignoring the TTL', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const month = makeFolder('m1-uuid', '06');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    const fresh = Date.now() - 1000;
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(fresh);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);

    await photoCloudBrowser.syncAllHistory({ force: true, currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledTimes(1);
  });

  test('when a month fetch finds a previously known file missing from the cloud, then it is marked as cloud_deleted', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const month = makeFolder('m-uuid', '06');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth.mockResolvedValue(
      new Set(['file-uuid', 'deleted-file-uuid']),
    );
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledTimes(1);
    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledWith('deleted-file-uuid');
    expect(mockPhotosLocalDB.deleteCloudAsset).toHaveBeenCalledWith('deleted-file-uuid');
  });

  test('when a month fetch finds all previously known files still present, then no file is marked as cloud_deleted', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const month = makeFolder('m-uuid', '06');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth.mockResolvedValue(new Set(['file-uuid']));
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.markCloudDeleted).not.toHaveBeenCalled();
  });

  test('when a month becomes empty in the cloud, then all previously known files are marked as cloud_deleted', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const month = makeFolder('m-uuid', '06');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth.mockResolvedValue(new Set(['file-a', 'file-b']));
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValueOnce({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledTimes(2);
    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledWith('file-a');
    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledWith('file-b');
  });

  test('when the current device has a synced asset whose remote file is no longer in the cloud folder, then it is marked as cloud_deleted', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const month = makeFolder('m-uuid', '06');
    const day = makeFolder('day-uuid', '15');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth.mockResolvedValue(new Set());
    mockPhotosLocalDB.getSyncedRemoteIdsByCreationMonth.mockResolvedValue(new Set(['synced-remote-uuid']));
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'd1-uuid' });

    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledTimes(1);
    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledWith('synced-remote-uuid');
    expect(mockPhotosLocalDB.deleteCloudAsset).toHaveBeenCalledWith('synced-remote-uuid');
  });

  test('when an asset previously marked cloud_deleted is found in the cloud again, then it is reverted back to synced', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const month = makeFolder('m-uuid', '06');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('remote-uuid', 'IMG_0001');
    mockPhotosLocalDB.getCloudDeletedRemoteIdsByCreationMonth.mockResolvedValue(new Set(['remote-uuid']));
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'd1-uuid' });

    expect(mockPhotosLocalDB.revertCloudDeleted).toHaveBeenCalledWith(['remote-uuid']);
    expect(mockPhotosLocalDB.markCloudDeleted).not.toHaveBeenCalled();
  });

  test('when the current device id does not match any device in Drive, then synced assets are reset to pending but other devices are still synced', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockFolderService.getFolderFolders.mockResolvedValue({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'unknown-device-uuid' });

    // Own device folder isn't among Drive's — reset synced assets to pending regardless.
    expect(mockPhotosLocalDB.resetSyncedToPending).toHaveBeenCalledTimes(1);
    expect(mockPhotosLocalDB.resetSyncedToPending).toHaveBeenCalledWith(expect.any(Number));
    // But other (unrelated) devices are still walked so the "All devices" filter has their data.
    expect(mockFolderService.getFolderFolders).toHaveBeenCalledWith('d1-uuid', 0, 50);
  });

  test('when the current device no longer exists in Drive, then synced assets are reset to pending for re-upload', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([]);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'deleted-device-uuid' });

    expect(mockFolderService.getFolderFolders).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.resetSyncedToPending).toHaveBeenCalledTimes(1);
    expect(mockPhotosLocalDB.resetSyncedToPending).toHaveBeenCalledWith(expect.any(Number));
    expect(mockPhotosLocalDB.markCloudDeleted).not.toHaveBeenCalled();
  });

  test('when the current device matches the folder being synced, then synced remote ids are looked up to detect cloud deletions', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const month = makeFolder('m-uuid', '06');
    const day = makeFolder('day-uuid', '15');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth.mockResolvedValue(new Set());
    mockPhotosLocalDB.getSyncedRemoteIdsByCreationMonth.mockResolvedValue(new Set());
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'd1-uuid' });

    expect(mockPhotosLocalDB.getSyncedRemoteIdsByCreationMonth).toHaveBeenCalledWith(2024, 6, expect.any(Number));
  });

  test('when a month known in the DB is no longer present in the cloud, then all its files are marked as cloud_deleted', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const month = makeFolder('m-uuid', '06');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    // Drive has only 2024/06; DB also knows 2024/04 (deleted month)
    mockPhotosLocalDB.getCloudAssetMonthsByDevice.mockResolvedValue([
      { year: 2024, month: 6 },
      { year: 2024, month: 4 },
    ]);
    mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth
      .mockResolvedValueOnce(new Set(['file-uuid'])) // 2024/06 — present
      .mockResolvedValueOnce(new Set(['deleted-a', 'deleted-b'])); // 2024/04 — absent
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledTimes(2);
    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledWith('deleted-a');
    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledWith('deleted-b');
  });

  test('when the current device has synced assets in a month with no cloud folder, then those assets are marked as cloud_deleted', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const month = makeFolder('m-uuid', '06');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    // cloud_asset knows nothing about 2024/04, but asset_sync does (uploaded from this device)
    mockPhotosLocalDB.getCloudAssetMonthsByDevice.mockResolvedValue([{ year: 2024, month: 6 }]);
    mockPhotosLocalDB.getSyncedMonths.mockResolvedValue([
      { year: 2024, month: 6 },
      { year: 2024, month: 4 },
    ]);
    mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth.mockResolvedValue(new Set());
    mockPhotosLocalDB.getSyncedRemoteIdsByCreationMonth
      .mockResolvedValueOnce(new Set()) // 2024/06 fetchMonthFromFolder
      .mockResolvedValueOnce(new Set(['synced-april-uuid'])); // 2024/04 reconcileDeletedMonths
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'd1-uuid' });

    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledWith('synced-april-uuid');
  });

  test('when the current device has no cloud history at all but the local DB has synced months, then those assets are reset to pending instead of cloud_deleted', async () => {
    // Simulates the device folder having been deleted and recreated with a new identity: the
    // (new) device folder exists and is reachable, but cloud_asset has zero rows for it — while
    // asset_sync (local) still has 'synced' rows left over from before the deletion.
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockPhotosLocalDB.getCloudAssetMonthsByDevice.mockResolvedValue([]);
    mockPhotosLocalDB.getSyncedMonths.mockResolvedValue([{ year: 2024, month: 6 }]);
    mockFolderService.getFolderFolders.mockResolvedValueOnce({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'd1-uuid' });

    expect(mockPhotosLocalDB.resetSyncedToPending).toHaveBeenCalledTimes(1);
    expect(mockPhotosLocalDB.resetSyncedToPending).toHaveBeenCalledWith(expect.any(Number));
    expect(mockPhotosLocalDB.markCloudDeleted).not.toHaveBeenCalled();
  });

  test('when the current device has no cloud history but every synced month was synced during this same cycle, then nothing is reset to pending', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockPhotosLocalDB.getCloudAssetMonthsByDevice.mockResolvedValue([]);
    mockPhotosLocalDB.getSyncedMonths.mockResolvedValue([]);
    mockFolderService.getFolderFolders.mockResolvedValueOnce({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'd1-uuid' });

    expect(mockPhotosLocalDB.getSyncedMonths).toHaveBeenCalledWith(expect.any(Number));
    expect(mockPhotosLocalDB.resetSyncedToPending).not.toHaveBeenCalled();
  });

  test('when the sync cycle is cancelled, then deleted-months reconciliation is skipped', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockPhotosLocalDB.getCloudAssetMonthsByDevice.mockResolvedValue([{ year: 2024, month: 6 }]);
    mockFolderService.getFolderFolders.mockResolvedValueOnce({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'd1-uuid', isCancelled: () => true });

    expect(mockPhotosLocalDB.resetSyncedToPending).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.markCloudDeleted).not.toHaveBeenCalled();
  });

  test('when the cloud has no months at all and the DB has known months, then every known month is reconciled', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockPhotosLocalDB.getCloudAssetMonthsByDevice.mockResolvedValue([
      { year: 2024, month: 6 },
      { year: 2024, month: 5 },
    ]);
    mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth
      .mockResolvedValueOnce(new Set(['file-a']))
      .mockResolvedValueOnce(new Set(['file-b']));
    mockFolderService.getFolderFolders.mockResolvedValueOnce({ folders: [] }); // no year folders

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledTimes(2);
    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledWith('file-a');
    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledWith('file-b');
  });

  test('when every month in the DB is still present in the cloud, then no extra reconciliation runs for deleted months', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const month = makeFolder('m-uuid', '06');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockPhotosLocalDB.getCloudAssetMonthsByDevice.mockResolvedValue([{ year: 2024, month: 6 }]);
    mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth.mockResolvedValue(new Set(['file-uuid']));
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    // Only the file-level reconciliation for 2024/06 runs — no extra calls for deleted months
    expect(mockPhotosLocalDB.markCloudDeleted).not.toHaveBeenCalled();
  });

  test('when a discovered month has no files, then the caller is not notified for that month', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const monthWithFiles = makeFolder('m1-uuid', '06');
    const monthEmpty = makeFolder('m2-uuid', '05');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [monthWithFiles, monthEmpty] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never)
      .mockResolvedValueOnce({ folders: [] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);

    const onMonthFetched = jest.fn();
    await photoCloudBrowser.syncAllHistory({ onMonthFetched, currentDeviceId: undefined });

    expect(onMonthFetched).toHaveBeenCalledTimes(1);
  });

  test('when local DB has a device ID not returned by the backend, then its cloud assets are deleted', async () => {
    mockDeviceService.listDevices.mockResolvedValue([makeDevice('active-uuid', 'iPhone')]);
    mockPhotosLocalDB.getDistinctCloudAssetDeviceIds.mockResolvedValue(['active-uuid', 'orphan-uuid']);
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(Infinity);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.deleteCloudAssetsByDevice).toHaveBeenCalledWith('orphan-uuid');
    expect(mockPhotosLocalDB.deleteCloudAssetsByDevice).not.toHaveBeenCalledWith('active-uuid');
  });

  test('when all local device IDs match backend devices, then no cloud assets are deleted', async () => {
    mockDeviceService.listDevices.mockResolvedValue([makeDevice('active-uuid', 'iPhone')]);
    mockPhotosLocalDB.getDistinctCloudAssetDeviceIds.mockResolvedValue(['active-uuid']);
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(Infinity);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.deleteCloudAssetsByDevice).not.toHaveBeenCalled();
  });

  test('when the current device id is provided and multiple devices exist, then every device is still walked (not just the current one)', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([
      makeDevice('current-uuid', 'Internxt iPhone'),
      makeDevice('other-uuid', 'Internxt iPad'),
    ]);
    mockFolderService.getFolderFolders.mockResolvedValue({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'current-uuid' });

    expect(mockFolderService.getFolderFolders).toHaveBeenCalledWith('current-uuid', 0, 50);
    expect(mockFolderService.getFolderFolders).toHaveBeenCalledWith('other-uuid', 0, 50);
  });

  test('when the current device id is provided and other devices are still active in Drive, then their local cloud asset rows are not purged', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([
      makeDevice('current-uuid', 'Internxt iPhone'),
      makeDevice('other-uuid', 'Internxt iPad'),
    ]);
    mockPhotosLocalDB.getDistinctCloudAssetDeviceIds.mockResolvedValue(['current-uuid', 'other-uuid']);
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(Infinity);
    mockFolderService.getFolderFolders.mockResolvedValue({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'current-uuid' });

    // Both devices are still registered in Drive, so neither is "orphaned" — purging is reserved
    // for local device ids that no longer exist in Drive at all.
    expect(mockPhotosLocalDB.deleteCloudAssetsByDevice).not.toHaveBeenCalled();
  });

  test('when no current device id is provided, then all devices are synced', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([
      makeDevice('d1-uuid', 'Internxt iPhone'),
      makeDevice('d2-uuid', 'Internxt iPad'),
    ]);
    const yearD1 = makeFolder('y1-uuid', '2024');
    const yearD2 = makeFolder('y2-uuid', '2024');
    const month = makeFolder('m-uuid', '06');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    // discoverAvailableMonths runs Promise.all([discoverD1, discoverD2]) so calls happen in this order:
    // CALL#1: getFolderFolders(d1-uuid) — year folders for d1
    // CALL#2: getFolderFolders(d2-uuid) — year folders for d2 (concurrent, before CALL#1 resolves)
    // CALL#3: getFolderFolders(y1-uuid) — month folders for d1's 2024 folder
    // CALL#4: getFolderFolders(y2-uuid) — month folders for d2's 2024 folder
    // CALL#5+: default — day folders for each month
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [yearD1] } as never)
      .mockResolvedValueOnce({ folders: [yearD2] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValue({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValue({ files: [file] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledTimes(2);
    expect(mockPhotosLocalDB.resetSyncedToPending).not.toHaveBeenCalled();
  });
});
