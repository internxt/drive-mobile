import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { driveFolderService } from 'src/services/drive/folder/driveFolder.service';
import { photosLocalDB } from './database/photosLocalDB';
import { photoCloudBrowser } from './PhotoCloudBrowser';
import { photosDeviceService } from './photosDeviceService';

jest.mock('src/services/drive/folder/driveFolder.service', () => ({
  driveFolderService: {
    getFolderFolders: jest.fn(),
    getFolderContentByUuid: jest.fn(),
    getFolderDeltaChanges: jest.fn(),
  },
  FOLDER_DELTA_MAX_FOLDER_UUIDS: 31,
}));

jest.mock('./photosDeviceService', () => ({
  photosDeviceService: {
    listDevices: jest.fn(),
  },
}));

jest.mock('./database/photosLocalDB', () => ({
  photosLocalDB: {
    getMonthLastFullSyncAt: jest.fn(),
    markMonthFullySynced: jest.fn().mockResolvedValue(undefined),
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
    deleteDeviceData: jest.fn(),
    resetSyncedToPending: jest.fn(),
    getCachedThumbnailRefs: jest.fn(),
    getStatus: jest.fn(),
    getCloudAssetById: jest.fn(),
    getCloudAssetsByFolderUuids: jest.fn().mockResolvedValue([]),
    deleteAssetSyncBulk: jest.fn().mockResolvedValue(undefined),
    getOrphanedAssetSyncIds: jest.fn().mockResolvedValue([]),
    upsertMonthSyncEntries: jest.fn().mockResolvedValue(undefined),
    upsertDayFolders: jest.fn().mockResolvedValue(undefined),
    setMonthLastServerUpdatedAt: jest.fn().mockResolvedValue(undefined),
    setMonthLastDeltaCheckAt: jest.fn().mockResolvedValue(undefined),
    getMonthSyncEntriesByDevice: jest.fn().mockResolvedValue([]),
    getDayFoldersByMonth: jest.fn().mockResolvedValue([]),
    deleteMonthSyncEntry: jest.fn().mockResolvedValue(undefined),
    deleteDayFolders: jest.fn().mockResolvedValue(undefined),
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
const makeFile = (
  uuid: string,
  plainName: string,
  thumbnails: unknown[] = defaultThumbnails,
  extra: Record<string, unknown> = {},
) =>
  ({
    uuid,
    plainName,
    name: plainName,
    size: 1024,
    createdAt: '2024-06-15T12:00:00.000Z',
    thumbnails,
    ...extra,
  }) as never;

const setupMonthFetch = (...files: unknown[]) => {
  mockFolderService.getFolderFolders
    .mockResolvedValueOnce({ folders: [makeFolder('year-uuid', '2024')] })
    .mockResolvedValueOnce({ folders: [makeFolder('month-uuid', '06')] })
    .mockResolvedValueOnce({ folders: [makeFolder('day-uuid', '15')] });
  mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files } as never);
};

const upsertedEntry = (remoteFileId: string) =>
  mockPhotosLocalDB.upsertCloudAsset.mock.calls
    .map(([entry]) => entry)
    .find((entry) => entry.remoteFileId === remoteFileId);

const fetchJune2024 = () =>
  photoCloudBrowser.fetchMonth({ deviceId: 'd1-uuid', deviceFolderUuid: 'd1-uuid', year: 2024, month: 6 });
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
  mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
  mockPhotosLocalDB.getCachedThumbnailRefs.mockResolvedValue(new Map());
  mockPhotosLocalDB.getCloudAssetsByFolderUuids.mockResolvedValue([]);
  mockPhotosLocalDB.getMonthSyncEntriesByDevice.mockResolvedValue([]);
  mockPhotosLocalDB.getDayFoldersByMonth.mockResolvedValue([]);
  // Reset before defaulting: clearAllMocks leaves implementations and queued `once` values behind,
  // so without this a test inherits whatever fetcher the previous one installed.
  mockFolderService.getFolderFolders.mockReset();
  mockFolderService.getFolderFolders.mockResolvedValue({ folders: [] } as never);
  mockFolderService.getFolderContentByUuid.mockReset();
  mockFolderService.getFolderContentByUuid.mockResolvedValue({ files: [] } as never);
  mockFolderService.getFolderDeltaChanges.mockReset();
  mockFolderService.getFolderDeltaChanges.mockResolvedValue({ files: [], nextCursor: null });
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

    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(
      makeAssetSyncEntry({ assetId: 'asset-1', remoteFileId: 'remote-1' }),
    );
    mockPhotosLocalDB.getCloudAssetById.mockResolvedValueOnce(null);
    await photoCloudBrowser.recordSyncedAsset('asset-1', 'device-1');

    mockPhotosLocalDB.getStatus.mockResolvedValueOnce(
      makeAssetSyncEntry({ assetId: 'asset-2', remoteFileId: 'remote-2' }),
    );
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValueOnce(freshTimestamp);

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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValueOnce(staleTimestamp);

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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValueOnce(null);

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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValueOnce(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValueOnce(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValueOnce(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValueOnce(null);
    setupMonthFetch(makeFile('file-uuid', 'IMG_20240615_120000.jpg', []));

    await photoCloudBrowser.fetchMonth({ deviceId: 'd1-uuid', deviceFolderUuid: 'd1-uuid', year: 2024, month: 6 });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ thumbnailBucketId: null, thumbnailBucketFile: null, thumbnailType: null }),
    );
  });

  test('when a file thumbnail bucket file changes, then the old cached thumbnail file is deleted', async () => {
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValueOnce(null);
    mockPhotosLocalDB.getCachedThumbnailRefs.mockResolvedValueOnce(
      new Map([['file-uuid', { thumbnailPath: '/cache/old-thumb.jpg', thumbnailBucketFile: 'old-thumb' }]]),
    );
    setupMonthFetch(makeFile('file-uuid', 'IMG_20240615_120000.jpg'));

    await photoCloudBrowser.fetchMonth({ deviceId: 'd1-uuid', deviceFolderUuid: 'd1-uuid', year: 2024, month: 6 });

    expect(mockFileSystemService.unlinkIfExists).toHaveBeenCalledWith('/cache/old-thumb.jpg');
  });

  test('when a file thumbnail bucket file is unchanged, then no cached thumbnail file is deleted', async () => {
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValueOnce(null);
    mockPhotosLocalDB.getCachedThumbnailRefs.mockResolvedValueOnce(
      new Map([['file-uuid', { thumbnailPath: '/cache/thumb.jpg', thumbnailBucketFile: 'file-1' }]]),
    );
    setupMonthFetch(makeFile('file-uuid', 'IMG_20240615_120000.jpg'));

    await photoCloudBrowser.fetchMonth({ deviceId: 'd1-uuid', deviceFolderUuid: 'd1-uuid', year: 2024, month: 6 });

    expect(mockFileSystemService.unlinkIfExists).not.toHaveBeenCalled();
  });

  test('when a folder has two files, then the count returned is two', async () => {
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValueOnce(null);
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
    expect(mockPhotosLocalDB.getMonthLastFullSyncAt).not.toHaveBeenCalled();
  });

  test('when devices have year and month subfolders, then every discovered month triggers an upsert flow', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const yearFolder = makeFolder('year-uuid', '2024');
    const monthA = makeFolder('mA-uuid', '06');
    const monthB = makeFolder('mB-uuid', '03');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year2023, year2024] } as never)
      .mockResolvedValueOnce({ folders: [m6_2023] } as never)
      .mockResolvedValueOnce({ folders: [m3_2024] } as never)
      .mockResolvedValue({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.getMonthLastFullSyncAt.mock.calls[0]).toEqual(['d1-uuid', 2024, 3]);
    expect(mockPhotosLocalDB.getMonthLastFullSyncAt.mock.calls[1]).toEqual(['d1-uuid', 2023, 6]);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [otherYear] } as never)
      .mockResolvedValueOnce({ folders: [currentYear] } as never)
      .mockResolvedValueOnce({ folders: [otherMonth] } as never)
      .mockResolvedValueOnce({ folders: [currentMonth] } as never)
      .mockResolvedValue({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'current-uuid' });

    expect(mockPhotosLocalDB.getMonthLastFullSyncAt.mock.calls[0]).toEqual(['current-uuid', 2024, 1]);
    expect(mockPhotosLocalDB.getMonthLastFullSyncAt.mock.calls[1]).toEqual(['other-uuid', 2024, 1]);
  });

  test('when isCancelled returns true, then fewer months are fetched than discovered', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const m1 = makeFolder('m1', '06');
    const m2 = makeFolder('m2', '05');
    const m3 = makeFolder('m3', '04');
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [m1, m2, m3] } as never)
      .mockResolvedValue({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ isCancelled: () => true, currentDeviceId: undefined });

    expect(mockPhotosLocalDB.getMonthLastFullSyncAt).not.toHaveBeenCalled();
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValueOnce(fresh).mockResolvedValueOnce(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(fresh);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    // But other (unrelated) devices are still fully synced so the "All devices" filter has their data.
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(Infinity);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.deleteDeviceData).toHaveBeenCalledWith('orphan-uuid');
    expect(mockPhotosLocalDB.deleteDeviceData).not.toHaveBeenCalledWith('active-uuid');
  });

  test('when all local device IDs match backend devices, then no cloud assets are deleted', async () => {
    mockDeviceService.listDevices.mockResolvedValue([makeDevice('active-uuid', 'iPhone')]);
    mockPhotosLocalDB.getDistinctCloudAssetDeviceIds.mockResolvedValue(['active-uuid']);
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(Infinity);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.deleteDeviceData).not.toHaveBeenCalled();
  });

  test('when the current device id is provided and multiple devices exist, then every device is still fully synced (not just the current one)', async () => {
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(Infinity);
    mockFolderService.getFolderFolders.mockResolvedValue({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'current-uuid' });

    // Both devices are still registered in Drive, so neither is "orphaned" — purging is reserved
    // for local device ids that no longer exist in Drive at all.
    expect(mockPhotosLocalDB.deleteDeviceData).not.toHaveBeenCalled();
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
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
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

describe('PhotoCloudBrowser folder tracking for the delta sync', () => {
  test('when months are discovered, then they are recorded with their folder identifiers', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [makeFolder('y-uuid', '2024')] } as never)
      .mockResolvedValueOnce({ folders: [makeFolder('m1-uuid', '06'), makeFolder('m2-uuid', '05')] } as never)
      .mockResolvedValue({ folders: [] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValue({ files: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertMonthSyncEntries).toHaveBeenCalledWith([
      { deviceId: 'd1-uuid', year: 2024, month: 6, monthFolderUuid: 'm1-uuid' },
      { deviceId: 'd1-uuid', year: 2024, month: 5, monthFolderUuid: 'm2-uuid' },
    ]);
  });

  test('when a month is still fresh enough to skip, then its months are still recorded even though its days are not', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(Date.now() - 1000);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [makeFolder('y-uuid', '2024')] } as never)
      .mockResolvedValueOnce({ folders: [makeFolder('m1-uuid', '06')] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertMonthSyncEntries).toHaveBeenCalledWith([
      { deviceId: 'd1-uuid', year: 2024, month: 6, monthFolderUuid: 'm1-uuid' },
    ]);
    expect(mockPhotosLocalDB.upsertDayFolders).not.toHaveBeenCalled();
  });

  test('when the day folders of a month are listed, then each one is recorded with the day it stands for', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [makeFolder('y-uuid', '2024')] } as never)
      .mockResolvedValueOnce({ folders: [makeFolder('m1-uuid', '06')] } as never)
      .mockResolvedValueOnce({
        folders: [makeFolder('day-15-uuid', '15'), makeFolder('day-16-uuid', '16')],
      } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValue({ files: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertDayFolders).toHaveBeenCalledWith([
      { dayFolderUuid: 'day-15-uuid', deviceId: 'd1-uuid', year: 2024, month: 6, day: 15 },
      { dayFolderUuid: 'day-16-uuid', deviceId: 'd1-uuid', year: 2024, month: 6, day: 16 },
    ]);
  });

  test('when a day folder is not named after a number, then it is recorded as the first of the month', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [makeFolder('y-uuid', '2024')] } as never)
      .mockResolvedValueOnce({ folders: [makeFolder('m1-uuid', '06')] } as never)
      .mockResolvedValueOnce({ folders: [makeFolder('odd-uuid', 'not-a-day')] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValue({ files: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertDayFolders).toHaveBeenCalledWith([
      { dayFolderUuid: 'odd-uuid', deviceId: 'd1-uuid', year: 2024, month: 6, day: 1 },
    ]);
  });
});

