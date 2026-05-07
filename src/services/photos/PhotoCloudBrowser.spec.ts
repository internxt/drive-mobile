import { driveFolderService } from 'src/services/drive/folder/driveFolder.service';
import { photosLocalDB } from './database/photosLocalDB';
import { photoBackupFolders } from './PhotoBackupFolders';
import { photoCloudBrowser } from './PhotoCloudBrowser';

jest.mock('src/services/drive/folder/driveFolder.service', () => ({
  driveFolderService: {
    getFolderFolders: jest.fn(),
    getFolderContentByUuid: jest.fn(),
  },
}));

jest.mock('./PhotoBackupFolders', () => ({
  photoBackupFolders: {
    getRootFolderUuid: jest.fn(),
  },
}));

jest.mock('./database/photosLocalDB', () => ({
  photosLocalDB: {
    getCloudFetchCacheAge: jest.fn(),
    upsertCloudAsset: jest.fn(),
  },
}));

const mockFolderService = driveFolderService as jest.Mocked<typeof driveFolderService>;
const mockBackupFolders = photoBackupFolders as jest.Mocked<typeof photoBackupFolders>;
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

beforeEach(() => {
  jest.clearAllMocks();
  mockPhotosLocalDB.upsertCloudAsset.mockResolvedValue(undefined);
});

describe('PhotoCloudBrowser.listDeviceFolders', () => {
  test('when the root folder does not exist, then an empty list is returned without calling the drive API', async () => {
    mockBackupFolders.getRootFolderUuid.mockResolvedValueOnce(null);

    const result = await photoCloudBrowser.listDeviceFolders();

    expect(result).toEqual([]);
    expect(mockFolderService.getFolderFolders).not.toHaveBeenCalled();
  });

  test('when the root folder has two device subfolders, then both devices are returned', async () => {
    mockBackupFolders.getRootFolderUuid.mockResolvedValueOnce('root-uuid');
    mockFolderService.getFolderFolders.mockResolvedValueOnce({
      folders: [makeFolder('d1-uuid', 'device-1'), makeFolder('d2-uuid', 'device-2')],
    } as never);

    const result = await photoCloudBrowser.listDeviceFolders();

    expect(result).toEqual([
      { uuid: 'd1-uuid', name: 'device-1' },
      { uuid: 'd2-uuid', name: 'device-2' },
    ]);
  });

  test('when the root has exactly 50 device folders, then a second page is fetched to check for more', async () => {
    mockBackupFolders.getRootFolderUuid.mockResolvedValueOnce('root-uuid');
    const firstBatch = Array.from({ length: 50 }, (_, i) => makeFolder(`d${i}`, `device-${i}`));
    const secondBatch: never[] = [];
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: firstBatch } as never)
      .mockResolvedValueOnce({ folders: secondBatch } as never);

    const result = await photoCloudBrowser.listDeviceFolders();

    expect(mockFolderService.getFolderFolders).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(50);
  });
});

