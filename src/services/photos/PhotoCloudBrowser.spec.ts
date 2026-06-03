import { driveFolderService } from 'src/services/drive/folder/driveFolder.service';
import { photosLocalDB } from './database/photosLocalDB';
import { photosDeviceService } from './photosDeviceService';
import { photoCloudBrowser } from './PhotoCloudBrowser';

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
    markCloudDeleted: jest.fn(),
    deleteCloudAsset: jest.fn(),
    getCloudAssetMonthsByDevice: jest.fn(),
    getSyncedMonths: jest.fn(),
  },
}));

const mockFolderService = driveFolderService as jest.Mocked<typeof driveFolderService>;
const mockDeviceService = photosDeviceService as jest.Mocked<typeof photosDeviceService>;
const mockPhotosLocalDB = photosLocalDB as jest.Mocked<typeof photosLocalDB>;

const makeFolder = (uuid: string, plainName: string) => ({ uuid, plainName, name: plainName }) as never;
const makeFile = (uuid: string, plainName: string) =>
  ({
    uuid,
    plainName,
    name: plainName,
    size: 1024,
    thumbnails: [{ bucket_id: 'bucket-1', bucket_file: 'file-1', type: 'jpg' }],
  }) as never;
const makeDevice = (uuid: string, plainName: string, status: 'EXISTS' | 'TRASHED' | 'DELETED' = 'EXISTS') => ({
  uuid,
  plainName,
  bucket: 'photos-bucket',
  status,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPhotosLocalDB.upsertCloudAsset.mockResolvedValue(undefined);
  mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth.mockResolvedValue(new Set());
  mockPhotosLocalDB.getSyncedRemoteIdsByCreationMonth.mockResolvedValue(new Set());
  mockPhotosLocalDB.markCloudDeleted.mockResolvedValue(undefined);
  mockPhotosLocalDB.deleteCloudAsset.mockResolvedValue(undefined);
  mockPhotosLocalDB.getCloudAssetMonthsByDevice.mockResolvedValue([]);
  mockPhotosLocalDB.getSyncedMonths.mockResolvedValue([]);
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

    expect(result).toEqual([
      { uuid: 'd1-uuid' },
      { uuid: 'd2-uuid' },
    ]);
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
      .mockResolvedValueOnce({ folders: [yearFolder] } as never)
      .mockResolvedValueOnce({ folders: [monthFolder] } as never)
      .mockResolvedValueOnce({ folders: [dayFolder] } as never);

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

    mockFolderService.getFolderFolders.mockResolvedValue({ folders: [] } as never);

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
    mockFolderService.getFolderFolders.mockResolvedValueOnce({ folders: [] } as never);

    await photoCloudBrowser.fetchMonth({
      deviceId: 'd1-uuid',
      deviceFolderUuid: 'd1-uuid',
      year: 2024,
      month: 6,
    });

    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
  });

  test('when a folder has two files, then the count returned is two', async () => {
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(null);
    const yearFolder = makeFolder('year-uuid', '2024');
    const monthFolder = makeFolder('month-uuid', '06');
    const dayFolder = makeFolder('day-uuid', '15');
    const fileA = makeFile('file-a', 'photo-a.jpg');
    const fileB = makeFile('file-b', 'photo-b.jpg');

    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [yearFolder] } as never)
      .mockResolvedValueOnce({ folders: [monthFolder] } as never)
      .mockResolvedValueOnce({ folders: [dayFolder] } as never);

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

    await photoCloudBrowser.syncAllHistory({});

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

    await photoCloudBrowser.syncAllHistory({});

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

    await photoCloudBrowser.syncAllHistory({});

    expect(mockPhotosLocalDB.getCloudFetchCacheAge.mock.calls[0]).toEqual(['d1-uuid', 2024, 3]);
    expect(mockPhotosLocalDB.getCloudFetchCacheAge.mock.calls[1]).toEqual(['d1-uuid', 2023, 6]);
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

    await photoCloudBrowser.syncAllHistory({ isCancelled: () => true });

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

    await photoCloudBrowser.syncAllHistory({});

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
    await photoCloudBrowser.syncAllHistory({ onMonthFetched });

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

    await photoCloudBrowser.syncAllHistory({ force: true });

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

    await photoCloudBrowser.syncAllHistory({});

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

    await photoCloudBrowser.syncAllHistory({});

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

    await photoCloudBrowser.syncAllHistory({});

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

  test('when synced assets from a different device are missing from that device cloud folder, then they are not looked up via asset_sync', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    const year = makeFolder('y-uuid', '2024');
    const month = makeFolder('m-uuid', '06');
    const day = makeFolder('day-uuid', '15');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth.mockResolvedValue(new Set());
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [month] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [] } as never);

    await photoCloudBrowser.syncAllHistory({ currentDeviceId: 'other-device-uuid' });

    expect(mockPhotosLocalDB.getSyncedRemoteIdsByCreationMonth).not.toHaveBeenCalled();
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

    expect(mockPhotosLocalDB.getSyncedRemoteIdsByCreationMonth).toHaveBeenCalled();
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

    await photoCloudBrowser.syncAllHistory({});

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

  test('when the cloud has no months at all and the DB has known months, then every known month is reconciled', async () => {
    mockDeviceService.listDevices.mockResolvedValueOnce([makeDevice('d1-uuid', 'Internxt iPhone')]);
    mockPhotosLocalDB.getCloudAssetMonthsByDevice.mockResolvedValue([
      { year: 2024, month: 6 },
      { year: 2024, month: 5 },
    ]);
    mockPhotosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth
      .mockResolvedValueOnce(new Set(['file-a']))
      .mockResolvedValueOnce(new Set(['file-b']));
    mockFolderService.getFolderFolders.mockResolvedValueOnce({ folders: [] } as never); // no year folders

    await photoCloudBrowser.syncAllHistory({});

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

    await photoCloudBrowser.syncAllHistory({});

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
    await photoCloudBrowser.syncAllHistory({ onMonthFetched });

    expect(onMonthFetched).toHaveBeenCalledTimes(1);
  });
});
