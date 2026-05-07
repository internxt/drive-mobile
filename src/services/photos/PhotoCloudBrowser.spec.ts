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

describe('PhotoCloudBrowser.syncAllDevicesFromMonth', () => {
  test('when given two devices and three months back, then each device is fetched for each month', async () => {
    const fetchMonthSpy = jest.spyOn(photoCloudBrowser, 'fetchMonth').mockResolvedValue(undefined);

    const devices = [
      { uuid: 'd1-uuid', name: 'device-1' },
      { uuid: 'd2-uuid', name: 'device-2' },
    ];

    await photoCloudBrowser.syncAllDevicesFromMonth({ devices, fromYear: 2024, fromMonth: 6, monthsBack: 3 });

    expect(fetchMonthSpy).toHaveBeenCalledTimes(6);
    fetchMonthSpy.mockRestore();
  });

  test('when the month range crosses a year boundary, then the year is decremented correctly', async () => {
    const fetchMonthSpy = jest.spyOn(photoCloudBrowser, 'fetchMonth').mockResolvedValue(undefined);

    const devices = [{ uuid: 'd1-uuid', name: 'device-1' }];

    await photoCloudBrowser.syncAllDevicesFromMonth({ devices, fromYear: 2024, fromMonth: 2, monthsBack: 3 });

    const calls = fetchMonthSpy.mock.calls;
    expect(calls).toContainEqual([
      expect.objectContaining({ deviceId: 'device-1', deviceFolderUuid: 'd1-uuid', year: 2024, month: 2 }),
    ]);
    expect(calls).toContainEqual([
      expect.objectContaining({ deviceId: 'device-1', deviceFolderUuid: 'd1-uuid', year: 2024, month: 1 }),
    ]);
    expect(calls).toContainEqual([
      expect.objectContaining({ deviceId: 'device-1', deviceFolderUuid: 'd1-uuid', year: 2023, month: 12 }),
    ]);

    fetchMonthSpy.mockRestore();
  });
});
