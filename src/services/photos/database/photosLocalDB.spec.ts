import sqliteService from '../../SqliteService';
import { photosLocalDB } from './photosLocalDB';

jest.mock('../../SqliteService', () => ({
  __esModule: true,
  default: {
    open: jest.fn().mockResolvedValue(undefined),
    executeSql: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
  },
}));

const mockSqlite = sqliteService as jest.Mocked<typeof sqliteService>;

describe('photosLocalDB', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (photosLocalDB as any).initPromise = null;
  });

  test('when the database is initialized, then it opens the database file and creates all tables and indexes', async () => {
    await photosLocalDB.init();

    expect(mockSqlite.open).toHaveBeenCalledWith('photos_sync.db');
    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(6);
  });

  test('when the database is initialized a second time, then no database calls are made', async () => {
    await photosLocalDB.init();
    jest.clearAllMocks();
    await photosLocalDB.init();

    expect(mockSqlite.open).not.toHaveBeenCalled();
    expect(mockSqlite.executeSql).not.toHaveBeenCalled();
  });

  test('when a photo is marked as pending, then it never overwrites an already synced photo', async () => {
    await photosLocalDB.markPending('asset-1');

    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(1);
    const [, stmt, params] = mockSqlite.executeSql.mock.calls[0];
    expect(stmt).toContain('\'pending\'');
    expect(stmt).toContain('status != \'synced\'');
    expect(params).toEqual(['asset-1']);
  });

  test('when a photo is marked as synced, then it stores the remote file id and the modification time', async () => {
    await photosLocalDB.markSynced('asset-1', 'remote-file-id', 1714000000);

    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(1);
    const [, stmt, params] = mockSqlite.executeSql.mock.calls[0];
    expect(stmt).toContain('\'synced\'');
    expect(stmt).toContain('unixepoch()');
    expect(params).toEqual(['asset-1', 'remote-file-id', 1714000000]);
  });

  test('when a photo is marked as synced without a modification time, then the modification time is stored as null', async () => {
    await photosLocalDB.markSynced('asset-1', 'remote-file-id', null);

    const [, , params] = mockSqlite.executeSql.mock.calls[0];
    expect(params).toEqual(['asset-1', 'remote-file-id', null]);
  });

  test('when a photo upload fails without an error message, then it is marked as failed with a null message', async () => {
    await photosLocalDB.markError('asset-2');

    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(1);
    const [, stmt, params] = mockSqlite.executeSql.mock.calls[0];
    expect(stmt).toContain('\'error\'');
    expect(params).toEqual(['asset-2', null]);
  });

  test('when a photo upload fails with an error message, then the message is saved', async () => {
    await photosLocalDB.markError('asset-2', 'Network timeout');

    const [, , params] = mockSqlite.executeSql.mock.calls[0];
    expect(params).toEqual(['asset-2', 'Network timeout']);
  });

  test('when a photo upload fails, then the attempt counter is incremented and a synced photo is never overwritten', async () => {
    await photosLocalDB.markError('asset-2');

    const [, stmt] = mockSqlite.executeSql.mock.calls[0];
    expect(stmt).toContain('attempt_count + 1');
    expect(stmt).toContain('status != \'synced\'');
  });

  test('when looking up synced photos, then only photos with synced status are queried', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    await photosLocalDB.getSyncedEntries(['asset-1']);

    const [, stmt] = mockSqlite.getAllAsync.mock.calls[0];
    expect(stmt).toContain('status = \'synced\'');
  });

  test('when looking up 300 photos at once, then a single database query is made', async () => {
    const ids = Array.from({ length: 300 }, (_, i) => `asset-${i}`);
    mockSqlite.getAllAsync.mockResolvedValue([]);

    await photosLocalDB.getSyncedEntries(ids);

    expect(mockSqlite.getAllAsync).toHaveBeenCalledTimes(1);
  });

  test('when looking up 301 photos at once, then two database queries are made', async () => {
    const ids = Array.from({ length: 301 }, (_, i) => `asset-${i}`);
    mockSqlite.getAllAsync.mockResolvedValue([]);

    await photosLocalDB.getSyncedEntries(ids);

    expect(mockSqlite.getAllAsync).toHaveBeenCalledTimes(2);
  });

  test('when looking up synced photos, then each result includes the modification time', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([
      { asset_id: 'asset-1', modification_time: 1714000000 },
      { asset_id: 'asset-3', modification_time: null },
    ]);

    const result = await photosLocalDB.getSyncedEntries(['asset-1', 'asset-2', 'asset-3']);

    expect(result.size).toBe(2);
    expect(result.get('asset-1')).toEqual({ modificationTime: 1714000000 });
    expect(result.get('asset-3')).toEqual({ modificationTime: null });
    expect(result.has('asset-2')).toBe(false);
  });

  test('when none of the given photos have been synced, then an empty result is returned', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    const result = await photosLocalDB.getSyncedEntries(['asset-1', 'asset-2']);

    expect(result).toEqual(new Map());
  });

  test('when the list of photos to look up is empty, then no database query is made', async () => {
    const result = await photosLocalDB.getSyncedEntries([]);

    expect(mockSqlite.getAllAsync).not.toHaveBeenCalled();
    expect(result).toEqual(new Map());
  });

  test('when looking up 650 photos at once, then three database queries are made', async () => {
    const ids = Array.from({ length: 650 }, (_, i) => `asset-${i}`);
    mockSqlite.getAllAsync.mockResolvedValue([]);

    await photosLocalDB.getSyncedEntries(ids);

    expect(mockSqlite.getAllAsync).toHaveBeenCalledTimes(3);
  });

  test('when checking the status of a pending photo, then the full pending record is returned', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({
      asset_id: 'asset-3',
      status: 'pending',
      remote_file_id: null,
      synced_at: null,
      error_message: null,
      attempt_count: 0,
      created_at: 1713900000000,
      last_attempt_at: null,
      modification_time: null,
    });

    const result = await photosLocalDB.getStatus('asset-3');

    expect(result).toEqual({
      assetId: 'asset-3',
      status: 'pending',
      remoteFileId: null,
      syncedAt: null,
      errorMessage: null,
      attemptCount: 0,
      createdAt: 1713900000000,
      lastAttemptAt: null,
      modificationTime: null,
    });
  });

  test('when checking the status of a photo that has never been seen, then null is returned', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce(null);

    const result = await photosLocalDB.getStatus('unknown-asset');

    expect(result).toBeNull();
  });

  test('when checking the status of a synced photo, then all fields including modification time are returned', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({
      asset_id: 'asset-1',
      status: 'synced',
      remote_file_id: 'remote-id',
      synced_at: 1714000000000,
      error_message: null,
      attempt_count: 0,
      created_at: 1713900000000,
      last_attempt_at: 1714000000000,
      modification_time: 1714000000,
    });

    const result = await photosLocalDB.getStatus('asset-1');

    expect(result).toEqual({
      assetId: 'asset-1',
      status: 'synced',
      remoteFileId: 'remote-id',
      syncedAt: 1714000000000,
      errorMessage: null,
      attemptCount: 0,
      createdAt: 1713900000000,
      lastAttemptAt: 1714000000000,
      modificationTime: 1714000000,
    });
  });

  test('when checking the status of a photo that failed to sync, then the error details and attempt count are returned', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({
      asset_id: 'asset-2',
      status: 'error',
      remote_file_id: null,
      synced_at: null,
      error_message: 'Network timeout',
      attempt_count: 3,
      created_at: 1713900000000,
      last_attempt_at: 1714000000000,
      modification_time: null,
    });

    const result = await photosLocalDB.getStatus('asset-2');

    expect(result).toEqual({
      assetId: 'asset-2',
      status: 'error',
      remoteFileId: null,
      syncedAt: null,
      errorMessage: 'Network timeout',
      attemptCount: 3,
      createdAt: 1713900000000,
      lastAttemptAt: 1714000000000,
      modificationTime: null,
    });
  });

  test('when the database is reset, then all records are deleted', async () => {
    await photosLocalDB.reset();

    expect(mockSqlite.executeSql).toHaveBeenCalledWith('photos_sync.db', expect.stringContaining('DELETE FROM'));
  });

  test('when the database is initialized, then the cloud asset table and its three indexes are also created', async () => {
    await photosLocalDB.init();

    const statements = mockSqlite.executeSql.mock.calls.map(([, stmt]) => stmt as string);
    const createTableCalls = statements.filter((s) => s.includes('CREATE TABLE'));
    const createIndexCalls = statements.filter((s) => s.includes('CREATE INDEX'));
    expect(createTableCalls).toHaveLength(2);
    expect(createIndexCalls).toHaveLength(4);
  });
});