describe('PhotoCloudBrowser pairing during the full cloud sync', () => {
  test('when a photo and its paired video are in the same day folder, then both are stored pointing at each other', async () => {
    setupMonthFetch(
      makeFile('photo-uuid', 'IMG_0042', defaultThumbnails, { type: 'jpg' }),
      makeFile('video-uuid', 'IMG_0042.livephoto', defaultThumbnails, { type: 'mov' }),
    );

    await fetchJune2024();

    expect(upsertedEntry('photo-uuid')).toEqual(
      expect.objectContaining({ isLivePhoto: true, livePhotoRole: 'photo', pairedRemoteFileId: 'video-uuid' }),
    );
    expect(upsertedEntry('video-uuid')).toEqual(
      expect.objectContaining({ isLivePhoto: false, livePhotoRole: 'paired_video', pairedRemoteFileId: 'photo-uuid' }),
    );
  });

  test('when the paired video of a photo is in the trash, then the photo is not stored as a live photo', async () => {
    setupMonthFetch(
      makeFile('photo-uuid', 'IMG_0042', defaultThumbnails, { type: 'jpg', status: 'EXISTS' }),
      makeFile('video-uuid', 'IMG_0042.livephoto', defaultThumbnails, { type: 'mov', status: 'TRASHED' }),
    );

    await fetchJune2024();

    expect(upsertedEntry('video-uuid')).toBeUndefined();
    expect(upsertedEntry('photo-uuid')).toEqual(
      expect.objectContaining({ isLivePhoto: false, livePhotoRole: null, pairedRemoteFileId: null }),
    );
  });

  test('when a photo has burst members in the same day folder, then it is stored as the representative and they join its group', async () => {
    setupMonthFetch(
      makeFile('rep-uuid', 'IMG_0042', defaultThumbnails, { type: 'jpg' }),
      makeFile('member-uuid', 'IMG_0042.burst.1', defaultThumbnails, { type: 'jpg' }),
    );

    await fetchJune2024();

    expect(upsertedEntry('rep-uuid')).toEqual(
      expect.objectContaining({ burstRole: 'representative', burstGroupId: 'rep-uuid' }),
    );
    expect(upsertedEntry('member-uuid')).toEqual(
      expect.objectContaining({ burstRole: 'member', burstGroupId: 'rep-uuid' }),
    );
  });

  test('when a burst member is in the trash, then the surviving photo is not stored as a burst representative', async () => {
    setupMonthFetch(
      makeFile('rep-uuid', 'IMG_0042', defaultThumbnails, { type: 'jpg', status: 'EXISTS' }),
      makeFile('member-uuid', 'IMG_0042.burst.1', defaultThumbnails, { type: 'jpg', status: 'TRASHED' }),
    );

    await fetchJune2024();

    expect(upsertedEntry('member-uuid')).toBeUndefined();
    expect(upsertedEntry('rep-uuid')?.burstRole).toBeUndefined();
    expect(upsertedEntry('rep-uuid')?.burstGroupId).toBeUndefined();
  });

  test('when a photo has neither a paired video nor burst members, then it is stored on its own', async () => {
    setupMonthFetch(
      makeFile('photo-uuid', 'IMG_0042', defaultThumbnails, { type: 'jpg' }),
      makeFile('other-uuid', 'IMG_0043', defaultThumbnails, { type: 'jpg' }),
    );

    await fetchJune2024();

    expect(upsertedEntry('photo-uuid')).toEqual(
      expect.objectContaining({
        isLivePhoto: false,
        livePhotoRole: null,
        pairedRemoteFileId: null,
        fileName: 'IMG_0042.jpg',
      }),
    );
    expect(upsertedEntry('photo-uuid')?.burstRole).toBeUndefined();
  });
});