describe('PhotoCloudBrowser.fetchMonth', () => {
  test('when the cache for the given month is still fresh, then no drive API calls are made', async () => {
    const freshTimestamp = Date.now() - 1000;
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(freshTimestamp);

    await photoCloudBrowser.fetchMonth({
      deviceId: 'device-1',
      deviceFolderUuid: 'device-folder-uuid',
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
      deviceId: 'device-1',
      deviceFolderUuid: 'device-folder-uuid',
      year: 2024,
      month: 6,
    });

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledTimes(1);
    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteFileId: 'file-uuid',
        deviceId: 'device-1',
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
      deviceId: 'device-1',
      deviceFolderUuid: 'device-folder-uuid',
      year: 2024,
      month: 6,
    });

    expect(mockFolderService.getFolderFolders).toHaveBeenCalled();
  });

  test('when the year folder does not exist in drive, then no assets are upserted', async () => {
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(null);
    mockFolderService.getFolderFolders.mockResolvedValueOnce({ folders: [] } as never);

    await photoCloudBrowser.fetchMonth({
      deviceId: 'device-1',
      deviceFolderUuid: 'device-folder-uuid',
      year: 2024,
      month: 6,
    });

    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
  });

  test('when a file is inside a day folder, then the created at timestamp is derived from the folder hierarchy', async () => {
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(null);

    const yearFolder = makeFolder('year-uuid', '2024');
    const monthFolder = makeFolder('month-uuid', '06');
    const dayFolder = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');

    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [yearFolder] } as never)
      .mockResolvedValueOnce({ folders: [monthFolder] } as never)
      .mockResolvedValueOnce({ folders: [dayFolder] } as never);

    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);

    await photoCloudBrowser.fetchMonth({
      deviceId: 'device-1',
      deviceFolderUuid: 'device-folder-uuid',
      year: 2024,
      month: 6,
    });

    const upsertCall = mockPhotosLocalDB.upsertCloudAsset.mock.calls[0][0];
    expect(upsertCall.createdAt).toBe(new Date(2024, 5, 15).getTime());
  });
});

describe('PhotoCloudBrowser.fetchMonth — return value', () => {
  test('when the cache for the given month is still fresh, then zero is returned without fetching', async () => {
    const freshTimestamp = Date.now() - 1000;
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(freshTimestamp);

    const result = await photoCloudBrowser.fetchMonth({
      deviceId: 'device-1',
      deviceFolderUuid: 'device-folder-uuid',
      year: 2024,
      month: 6,
    });

    expect(result).toBe(0);
  });

  test('when the year folder does not exist, then zero is returned', async () => {
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(null);
    mockFolderService.getFolderFolders.mockResolvedValueOnce({ folders: [] } as never);

    const result = await photoCloudBrowser.fetchMonth({
      deviceId: 'device-1',
      deviceFolderUuid: 'device-folder-uuid',
      year: 2024,
      month: 6,
    });

    expect(result).toBe(0);
  });

  test('when a day folder has two files, then two is returned', async () => {
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
      deviceId: 'device-1',
      deviceFolderUuid: 'device-folder-uuid',
      year: 2024,
      month: 6,
    });

    expect(result).toBe(2);
  });
});