describe('photosLocalDB cloud asset methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (photosLocalDB as any).initPromise = null;
  });

  test('when a cloud asset is upserted, then all its fields are passed to the database', async () => {
    await photosLocalDB.upsertCloudAsset({
      remoteFileId: 'remote-1',
      deviceId: 'device-1',
      createdAt: 1718000000000,
      fileName: 'photo.jpg',
      fileSize: 2048,
      thumbnailPath: null,
      thumbnailBucketId: 'bucket-1',
      thumbnailBucketFile: 'file-1',
      thumbnailType: 'jpg',
      discoveredAt: 1718100000000,
    });

    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(1);
    const [, , params] = mockSqlite.executeSql.mock.calls[0];
    expect(params).toEqual([
      'remote-1',
      'device-1',
      1718000000000,
      'photo.jpg',
      2048,
      null,
      'bucket-1',
      'file-1',
      'jpg',
      1718100000000,
    ]);
  });

  test('when all cloud assets are fetched, then each database row is mapped to a typed entry', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([
      {
        remote_file_id: 'r1',
        device_id: 'd1',
        created_at: 1718000000,
        file_name: 'a.jpg',
        file_size: 512,
        thumbnail_path: '/local/thumb.jpg',
        thumbnail_bucket_id: 'b1',
        thumbnail_bucket_file: 'f1',
        thumbnail_type: 'jpg',
        discovered_at: 1718100000,
      },
    ]);

    const result = await photosLocalDB.getAllCloudAssets();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      remoteFileId: 'r1',
      deviceId: 'd1',
      createdAt: 1718000000,
      fileName: 'a.jpg',
      fileSize: 512,
      thumbnailPath: '/local/thumb.jpg',
      thumbnailBucketId: 'b1',
      thumbnailBucketFile: 'f1',
      thumbnailType: 'jpg',
      discoveredAt: 1718100000,
    });
  });

  test('when cloud assets are fetched by range, then the from and to timestamps are passed as parameters', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    await photosLocalDB.getCloudAssetsByRange(1000, 2000);

    const [, , params] = mockSqlite.getAllAsync.mock.calls[0];
    expect(params).toEqual([1000, 2000]);
  });

  test('when a cloud thumbnail path is set, then the path and remote file id are passed to the database', async () => {
    await photosLocalDB.setCloudThumbnailPath('remote-1', '/path/to/thumb.jpg');

    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(1);
    const [, , params] = mockSqlite.executeSql.mock.calls[0];
    expect(params).toEqual(['/path/to/thumb.jpg', 'remote-1']);
  });

  test('when a cloud asset is deleted, then its remote file id is passed to the database', async () => {
    await photosLocalDB.deleteCloudAsset('remote-1');

    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(1);
    const [, , params] = mockSqlite.executeSql.mock.calls[0];
    expect(params).toEqual(['remote-1']);
  });

  test('when there are no cloud entries for a given month, then the cache age is null', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({ latest: null });

    const result = await photosLocalDB.getCloudFetchCacheAge('device-1', 2024, 6);

    expect(result).toBeNull();
  });

  test('when cloud entries exist for a given month, then the most recent discovered at timestamp is returned', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({ latest: 1718100000000 });

    const result = await photosLocalDB.getCloudFetchCacheAge('device-1', 2024, 6);

    expect(result).toBe(1718100000000);
  });

  test('when fetching cache age for a month, then the correct month boundaries are passed as timestamps', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({ latest: null });

    await photosLocalDB.getCloudFetchCacheAge('device-1', 2024, 6);

    const [, , params] = mockSqlite.getFirstAsync.mock.calls[0];
    const expectedFrom = new Date(2024, 5, 1).getTime();
    const expectedTo = new Date(2024, 6, 1).getTime();
    expect(params).toEqual(['device-1', expectedFrom, expectedTo]);
  });

  test('when synced remote file ids are fetched, then the result is a set of all returned ids', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([
      { remote_file_id: 'r1' },
      { remote_file_id: 'r2' },
    ]);

    const result = await photosLocalDB.getSyncedRemoteFileIds();

    expect(result).toEqual(new Set(['r1', 'r2']));
  });

  test('when there are no synced remote file ids, then an empty set is returned', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    const result = await photosLocalDB.getSyncedRemoteFileIds();

    expect(result).toEqual(new Set());
  });
});