describe('PhotoCloudBrowser delta sync', () => {
  const now = new Date();
  const thisMonth = {
    deviceId: 'd1-uuid',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    monthFolderUuid: 'month-uuid',
    lastServerUpdatedAt: null,
    lastDeltaCheckAt: null,
    lastFullSyncAt: null,
  };

  const makeDeltaFile = (uuid: string, plainName: string, extra: Record<string, unknown> = {}) =>
    makeFile(uuid, plainName, defaultThumbnails, { type: 'jpg', status: 'EXISTS', folderUuid: 'day-uuid', ...extra });

  const makeStoredAsset = (remoteFileId: string, plainName: string, extra: Record<string, unknown> = {}) =>
    ({
      remoteFileId,
      deviceId: 'd1-uuid',
      folderDate: new Date(now.getFullYear(), now.getMonth(), 15).getTime(),
      fileName: `${plainName}.jpg`,
      plainName,
      folderUuid: 'day-uuid',
      discoveredAt: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...extra,
    }) as any;

  const setupDeltaMonth = (dayFolders = [makeFolder('day-uuid', '15')]) => {
    mockFolderService.getFolderFolders.mockResolvedValueOnce({ folders: dayFolders });
  };

  test('when a month has no changes, then nothing is stored', async () => {
    setupDeltaMonth();

    const report = await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(report?.entries).toEqual([]);
    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.markCloudDeleted).not.toHaveBeenCalled();
  });

  test('when a month is checked, then the delta is asked for its day folders from a window that starts before the last sync', async () => {
    setupDeltaMonth([makeFolder('day-uuid', '15'), makeFolder('day-uuid-2', '16')]);
    const lastServerUpdatedAt = new Date('2026-09-01T10:00:00.000Z').getTime();

    await photoCloudBrowser.syncMonthChanges({ ...thisMonth, lastServerUpdatedAt });

    expect(mockFolderService.getFolderDeltaChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        folderUuids: ['day-uuid', 'day-uuid-2'],
        updatedAt: '2026-09-01T09:59:00.000Z',
      }),
    );
  });

  test('when the delta answer spans several pages, then every page is read until the cursor runs out', async () => {
    setupDeltaMonth();
    mockFolderService.getFolderDeltaChanges
      .mockResolvedValueOnce({ files: [makeDeltaFile('file-1', 'IMG_0001')], nextCursor: 'cursor-1' })
      .mockResolvedValueOnce({ files: [makeDeltaFile('file-2', 'IMG_0002')], nextCursor: null });

    const report = await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(mockFolderService.getFolderDeltaChanges).toHaveBeenCalledTimes(2);
    expect(mockFolderService.getFolderDeltaChanges).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'cursor-1' }),
    );
    expect(report?.returnedFileCount).toBe(2);
  });

  test('when a month has more day folders than the endpoint accepts at once, then they are asked for in several batches', async () => {
    const dayFolders = Array.from({ length: 32 }, (_, i) => makeFolder(`day-uuid-${i}`, String(i + 1)));
    setupDeltaMonth(dayFolders);

    await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(mockFolderService.getFolderDeltaChanges).toHaveBeenCalledTimes(2);
    const batches = mockFolderService.getFolderDeltaChanges.mock.calls.map(([params]) => params.folderUuids);
    expect(batches[0]).toHaveLength(31);
    expect(batches[1]).toHaveLength(1);
  });

  test('when a photo arrives and its paired video is already stored from an earlier cycle, then it is still recognised as a live photo', async () => {
    setupDeltaMonth();
    mockPhotosLocalDB.getCloudAssetsByFolderUuids.mockResolvedValue([
      makeStoredAsset('video-uuid', 'IMG_0042.livephoto'),
    ]);
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [makeDeltaFile('photo-uuid', 'IMG_0042')],
      nextCursor: null,
    });

    const report = await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(report?.entries[0]).toEqual(
      expect.objectContaining({ isLivePhoto: true, livePhotoRole: 'photo', pairedRemoteFileId: 'video-uuid' }),
    );
  });

  test('when a burst member arrives and its representative is already stored from an earlier cycle, then it joins that group', async () => {
    setupDeltaMonth();
    mockPhotosLocalDB.getCloudAssetsByFolderUuids.mockResolvedValue([makeStoredAsset('rep-uuid', 'IMG_0042')]);
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [makeDeltaFile('member-uuid', 'IMG_0042.burst.1')],
      nextCursor: null,
    });

    const report = await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(report?.entries[0]).toEqual(expect.objectContaining({ burstRole: 'member', burstGroupId: 'rep-uuid' }));
  });

  test('when a stored photo arrives in the trash, then it is reported as deleted and does not pair with anything', async () => {
    setupDeltaMonth();
    mockPhotosLocalDB.getCloudAssetsByFolderUuids.mockResolvedValue([
      makeStoredAsset('video-uuid', 'IMG_0042.livephoto'),
    ]);
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [
        makeDeltaFile('photo-uuid', 'IMG_0042'),
        makeDeltaFile('video-uuid', 'IMG_0042.livephoto', { type: 'mov', status: 'TRASHED' }),
      ],
      nextCursor: null,
    });

    const report = await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(report?.deletedIds).toEqual(['video-uuid']);
    expect(report?.entries).toHaveLength(1);
    expect(report?.entries[0]).toEqual(
      expect.objectContaining({ remoteFileId: 'photo-uuid', isLivePhoto: false, pairedRemoteFileId: null }),
    );
  });

  test('when deleted photos arrive, then they are counted by the kind of deletion they carry', async () => {
    setupDeltaMonth();
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [
        makeDeltaFile('file-1', 'IMG_0001', { status: 'TRASHED' }),
        makeDeltaFile('file-2', 'IMG_0002', { status: 'DELETED' }),
        makeDeltaFile('file-3', 'IMG_0003', { status: 'DELETED' }),
      ],
      nextCursor: null,
    });

    const report = await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(report?.deletedByStatus).toEqual({ trashed: 1, deleted: 2 });
  });

  test('when a photo arrives already emptied from the trash, then it counts as deleted just like a trashed one', async () => {
    setupDeltaMonth();
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [makeDeltaFile('file-1', 'IMG_0001', { status: 'DELETED' })],
      nextCursor: null,
    });

    const report = await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(report?.deletedIds).toEqual(['file-1']);
    expect(report?.entries).toEqual([]);
    expect(report?.deletedByStatus).toEqual({ deleted: 1 });
  });

  test('when a new day folder appeared since the last cycle, then it is recorded', async () => {
    setupDeltaMonth([makeFolder('day-uuid', '15'), makeFolder('day-uuid-new', '16')]);
    mockPhotosLocalDB.getDayFoldersByMonth.mockResolvedValue([
      { dayFolderUuid: 'day-uuid', deviceId: 'd1-uuid', year: thisMonth.year, month: thisMonth.month, day: 15 },
    ]);

    const report = await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(report?.addedDayFolders).toBe(1);
    expect(mockPhotosLocalDB.upsertDayFolders).toHaveBeenCalledWith([
      expect.objectContaining({ dayFolderUuid: 'day-uuid-new' }),
    ]);
  });

  test('when a day folder known locally is gone from the cloud, then it is counted as removed', async () => {
    setupDeltaMonth([makeFolder('day-uuid', '15')]);
    mockPhotosLocalDB.getDayFoldersByMonth.mockResolvedValue([
      { dayFolderUuid: 'day-uuid', deviceId: 'd1-uuid', year: thisMonth.year, month: thisMonth.month, day: 15 },
      { dayFolderUuid: 'day-uuid-gone', deviceId: 'd1-uuid', year: thisMonth.year, month: thisMonth.month, day: 14 },
    ]);

    const report = await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(report?.removedDayFolders).toBe(1);
  });

  test('when the month folder no longer exists, then no delta is asked for and the month is left to the full sync', async () => {
    mockFolderService.getFolderFolders.mockRejectedValueOnce(new Error('folder not found'));

    const report = await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(report).toBeNull();
    expect(mockFolderService.getFolderDeltaChanges).not.toHaveBeenCalled();
  });

  test('when a photo arrives that the local index has never seen, then it is reported as new or restored', async () => {
    setupDeltaMonth();
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [makeDeltaFile('file-1', 'IMG_0001')],
      nextCursor: null,
    });

    const report = await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(report?.newOrRestoredFiles).toEqual([
      expect.objectContaining({ remoteFileId: 'file-1', fileName: 'IMG_0001.jpg' }),
    ]);
  });

  test('when a month outside the recent window has never been asked about, then the delta picks it up', async () => {
    mockDeviceService.listDevices.mockResolvedValue([makeDevice('d1-uuid', 'Device 1')] as never);
    mockPhotosLocalDB.getMonthSyncEntriesByDevice.mockResolvedValue([
      { ...thisMonth, year: thisMonth.year - 2, lastDeltaCheckAt: null },
    ]);
    setupDeltaMonth();

    await photoCloudBrowser.syncDeltaChanges({ currentDeviceId: 'd1-uuid' });

    expect(mockFolderService.getFolderDeltaChanges).toHaveBeenCalledTimes(1);
  });

  test('when the current month is known, then it is checked', async () => {
    mockDeviceService.listDevices.mockResolvedValue([makeDevice('d1-uuid', 'Device 1')] as never);
    mockPhotosLocalDB.getMonthSyncEntriesByDevice.mockResolvedValue([thisMonth]);
    setupDeltaMonth();

    await photoCloudBrowser.syncDeltaChanges({ currentDeviceId: 'd1-uuid' });

    expect(mockFolderService.getFolderDeltaChanges).toHaveBeenCalledTimes(1);
  });

  test('when a month from six months ago is known, then it is still inside the window checked every cycle', async () => {
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    mockDeviceService.listDevices.mockResolvedValue([makeDevice('d1-uuid', 'Device 1')] as never);
    mockPhotosLocalDB.getMonthSyncEntriesByDevice.mockResolvedValue([
      {
        ...thisMonth,
        year: sixMonthsAgo.getFullYear(),
        month: sixMonthsAgo.getMonth() + 1,
        lastDeltaCheckAt: Date.now(),
      },
    ]);
    setupDeltaMonth();

    await photoCloudBrowser.syncDeltaChanges({ currentDeviceId: 'd1-uuid' });

    expect(mockFolderService.getFolderDeltaChanges).toHaveBeenCalledTimes(1);
  });

  test('when a month outside the recent window was checked moments ago, then it is skipped this cycle', async () => {
    mockDeviceService.listDevices.mockResolvedValue([makeDevice('d1-uuid', 'Device 1')] as never);
    mockPhotosLocalDB.getMonthSyncEntriesByDevice.mockResolvedValue([
      { ...thisMonth, year: thisMonth.year - 2, lastDeltaCheckAt: Date.now() - 60_000 },
    ]);
    setupDeltaMonth();

    await photoCloudBrowser.syncDeltaChanges({ currentDeviceId: 'd1-uuid' });

    expect(mockFolderService.getFolderDeltaChanges).not.toHaveBeenCalled();
  });

  test('when several devices have months due, then the current device and the newest month are checked first', async () => {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    mockDeviceService.listDevices.mockResolvedValue([
      makeDevice('other-uuid', 'Other device'),
      makeDevice('d1-uuid', 'Device 1'),
    ] as never);
    mockPhotosLocalDB.getMonthSyncEntriesByDevice.mockImplementation((deviceId: string) =>
      Promise.resolve([
        { ...thisMonth, deviceId, year: lastMonth.getFullYear(), month: lastMonth.getMonth() + 1 },
        { ...thisMonth, deviceId },
      ]),
    );
    setupDeltaMonth();

    await photoCloudBrowser.syncDeltaChanges({ currentDeviceId: 'd1-uuid' });

    const checked = mockPhotosLocalDB.getDayFoldersByMonth.mock.calls.map(
      ([deviceId, year, month]) => `${deviceId} ${year}/${month}`,
    );
    expect(checked).toEqual([
      `d1-uuid ${thisMonth.year}/${thisMonth.month}`,
      `d1-uuid ${lastMonth.getFullYear()}/${lastMonth.getMonth() + 1}`,
      `other-uuid ${thisMonth.year}/${thisMonth.month}`,
      `other-uuid ${lastMonth.getFullYear()}/${lastMonth.getMonth() + 1}`,
    ]);
  });

  test('when a month outside the recent window has not been checked for over half an hour, then it is checked again', async () => {
    mockDeviceService.listDevices.mockResolvedValue([makeDevice('d1-uuid', 'Device 1')] as never);
    mockPhotosLocalDB.getMonthSyncEntriesByDevice.mockResolvedValue([
      { ...thisMonth, year: thisMonth.year - 2, lastDeltaCheckAt: Date.now() - 31 * 60 * 1000 },
    ]);
    setupDeltaMonth();

    await photoCloudBrowser.syncDeltaChanges({ currentDeviceId: 'd1-uuid' });

    expect(mockFolderService.getFolderDeltaChanges).toHaveBeenCalledTimes(1);
  });
});