describe('PhotoCloudBrowser.syncAllHistory', () => {
  test('when there are no device folders, then no fetches happen', async () => {
    mockBackupFolders.getRootFolderUuid.mockResolvedValueOnce(null);

    await photoCloudBrowser.syncAllHistory({});

    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.getCloudFetchCacheAge).not.toHaveBeenCalled();
  });

  test('when devices have year and month subfolders, then every discovered month triggers an upsert flow', async () => {
    mockBackupFolders.getRootFolderUuid.mockResolvedValueOnce('root-uuid');
    const device = makeFolder('d1-uuid', 'device-1');
    const yearFolder = makeFolder('year-uuid', '2024');
    const monthA = makeFolder('mA-uuid', '06');
    const monthB = makeFolder('mB-uuid', '03');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [device] } as never)
      .mockResolvedValueOnce({ folders: [yearFolder] } as never)
      .mockResolvedValueOnce({ folders: [monthA, monthB] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValue({ files: [file] } as never);

    await photoCloudBrowser.syncAllHistory({});

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledTimes(2);
  });

  test('when discovery returns months across two years, then results are processed in newest-first order', async () => {
    mockBackupFolders.getRootFolderUuid.mockResolvedValueOnce('root-uuid');
    const device = makeFolder('d1-uuid', 'device-1');
    const year2023 = makeFolder('y23-uuid', '2023');
    const year2024 = makeFolder('y24-uuid', '2024');
    const m6_2023 = makeFolder('m6-23', '06');
    const m3_2024 = makeFolder('m3-24', '03');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [device] } as never)
      .mockResolvedValueOnce({ folders: [year2023, year2024] } as never)
      .mockResolvedValueOnce({ folders: [m6_2023] } as never)
      .mockResolvedValueOnce({ folders: [m3_2024] } as never)
      .mockResolvedValue({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({});

    expect(mockPhotosLocalDB.getCloudFetchCacheAge.mock.calls[0]).toEqual(['device-1', 2024, 3]);
    expect(mockPhotosLocalDB.getCloudFetchCacheAge.mock.calls[1]).toEqual(['device-1', 2023, 6]);
  });

  test('when isCancelled returns true, then fewer months are fetched than discovered', async () => {
    mockBackupFolders.getRootFolderUuid.mockResolvedValueOnce('root-uuid');
    const device = makeFolder('d1-uuid', 'device-1');
    const year = makeFolder('y-uuid', '2024');
    const m1 = makeFolder('m1', '06');
    const m2 = makeFolder('m2', '05');
    const m3 = makeFolder('m3', '04');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [device] } as never)
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [m1, m2, m3] } as never)
      .mockResolvedValue({ folders: [] } as never);

    await photoCloudBrowser.syncAllHistory({ isCancelled: () => true });

    expect(mockPhotosLocalDB.getCloudFetchCacheAge).not.toHaveBeenCalled();
    expect(mockPhotosLocalDB.upsertCloudAsset).not.toHaveBeenCalled();
  });

  test('when a discovered month is still within TTL, then it is skipped without listing day folders', async () => {
    mockBackupFolders.getRootFolderUuid.mockResolvedValueOnce('root-uuid');
    const device = makeFolder('d1-uuid', 'device-1');
    const year = makeFolder('y-uuid', '2024');
    const m1 = makeFolder('m1-uuid', '06');
    const m2 = makeFolder('m2-uuid', '05');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    const fresh = Date.now() - 1000;
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValueOnce(fresh).mockResolvedValueOnce(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [device] } as never)
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: [m1, m2] } as never)
      .mockResolvedValueOnce({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValueOnce({ files: [file] } as never);

    await photoCloudBrowser.syncAllHistory({});

    expect(mockPhotosLocalDB.upsertCloudAsset).toHaveBeenCalledTimes(1);
    expect(mockFolderService.getFolderFolders).toHaveBeenCalledTimes(4);
  });

  test('when six months each have files, then onMonthFetched is invoked six times', async () => {
    mockBackupFolders.getRootFolderUuid.mockResolvedValueOnce('root-uuid');
    const device = makeFolder('d1-uuid', 'device-1');
    const year = makeFolder('y-uuid', '2024');
    const months = Array.from({ length: 6 }, (_, i) => makeFolder(`m${i}`, String(i + 1).padStart(2, '0')));
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [device] } as never)
      .mockResolvedValueOnce({ folders: [year] } as never)
      .mockResolvedValueOnce({ folders: months } as never)
      .mockResolvedValue({ folders: [day] } as never);
    mockFolderService.getFolderContentByUuid.mockResolvedValue({ files: [file] } as never);

    const onMonthFetched = jest.fn();
    await photoCloudBrowser.syncAllHistory({ onMonthFetched });

    expect(onMonthFetched).toHaveBeenCalledTimes(6);
  });

  test('when a discovered month has no files, then onMonthFetched is not invoked for that month', async () => {
    mockBackupFolders.getRootFolderUuid.mockResolvedValueOnce('root-uuid');
    const device = makeFolder('d1-uuid', 'device-1');
    const year = makeFolder('y-uuid', '2024');
    const monthWithFiles = makeFolder('m1-uuid', '06');
    const monthEmpty = makeFolder('m2-uuid', '05');
    const day = makeFolder('day-uuid', '15');
    const file = makeFile('file-uuid', 'photo.jpg');
    mockPhotosLocalDB.getCloudFetchCacheAge.mockResolvedValue(null);
    mockFolderService.getFolderFolders
      .mockResolvedValueOnce({ folders: [device] } as never)
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