describe('PhotoCloudBrowser full sync resilience', () => {
  const setupTwoMonths = () => {
    mockDeviceService.listDevices.mockResolvedValue([makeDevice('d1-uuid', 'Internxt iPhone')] as never);
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
    mockFolderService.getFolderFolders.mockImplementation((parentUuid: string) => {
      const foldersByParent: Record<string, unknown[]> = {
        'd1-uuid': [makeFolder('y-uuid', '2024')],
        'y-uuid': [makeFolder('m06-uuid', '06'), makeFolder('m07-uuid', '07')],
        'm06-uuid': [makeFolder('day-06-uuid', '15')],
        'm07-uuid': [makeFolder('day-07-uuid', '20')],
      };
      return Promise.resolve({ folders: foldersByParent[parentUuid] ?? [] }) as never;
    });
  };

  test('when one month cannot be read, then the other months are still refreshed', async () => {
    setupTwoMonths();
    mockFolderService.getFolderContentByUuid.mockImplementation((folderUuid: string) => {
      if (folderUuid === 'day-06-uuid') return Promise.reject(new Error('Request failed with status code 502'));
      return Promise.resolve({ files: [makeFile('file-july', 'IMG_0007')] }) as never;
    });

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ remoteFileId: 'file-july' }),
    );
  });

  test('when one month cannot be read, then months missing from the cloud are still reconciled', async () => {
    setupTwoMonths();
    mockPhotosLocalDB.getCloudAssetMonthsByDevice.mockResolvedValue([
      { year: 2024, month: 6 },
      { year: 2024, month: 7 },
      { year: 2024, month: 4 },
    ]);
    mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth.mockResolvedValue(new Set(['gone-uuid']));
    mockFolderService.getFolderContentByUuid.mockImplementation((folderUuid: string) => {
      if (folderUuid === 'day-06-uuid') return Promise.reject(new Error('Request failed with status code 502'));
      return Promise.resolve({ files: [] }) as never;
    });

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledWith('gone-uuid');
  });

  test('when every month fails, then the cycle still finishes instead of failing', async () => {
    setupTwoMonths();
    mockFolderService.getFolderContentByUuid.mockImplementation(() =>
      Promise.reject(new Error('Request failed with status code 502')),
    );

    await expect(photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined })).resolves.toBeUndefined();
  });
});

describe('PhotoCloudBrowser full sync freshness', () => {
  test('when a month is fully synced, then it is recorded so the next cycle can skip it', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    setupMonthFetch(makeFile('file-uuid', 'IMG_0001'));

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.markMonthFullySynced).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 'd1-uuid', year: 2024, month: 6, monthFolderUuid: 'month-uuid' }),
    );
  });

  test('when the photos of a month were refreshed by the delta but the full sync never read it, then the full sync still reads it', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockPhotosLocalDB.getMonthLastFullSyncAt.mockResolvedValue(null);
    setupMonthFetch(makeFile('file-uuid', 'IMG_0001'));

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ remoteFileId: 'file-uuid' }),
    );
  });

  const june2024 = (lastDeltaCheckAt: number | null) => ({
    deviceId: 'd1-uuid',
    year: 2024,
    month: 6,
    monthFolderUuid: 'month-uuid',
    lastServerUpdatedAt: null,
    lastDeltaCheckAt,
    lastFullSyncAt: null,
  });

  test('when a month has never been reached by the delta, then the full sync reads it', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockPhotosLocalDB.getMonthSyncEntriesByDevice.mockResolvedValue([june2024(null)]);
    setupMonthFetch(makeFile('file-uuid', 'IMG_0001'));

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ remoteFileId: 'file-uuid' }),
    );
  });

  test('when the delta is keeping a month up to date, then the full sync leaves it alone', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockPhotosLocalDB.getMonthSyncEntriesByDevice.mockResolvedValue([june2024(Date.now())]);
    setupMonthFetch(makeFile('file-uuid', 'IMG_0001'));

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
  });

  test('when a month has gone a month without the delta reaching it, then the full sync reads it again', async () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockPhotosLocalDB.getMonthSyncEntriesByDevice.mockResolvedValue([june2024(thirtyOneDaysAgo)]);
    setupMonthFetch(makeFile('file-uuid', 'IMG_0001'));

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ remoteFileId: 'file-uuid' }),
    );
  });

  test('when the user pulls to refresh, then the full sync reads every month even one the delta just checked', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockPhotosLocalDB.getMonthSyncEntriesByDevice.mockResolvedValue([june2024(Date.now())]);
    setupMonthFetch(makeFile('file-uuid', 'IMG_0001'));

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: undefined, force: true });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ remoteFileId: 'file-uuid' }),
    );
  });
});

describe('PhotoCloudBrowser delta writes', () => {
  const now = new Date();
  const thisMonth = {
    deviceId: 'd1-uuid',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    monthFolderUuid: 'month-uuid',
    lastServerUpdatedAt: null,
    lastDeltaCheckAt: null,
    lastFullSyncAt: null,
  };

  const makeDeltaFile = (uuid: string, plainName: string, extra: Record<string, unknown> = {}) =>
    makeFile(uuid, plainName, defaultThumbnails, { type: 'jpg', status: 'EXISTS', folderUuid: 'day-uuid', ...extra });

  const setupDeltaMonth = () => {
    mockFolderService.getFolderFolders.mockResolvedValueOnce({ folders: [makeFolder('day-uuid', '15')] });
  };

  test('when photos arrive alive, then they are stored in the local index', async () => {
    setupDeltaMonth();
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [makeDeltaFile('file-1', 'IMG_0001')],
      nextCursor: null,
    });

    await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({ remoteFileId: 'file-1' }),
    );
  });

  test('when a photo arrives deleted, then it is marked as deleted and removed from the index', async () => {
    setupDeltaMonth();
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [makeDeltaFile('file-1', 'IMG_0001', { status: 'TRASHED' })],
      nextCursor: null,
    });

    await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(mockPhotosLocalDB.markCloudDeleted).toHaveBeenCalledWith('file-1');
    expect(mockPhotosLocalDB.deleteCloudAsset).toHaveBeenCalledWith('file-1');
  });

  test('when a photo of this device comes back from deleted, then it is marked as backed up again', async () => {
    setupDeltaMonth();
    mockPhotosLocalDB.getCloudDeletedRemoteIdsByCreationMonth.mockResolvedValue(new Set(['file-1']));
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [makeDeltaFile('file-1', 'IMG_0001')],
      nextCursor: null,
    });

    await photoCloudBrowser.syncMonthChanges(thisMonth, true);

    expect(mockPhotosLocalDB.revertCloudDeleted).toHaveBeenCalledWith(['file-1']);
  });

  test('when a photo of another device comes back from deleted, then this device backup status is left alone', async () => {
    setupDeltaMonth();
    mockPhotosLocalDB.getCloudDeletedRemoteIdsByCreationMonth.mockResolvedValue(new Set(['file-1']));
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [makeDeltaFile('file-1', 'IMG_0001')],
      nextCursor: null,
    });

    await photoCloudBrowser.syncMonthChanges(thisMonth, false);

    expect(mockPhotosLocalDB.revertCloudDeleted).not.toHaveBeenCalled();
  });

  test('when a month is checked, then the deletion reconciliation that belongs to the full sync is never run from the delta', async () => {
    setupDeltaMonth();
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [makeDeltaFile('file-1', 'IMG_0001')],
      nextCursor: null,
    });

    await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.resetSyncedToPending).not.toHaveBeenCalled();
  });

  test('when changes are applied, then the month remembers the newest change it has seen', async () => {
    setupDeltaMonth();
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [
        makeDeltaFile('file-1', 'IMG_0001', { updatedAt: '2026-09-02T10:00:00.000Z' }),
        makeDeltaFile('file-2', 'IMG_0002', { updatedAt: '2026-09-02T12:00:00.000Z' }),
      ],
      nextCursor: null,
    });

    await photoCloudBrowser.syncMonthChanges(thisMonth);

    expect(mockPhotosLocalDB.setMonthLastServerUpdatedAt).toHaveBeenCalledWith(
      'd1-uuid',
      thisMonth.year,
      thisMonth.month,
      new Date('2026-09-02T12:00:00.000Z').getTime(),
    );
  });

  test('when a photo uploaded from this device is confirmed by the delta, then it stops being provisional', async () => {
    setupDeltaMonth();
    mockFolderService.getFolderDeltaChanges.mockResolvedValueOnce({
      files: [makeDeltaFile('file-1', 'IMG_0001')],
      nextCursor: null,
    });

    await photoCloudBrowser.syncMonthChanges(thisMonth);

    const [entry] = mockPhotosLocalDB.upsertCloudAsset.mock.calls[0];
    expect(entry.discoveredAt).toBeGreaterThan(0);
  });
});
