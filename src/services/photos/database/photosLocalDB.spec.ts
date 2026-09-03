import sqliteService from '../../SqliteService';
import { photosLocalDB } from './photosLocalDB';

jest.mock('../../SqliteService', () => ({
  __esModule: true,
  default: {
    open: jest.fn().mockResolvedValue(undefined),
    executeSql: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    executeBulk: jest.fn().mockResolvedValue(undefined),
    transaction: jest.fn(),
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
    // 11 create table/index statements + 9 `ALTER TABLE … ADD COLUMN` migration statements
    // (6 on asset_sync, 3 on photo_month_sync — additive columns for installs predating them).
    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(20);
    const statements = mockSqlite.executeSql.mock.calls.map(([, stmt]) => stmt as string);
    expect(statements.some((s) => s.includes('CREATE TABLE IF NOT EXISTS asset_sync'))).toBe(true);
    expect(statements.some((s) => s.includes('CREATE TABLE IF NOT EXISTS cloud_asset'))).toBe(true);
    expect(statements.some((s) => s.includes('ALTER TABLE asset_sync ADD COLUMN thumbnail_bucket_id'))).toBe(true);
  });

  test('when the ALTER TABLE migration finds a column that already exists, then the duplicate column error is swallowed', async () => {
    mockSqlite.executeSql.mockImplementation(async (_name, stmt) => {
      if (typeof stmt === 'string' && stmt.includes('ALTER TABLE asset_sync ADD COLUMN')) {
        throw new Error('duplicate column name: thumbnail_bucket_id');
      }
      return [];
    });

    await expect(photosLocalDB.init()).resolves.toBeUndefined();

    mockSqlite.executeSql.mockResolvedValue([]); // restore the default for later tests
  });

  test('when the ALTER TABLE migration fails for a reason other than a duplicate column, then it rethrows', async () => {
    mockSqlite.executeSql.mockImplementation(async (_name, stmt) => {
      if (typeof stmt === 'string' && stmt.includes('ALTER TABLE asset_sync ADD COLUMN')) {
        throw new Error('disk I/O error');
      }
      return [];
    });

    await expect(photosLocalDB.init()).rejects.toThrow('disk I/O error');

    mockSqlite.executeSql.mockResolvedValue([]); // restore the default for later tests
  });

  test('when the database is initialized a second time, then no database calls are made', async () => {
    await photosLocalDB.init();
    jest.clearAllMocks();
    await photosLocalDB.init();

    expect(mockSqlite.open).not.toHaveBeenCalled();
    expect(mockSqlite.executeSql).not.toHaveBeenCalled();
  });

  test('when photos are marked as pending in bulk, then it never overwrites an already synced photo and all media info fields are passed', async () => {
    await photosLocalDB.markPendingBulk([
      { assetId: 'asset-1' },
      {
        assetId: 'asset-2',
        mediaInfo: {
          fileName: 'photo.jpg',
          creationTime: 1714000000000,
          width: 3024,
          height: 4032,
          duration: 0,
          mediaType: 'photo',
        },
      },
    ]);

    expect(mockSqlite.executeBulk).toHaveBeenCalledTimes(1);
    const [dbName, stmt, paramsList] = mockSqlite.executeBulk.mock.calls[0];
    expect(dbName).toBe('photos_sync.db');
    expect(stmt).toContain('\'pending\'');
    expect(stmt).toContain('ON CONFLICT');
    expect(stmt).toContain('status != \'synced\'');
    expect(paramsList).toEqual([
      ['asset-1', null, null, null, null, null, null, 0, 0],
      ['asset-2', 'photo.jpg', 1714000000000, 3024, 4032, 0, 'photo', 0, 0],
    ]);
    expect(mockSqlite.executeSql).not.toHaveBeenCalled();
  });

  test('when markPendingBulk is called with no entries, then it still delegates to executeBulk, which no-ops on an empty list', async () => {
    await photosLocalDB.markPendingBulk([]);

    expect(mockSqlite.executeBulk).toHaveBeenCalledWith('photos_sync.db', expect.any(String), []);
  });

  test('when edited photos are marked as pending in bulk, then the status is pending_edit, it never overwrites a non-synced photo, and media info fields are passed', async () => {
    await photosLocalDB.markPendingEditBulk([
      { assetId: 'asset-1' },
      {
        assetId: 'asset-2',
        mediaInfo: {
          fileName: 'video.mp4',
          creationTime: 1714000000000,
          width: 1920,
          height: 1080,
          duration: 30,
          mediaType: 'video',
        },
      },
    ]);

    expect(mockSqlite.executeBulk).toHaveBeenCalledTimes(1);
    const [, stmt, paramsList] = mockSqlite.executeBulk.mock.calls[0];
    expect(stmt).toContain('\'pending_edit\'');
    expect(stmt).toContain('status = \'synced\'');
    expect(paramsList).toEqual([
      ['asset-1', null, null, null, null, null, null, 0, 0],
      ['asset-2', 'video.mp4', 1714000000000, 1920, 1080, 30, 'video', 0, 0],
    ]);
  });

  test('when asset_sync rows are deleted in bulk, then one param row per asset id is passed to executeBulk', async () => {
    await photosLocalDB.deleteAssetSyncBulk(['asset-1', 'asset-2', 'asset-3']);

    expect(mockSqlite.executeBulk).toHaveBeenCalledTimes(1);
    const [dbName, , paramsList] = mockSqlite.executeBulk.mock.calls[0];
    expect(dbName).toBe('photos_sync.db');
    expect(paramsList).toEqual([['asset-1'], ['asset-2'], ['asset-3']]);
  });

  test('when getting orphaned asset_sync ids, then only the ones missing from the given local set are returned', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([{ asset_id: 'asset-1' }, { asset_id: 'asset-2' }]);

    const orphanIds = await photosLocalDB.getOrphanedAssetSyncIds(new Set(['asset-1']));

    expect(orphanIds).toEqual(['asset-2']);
  });

  test('when a file size is cached for an asset, then the file size and asset id are passed to the database', async () => {
    await photosLocalDB.cacheAssetFileSize('asset-3', 204800);

    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(1);
    const [, stmt, params] = mockSqlite.executeSql.mock.calls[0];
    expect(stmt).toContain('file_size');
    expect(params).toEqual([204800, 'asset-3']);
  });

  test('when a photo is marked as synced, then it stores the remote file id and the modification time', async () => {
    await photosLocalDB.markSynced('asset-1', 'remote-file-id', 1714000000);

    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(1);
    const [, stmt, params] = mockSqlite.executeSql.mock.calls[0];
    expect(stmt).toContain('\'synced\'');
    expect(stmt).toContain('unixepoch()');
    expect(params).toEqual(['asset-1', 'remote-file-id', 1714000000, null, null, null, null, null, null]);
  });

  test('when a photo is marked as synced without a modification time, then the modification time is stored as null', async () => {
    await photosLocalDB.markSynced('asset-1', 'remote-file-id', null);

    const [, , params] = mockSqlite.executeSql.mock.calls[0];
    expect(params).toEqual(['asset-1', 'remote-file-id', null, null, null, null, null, null, null]);
  });

  test('when a photo is marked as synced with the references captured by the upload, then they are persisted', async () => {
    await photosLocalDB.markSynced('asset-1', 'remote-file-id', 1714000000, {
      thumbnailBucketId: 'bucket-1',
      thumbnailBucketFile: 'thumb-file-1',
      thumbnailType: 'jpg',
      contentFileId: 'content-file-1',
      bucket: 'bucket-1',
      folderUuid: 'day-folder-1',
    });

    const [, , params] = mockSqlite.executeSql.mock.calls[0];
    expect(params).toEqual([
      'asset-1',
      'remote-file-id',
      1714000000,
      'bucket-1',
      'thumb-file-1',
      'jpg',
      'content-file-1',
      'bucket-1',
      'day-folder-1',
    ]);
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
    expect(stmt).toContain('ON CONFLICT');
    expect(stmt).toContain('status != \'synced\'');
  });

  test('when looking up synced photos, then synced, cloud_deleted, deleted and error statuses are queried', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    await photosLocalDB.getSyncedEntries(['asset-1']);

    const [, stmt] = mockSqlite.getAllAsync.mock.calls[0];
    expect(stmt).toContain('status IN (\'synced\', \'cloud_deleted\', \'deleted\', \'error\')');
  });

  test('when looking up 300 photos at once, then a single database query is made with all ids', async () => {
    const ids = Array.from({ length: 300 }, (_, i) => `asset-${i}`);
    mockSqlite.getAllAsync.mockResolvedValue([]);

    await photosLocalDB.getSyncedEntries(ids);

    expect(mockSqlite.getAllAsync).toHaveBeenCalledTimes(1);
    const allPassedIds = mockSqlite.getAllAsync.mock.calls.flatMap((call) => call[2] as string[]);
    expect(allPassedIds).toEqual(expect.arrayContaining(ids));
    expect(allPassedIds).toHaveLength(300);
  });

  test('when looking up 301 photos at once, then two database queries are made covering all ids', async () => {
    const ids = Array.from({ length: 301 }, (_, i) => `asset-${i}`);
    mockSqlite.getAllAsync.mockResolvedValue([]);

    await photosLocalDB.getSyncedEntries(ids);

    expect(mockSqlite.getAllAsync).toHaveBeenCalledTimes(2);
    const allPassedIds = mockSqlite.getAllAsync.mock.calls.flatMap((call) => call[2] as string[]);
    expect(allPassedIds).toEqual(expect.arrayContaining(ids));
    expect(allPassedIds).toHaveLength(301);
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

  test('when looking up 650 photos at once, then three database queries are made covering all ids', async () => {
    const ids = Array.from({ length: 650 }, (_, i) => `asset-${i}`);
    mockSqlite.getAllAsync.mockResolvedValue([]);

    await photosLocalDB.getSyncedEntries(ids);

    expect(mockSqlite.getAllAsync).toHaveBeenCalledTimes(3);
    const allPassedIds = mockSqlite.getAllAsync.mock.calls.flatMap((call) => call[2] as string[]);
    expect(allPassedIds).toEqual(expect.arrayContaining(ids));
    expect(allPassedIds).toHaveLength(650);
  });

  test('when checking the status of a pending photo, then the full pending record is returned', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({
      asset_id: 'asset-3',
      status: 'pending',
      remote_file_id: null,
      synced_at: null,
      deleted_at: null,
      error_message: null,
      attempt_count: 0,
      created_at: 1713900000000,
      last_attempt_at: null,
      modification_time: null,
      file_name: null,
      file_size: null,
      creation_time: null,
      width: null,
      height: null,
      duration: null,
      media_type: null,
      is_live_photo: 0,
      paired_video_remote_file_id: null,
      paired_video_status: null,
      is_burst: 0,
      burst_id: null,
      burst_member_remote_file_ids: null,
      burst_member_count: null,
    });

    const result = await photosLocalDB.getStatus('asset-3');

    expect(result).toEqual({
      assetId: 'asset-3',
      status: 'pending',
      remoteFileId: null,
      syncedAt: null,
      deletedAt: null,
      errorMessage: null,
      attemptCount: 0,
      createdAt: 1713900000000,
      lastAttemptAt: null,
      modificationTime: null,
      fileName: null,
      fileSize: null,
      creationTime: null,
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
    });
  });

  test('when checking the status of a photo that has cached media info, then all media info fields are returned', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({
      asset_id: 'asset-4',
      status: 'pending',
      remote_file_id: null,
      synced_at: null,
      error_message: null,
      attempt_count: 0,
      created_at: 1713900000000,
      last_attempt_at: null,
      modification_time: null,
      file_name: 'photo.jpg',
      file_size: 204800,
      creation_time: 1714000000000,
      width: 3024,
      height: 4032,
      duration: 0,
      media_type: 'photo',
    });

    const result = await photosLocalDB.getStatus('asset-4');

    expect(result?.fileName).toBe('photo.jpg');
    expect(result?.fileSize).toBe(204800);
    expect(result?.creationTime).toBe(1714000000000);
    expect(result?.width).toBe(3024);
    expect(result?.height).toBe(4032);
    expect(result?.duration).toBe(0);
    expect(result?.mediaType).toBe('photo');
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
      deleted_at: null,
      error_message: null,
      attempt_count: 0,
      created_at: 1713900000000,
      last_attempt_at: 1714000000000,
      modification_time: 1714000000,
      file_name: null,
      file_size: null,
      creation_time: null,
      width: null,
      height: null,
      duration: null,
      media_type: null,
      is_live_photo: 0,
      paired_video_remote_file_id: null,
      paired_video_status: null,
      is_burst: 0,
      burst_id: null,
      burst_member_remote_file_ids: null,
      burst_member_count: null,
    });

    const result = await photosLocalDB.getStatus('asset-1');

    expect(result).toEqual({
      assetId: 'asset-1',
      status: 'synced',
      remoteFileId: 'remote-id',
      syncedAt: 1714000000000,
      deletedAt: null,
      errorMessage: null,
      attemptCount: 0,
      createdAt: 1713900000000,
      lastAttemptAt: 1714000000000,
      modificationTime: 1714000000,
      fileName: null,
      fileSize: null,
      creationTime: null,
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
    });
  });

  test('when checking the status of a photo that failed to sync, then the error details and attempt count are returned', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({
      asset_id: 'asset-2',
      status: 'error',
      remote_file_id: null,
      synced_at: null,
      deleted_at: null,
      error_message: 'Network timeout',
      attempt_count: 3,
      created_at: 1713900000000,
      last_attempt_at: 1714000000000,
      modification_time: null,
      file_name: null,
      file_size: null,
      creation_time: null,
      width: null,
      height: null,
      duration: null,
      media_type: null,
      is_live_photo: 0,
      paired_video_remote_file_id: null,
      paired_video_status: null,
      is_burst: 0,
      burst_id: null,
      burst_member_remote_file_ids: null,
      burst_member_count: null,
    });

    const result = await photosLocalDB.getStatus('asset-2');

    expect(result).toEqual({
      assetId: 'asset-2',
      status: 'error',
      remoteFileId: null,
      syncedAt: null,
      deletedAt: null,
      errorMessage: 'Network timeout',
      attemptCount: 3,
      createdAt: 1713900000000,
      lastAttemptAt: 1714000000000,
      modificationTime: null,
      fileName: null,
      fileSize: null,
      creationTime: null,
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
    });
  });

  test('when the database is reset, then all records are deleted', async () => {
    await photosLocalDB.reset();

    expect(mockSqlite.executeSql).toHaveBeenCalledWith('photos_sync.db', expect.stringContaining('DELETE FROM'));
  });

  test('when the database is initialized, then every table and index is created', async () => {
    await photosLocalDB.init();

    const statements = mockSqlite.executeSql.mock.calls.map(([, stmt]) => stmt as string);
    const createTableCalls = statements.filter((s) => s.includes('CREATE TABLE'));
    const createIndexCalls = statements.filter((s) => s.includes('CREATE INDEX'));
    expect(createTableCalls).toHaveLength(4);
    expect(createIndexCalls).toHaveLength(7);
  });
});

describe('photosLocalDB cloud asset methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (photosLocalDB as any).initPromise = null;
  });

  test('when a cloud asset is fetched by id and it exists, then all fields including the extended metadata are returned', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({
      remote_file_id: 'remote-1',
      device_id: 'device-1',
      folder_date: 1718000000000,
      file_name: 'photo.jpg',
      file_size: 2048,
      file_id: 'bridge-file-1',
      thumbnail_path: '/local/thumb.jpg',
      thumbnail_bucket_id: 'b1',
      thumbnail_bucket_file: 'f1',
      thumbnail_type: 'jpg',
      discovered_at: 1718100000000,
      plain_name: 'photo',
      extension: 'jpg',
      bucket: 'bucket-abc',
      folder_uuid: 'folder-uuid-1',
      creation_time_api: 1718000000000,
      modification_time: 1718050000000,
      updated_at: 1718060000000,
      status: 'EXISTS',
      encrypt_version: 'aes-2',
    });

    const result = await photosLocalDB.getCloudAssetById('remote-1');

    expect(result).not.toBeNull();
    expect(result?.plainName).toBe('photo');
    expect(result?.extension).toBe('jpg');
    expect(result?.bucket).toBe('bucket-abc');
    expect(result?.folderUuid).toBe('folder-uuid-1');
    expect(result?.creationTimeApi).toBe(1718000000000);
    expect(result?.modificationTime).toBe(1718050000000);
    expect(result?.updatedAt).toBe(1718060000000);
    expect(result?.status).toBe('EXISTS');
    expect(result?.encryptVersion).toBe('aes-2');
  });

  test('when a cloud asset is fetched by id and it does not exist, then null is returned', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce(null);

    const result = await photosLocalDB.getCloudAssetById('non-existent');

    expect(result).toBeNull();
  });

  test('when known cloud asset remote ids are looked up for a device/month, then rows with discoveredAt 0 are excluded from the query', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    await photosLocalDB.getCloudAssetRemoteIdsByDeviceAndMonth('device-1', 2024, 6);

    const [, stmt] = mockSqlite.getAllAsync.mock.calls[0];
    expect(stmt).toContain('discovered_at != 0');
  });

  test('when a cloud asset is upserted, then all its fields are passed to the database', async () => {
    await photosLocalDB.upsertCloudAsset({
      remoteFileId: 'remote-1',
      deviceId: 'device-1',
      folderDate: 1718000000000,
      fileName: 'photo.jpg',
      fileSize: 2048,
      fileId: 'bridge-file-1',
      thumbnailPath: null,
      thumbnailBucketId: 'bucket-1',
      thumbnailBucketFile: 'file-1',
      thumbnailType: 'jpg',
      discoveredAt: 1718100000000,
      uploadedAt: 1718200000000,
      isFavorite: false,
    });

    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(1);
    const [, , params] = mockSqlite.executeSql.mock.calls[0];
    expect(params).toEqual([
      'remote-1',
      'device-1',
      1718000000000,
      'photo.jpg',
      2048,
      'bridge-file-1',
      null,
      'bucket-1',
      'file-1',
      'jpg',
      1718100000000,
      null, // plainName
      null, // extension
      null, // bucket
      null, // folderUuid
      null, // creationTimeApi
      null, // modificationTime
      null, // updatedAt
      null, // status
      null, // encryptVersion
      0, // is_live_photo
      null, // live_photo_role
      null, // paired_remote_file_id
      null, // burst_role
      null, // burst_group_id
      1718200000000, // uploadedAt
      0, // is_favorite
    ]);
  });

  test('when a cloud asset is upserted with extended metadata, then all metadata fields are passed at the correct positions', async () => {
    await photosLocalDB.upsertCloudAsset({
      remoteFileId: 'remote-1',
      deviceId: 'device-1',
      folderDate: 1718000000000,
      fileName: 'photo.jpg',
      fileSize: 2048,
      fileId: 'bridge-file-1',
      thumbnailPath: null,
      thumbnailBucketId: 'bucket-1',
      thumbnailBucketFile: 'file-1',
      thumbnailType: 'jpg',
      discoveredAt: 1718100000000,
      plainName: 'photo',
      extension: 'jpg',
      bucket: 'bucket-abc',
      folderUuid: 'folder-uuid-1',
      creationTimeApi: 1718000000000,
      modificationTime: 1718050000000,
      updatedAt: 1718060000000,
      status: 'EXISTS',
      encryptVersion: 'aes-2',
      uploadedAt: 1718200000000,
      isFavorite: true,
    });

    const [, , params] = mockSqlite.executeSql.mock.calls[0];
    expect(params).toEqual([
      'remote-1',
      'device-1',
      1718000000000,
      'photo.jpg',
      2048,
      'bridge-file-1',
      null,
      'bucket-1',
      'file-1',
      'jpg',
      1718100000000,
      'photo', // plainName
      'jpg', // extension
      'bucket-abc', // bucket
      'folder-uuid-1', // folderUuid
      1718000000000, // creationTimeApi
      1718050000000, // modificationTime
      1718060000000, // updatedAt
      'EXISTS', // status
      'aes-2', // encryptVersion
      0, // is_live_photo
      null, // live_photo_role
      null, // paired_remote_file_id
      null, // burst_role
      null, // burst_group_id
      1718200000000, // uploadedAt
      1, // is_favorite
    ]);
  });

  test('when a cloud asset is upserted, then the cached thumbnail path is only kept if the thumbnail bucket file is unchanged', async () => {
    await photosLocalDB.upsertCloudAsset({
      remoteFileId: 'remote-1',
      deviceId: 'device-1',
      folderDate: 1718000000000,
      fileName: 'photo.jpg',
      fileSize: 2048,
      fileId: 'bridge-file-1',
      thumbnailPath: null,
      thumbnailBucketId: 'bucket-1',
      thumbnailBucketFile: 'file-1',
      thumbnailType: 'jpg',
      discoveredAt: 1718100000000,
      uploadedAt: 1718200000000,
      isFavorite: false,
    });

    const [, statement] = mockSqlite.executeSql.mock.calls[0];
    expect(statement as string).toContain('cloud_asset.thumbnail_bucket_file IS NOT excluded.thumbnail_bucket_file');
    expect(statement as string).toContain('THEN NULL');
  });

  test('when cached thumbnail refs are requested for a set of ids, then a map keyed by remote file id is returned', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([
      { remote_file_id: 'remote-1', thumbnail_path: '/local/thumb1.jpg', thumbnail_bucket_file: 'file-1' },
      { remote_file_id: 'remote-2', thumbnail_path: null, thumbnail_bucket_file: null },
    ]);

    const refs = await photosLocalDB.getCachedThumbnailRefs(['remote-1', 'remote-2']);

    expect(refs.get('remote-1')).toEqual({ thumbnailPath: '/local/thumb1.jpg', thumbnailBucketFile: 'file-1' });
    expect(refs.get('remote-2')).toEqual({ thumbnailPath: null, thumbnailBucketFile: null });
  });

  test('when cached thumbnail refs are requested for an empty id list, then no query is made', async () => {
    const refs = await photosLocalDB.getCachedThumbnailRefs([]);

    expect(refs.size).toBe(0);
    expect(mockSqlite.getAllAsync).not.toHaveBeenCalled();
  });

  test('when all cloud assets are fetched, then each database row is mapped to a typed entry', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([
      {
        remote_file_id: 'r1',
        device_id: 'd1',
        folder_date: 1718000000,
        file_name: 'a.jpg',
        file_size: 512,
        file_id: null,
        thumbnail_path: '/local/thumb.jpg',
        thumbnail_bucket_id: 'b1',
        thumbnail_bucket_file: 'f1',
        thumbnail_type: 'jpg',
        discovered_at: 1718100000,
        plain_name: null,
        extension: null,
        bucket: null,
        folder_uuid: null,
        creation_time_api: null,
        modification_time: null,
        updated_at: null,
        status: null,
        encrypt_version: null,
        is_live_photo: 0,
        live_photo_role: null,
        paired_remote_file_id: null,
        uploaded_at: 1718200000,
        is_favorite: 0,
      },
    ]);

    const result = await photosLocalDB.getAllCloudAssets();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      remoteFileId: 'r1',
      deviceId: 'd1',
      folderDate: 1718000000,
      fileName: 'a.jpg',
      fileSize: 512,
      fileId: null,
      thumbnailPath: '/local/thumb.jpg',
      thumbnailBucketId: 'b1',
      thumbnailBucketFile: 'f1',
      thumbnailType: 'jpg',
      discoveredAt: 1718100000,
      plainName: null,
      extension: null,
      bucket: null,
      folderUuid: null,
      creationTimeApi: null,
      modificationTime: null,
      updatedAt: null,
      status: null,
      encryptVersion: null,
      isLivePhoto: false,
      livePhotoRole: null,
      pairedRemoteFileId: null,
      uploadedAt: 1718200000,
      isFavorite: false,
    });
  });

  test('when cloud assets are fetched by range, then the from and to timestamps are passed as parameters', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    await photosLocalDB.getCloudAssetsByRange(1000, 2000);

    const [, stmt, params] = mockSqlite.getAllAsync.mock.calls[0];
    expect(stmt).not.toContain('device_id = ?');
    expect(params).toEqual([1000, 2000]);
  });

  test('when cloud assets are fetched by range with a device id, then only that device is queried', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    await photosLocalDB.getCloudAssetsByRange(1000, 2000, 'device-1');

    const [, stmt, params] = mockSqlite.getAllAsync.mock.calls[0];
    expect(stmt).toContain('device_id = ?');
    expect(params).toEqual([1000, 2000, 'device-1']);
  });

  test('when all cloud assets are fetched with a device id, then only that device is queried', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    await photosLocalDB.getAllCloudAssets('device-1');

    const [, stmt, params] = mockSqlite.getAllAsync.mock.calls[0];
    expect(stmt).toContain('device_id = ?');
    expect(params).toEqual(['device-1']);
  });

  test('when cloud assets are fetched with or without a device filter, then they are ordered by real capture time with a deterministic tiebreaker', async () => {
    mockSqlite.getAllAsync.mockResolvedValue([]);

    await photosLocalDB.getAllCloudAssets();
    await photosLocalDB.getAllCloudAssets('device-1');

    for (const [, stmt] of mockSqlite.getAllAsync.mock.calls) {
      expect(stmt).toContain('ORDER BY COALESCE(creation_time_api, folder_date) DESC, remote_file_id ASC');
    }
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

  test('when synced remote file ids are fetched, then the result is a set of all returned ids', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([{ remote_file_id: 'r1' }, { remote_file_id: 'r2' }]);

    const result = await photosLocalDB.getSyncedRemoteFileIds();

    expect(result).toEqual(new Set(['r1', 'r2']));
  });

  test('when there are no synced remote file ids, then an empty set is returned', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    const result = await photosLocalDB.getSyncedRemoteFileIds();

    expect(result).toEqual(new Set());
  });

  test('when fetching remote file ids, then assets with cloud deleted or deleted status are excluded from the query', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    await photosLocalDB.getSyncedRemoteFileIds();

    const [, sql] = mockSqlite.getAllAsync.mock.calls[0];
    expect(sql).toContain('status NOT IN (\'cloud_deleted\', \'deleted\')');
    expect(sql).not.toContain('status = \'synced\'');
  });

  describe('when fetching pending assets', () => {
    test('when pending assets are fetched, then pending and pending_edit assets are always included', async () => {
      mockSqlite.getAllAsync.mockResolvedValueOnce([]);

      await photosLocalDB.getPendingAssets();

      const [, sql] = mockSqlite.getAllAsync.mock.calls[0];
      expect(sql).toContain('status IN (\'pending\', \'pending_edit\')');
    });

    test('when pending assets are fetched, then error assets beyond the maximum attempt count are excluded', async () => {
      mockSqlite.getAllAsync.mockResolvedValueOnce([]);

      await photosLocalDB.getPendingAssets();

      const [, sql] = mockSqlite.getAllAsync.mock.calls[0];
      expect(sql).toContain('attempt_count < 5');
    });

    test('when pending assets are fetched, then error assets within the backoff window are excluded via a time check', async () => {
      mockSqlite.getAllAsync.mockResolvedValueOnce([]);

      await photosLocalDB.getPendingAssets();

      const [, sql] = mockSqlite.getAllAsync.mock.calls[0];
      expect(sql).toContain('last_attempt_at IS NOT NULL');
      expect(sql).toContain('last_attempt_at <');
      expect(sql).toContain('unixepoch()');
    });

    test('when pending assets are fetched, then the backoff grows with each failed attempt', async () => {
      mockSqlite.getAllAsync.mockResolvedValueOnce([]);

      await photosLocalDB.getPendingAssets();

      const [, sql] = mockSqlite.getAllAsync.mock.calls[0];
      expect(sql).toContain('CASE');
      expect(sql).toContain('0');
      expect(sql).toContain('30000');
      expect(sql).toContain('300000');
      expect(sql).toContain('1800000');
    });

    test('when pending assets are fetched, then synced, deleted and cloud deleted assets are excluded', async () => {
      mockSqlite.getAllAsync.mockResolvedValueOnce([]);

      await photosLocalDB.getPendingAssets();

      const [, sql] = mockSqlite.getAllAsync.mock.calls[0];
      expect(sql).not.toContain('\'synced\'');
      expect(sql).not.toContain('\'deleted\'');
      expect(sql).not.toContain('\'cloud_deleted\'');
    });

    test('when all remaining assets have failed and are within the backoff window, then no pending assets are returned', async () => {
      mockSqlite.getAllAsync.mockResolvedValueOnce([]);

      const result = await photosLocalDB.getPendingAssets();

      expect(result).toHaveLength(0);
    });

    test('when error assets have been reset to pending, then they are returned as pending assets', async () => {
      mockSqlite.getAllAsync.mockResolvedValueOnce([
        { asset_id: 'asset-1', status: 'pending', remote_file_id: null, is_burst: 0, burst_member_count: null },
        { asset_id: 'asset-2', status: 'pending', remote_file_id: null, is_burst: 0, burst_member_count: null },
      ]);

      const result = await photosLocalDB.getPendingAssets();

      expect(result).toHaveLength(2);
      expect(result.map((a) => a.assetId)).toEqual(['asset-1', 'asset-2']);
      expect(result.every((a) => a.status === 'pending')).toBe(true);
    });

    test('when error assets are reset to pending, then the reset query targets only error status rows', async () => {
      await photosLocalDB.resetErrorsToPending();

      const [, sql] = mockSqlite.executeSql.mock.calls[0];
      expect(sql).toContain('status = \'pending\'');
      expect(sql).toContain('WHERE status = \'error\'');
      expect(sql).toContain('last_attempt_at = NULL');
    });
  });

  describe('when counting assets with errors', () => {
    test('when there are assets in error status, then the count reflects all of them regardless of attempt count', async () => {
      mockSqlite.getAllAsync.mockResolvedValueOnce([{ count: 3 }]);

      const result = await photosLocalDB.getAssetUploadErroredCount();

      expect(result).toBe(3);
      const [, sql] = mockSqlite.getAllAsync.mock.calls[0];
      expect(sql).toContain('status = \'error\'');
    });

    test('when there are no assets in error status, then the count is zero', async () => {
      mockSqlite.getAllAsync.mockResolvedValueOnce([{ count: 0 }]);

      const result = await photosLocalDB.getAssetUploadErroredCount();

      expect(result).toBe(0);
    });

    test('when the database returns an empty result, then the count defaults to zero', async () => {
      mockSqlite.getAllAsync.mockResolvedValueOnce([]);

      const result = await photosLocalDB.getAssetUploadErroredCount();

      expect(result).toBe(0);
    });
  });

  describe('when checking whether the local asset_sync table has any state', () => {
    test('when the table has at least one row, then it returns true', async () => {
      mockSqlite.getFirstAsync.mockResolvedValueOnce({ result: 1 });

      const result = await photosLocalDB.hasAnyAssetSyncEntry();

      expect(result).toBe(true);
    });

    test('when the table is empty, then it returns false', async () => {
      mockSqlite.getFirstAsync.mockResolvedValueOnce({ result: 0 });

      const result = await photosLocalDB.hasAnyAssetSyncEntry();

      expect(result).toBe(false);
    });
  });

  describe('when exporting entries for the sync manifest', () => {
    test('when there are synced and cloud_deleted assets, then only those statuses are queried', async () => {
      mockSqlite.getAllAsync.mockResolvedValueOnce([]);

      await photosLocalDB.getManifestEntries();

      const [, sql] = mockSqlite.getAllAsync.mock.calls[0];
      expect(sql).toContain('status IN (\'synced\', \'cloud_deleted\')');
    });

    test('when a burst entry is exported, then its member remote file ids are parsed from JSON', async () => {
      mockSqlite.getAllAsync.mockResolvedValueOnce([
        {
          asset_id: 'asset-1',
          status: 'synced',
          remote_file_id: 'remote-1',
          modification_time: 111,
          file_name: 'IMG_1.jpg',
          creation_time: 222,
          width: 100,
          height: 200,
          duration: 0,
          media_type: 'photo',
          is_live_photo: 0,
          paired_video_remote_file_id: null,
          paired_video_status: null,
          is_burst: 1,
          burst_id: 'burst-1',
          burst_member_remote_file_ids: '["remote-2","remote-3"]',
          burst_member_count: 2,
        },
      ]);

      const result = await photosLocalDB.getManifestEntries();

      expect(result[0].burstMemberRemoteFileIds).toEqual(['remote-2', 'remote-3']);
      expect(result[0].isBurst).toBe(true);
    });
  });

  describe('when restoring entries from a sync manifest', () => {
    test('when there are no entries to restore, then no transaction is started', async () => {
      await photosLocalDB.restoreEntries([]);

      expect(mockSqlite.transaction).not.toHaveBeenCalled();
    });

    test('when restoring entries, then each one is inserted inside a single transaction', async () => {
      const executeSql = jest.fn();
      mockSqlite.transaction.mockImplementation(async (_name, scope) => {
        await scope({ executeSql });
      });

      await photosLocalDB.restoreEntries([
        {
          assetId: 'asset-1',
          status: 'synced',
          remoteFileId: 'remote-1',
          modificationTime: 111,
          fileName: 'IMG_1.jpg',
          creationTime: 222,
          width: 100,
          height: 200,
          duration: 0,
          mediaType: 'photo',
          isLivePhoto: false,
          pairedVideoRemoteFileId: null,
          pairedVideoStatus: null,
          isBurst: false,
          burstId: null,
          burstMemberRemoteFileIds: null,
          burstMemberCount: null,
        },
        {
          assetId: 'asset-2',
          status: 'cloud_deleted',
          remoteFileId: 'remote-2',
          modificationTime: 333,
          fileName: 'IMG_2.jpg',
          creationTime: 444,
          width: 50,
          height: 60,
          duration: 0,
          mediaType: 'photo',
          isLivePhoto: false,
          pairedVideoRemoteFileId: null,
          pairedVideoStatus: null,
          isBurst: false,
          burstId: null,
          burstMemberRemoteFileIds: null,
          burstMemberCount: null,
        },
      ]);

      expect(mockSqlite.transaction).toHaveBeenCalledTimes(1);
      expect(executeSql).toHaveBeenCalledTimes(2);
      const [, firstParams] = executeSql.mock.calls[0];
      expect(firstParams).toEqual([
        'asset-1',
        'synced',
        'remote-1',
        111,
        'IMG_1.jpg',
        222,
        100,
        200,
        0,
        'photo',
        0,
        null,
        null,
        0,
        null,
        null,
        null,
      ]);
    });
  });

  describe('synced-before cutoff', () => {
    test('when synced remote ids for a creation month are requested, then the cutoff is passed after the month range', async () => {
      await photosLocalDB.getSyncedRemoteIdsByCreationMonth(2024, 6, 1714000000000);

      expect(mockSqlite.getAllAsync).toHaveBeenCalledTimes(1);
      const [dbName, stmt, params] = mockSqlite.getAllAsync.mock.calls[0];
      expect(dbName).toBe('photos_sync.db');
      expect(stmt).toContain('synced_at');
      expect(params).toEqual([new Date(2024, 5, 1).getTime(), new Date(2024, 6, 1).getTime(), 1714000000000]);
    });

    test('when synced months are requested, then the cutoff is passed as the only parameter', async () => {
      await photosLocalDB.getSyncedMonths(1714000000000);

      expect(mockSqlite.getAllAsync).toHaveBeenCalledWith(
        'photos_sync.db',
        expect.stringContaining('synced_at'),
        [1714000000000],
      );
    });

    test('when synced assets are reset to pending, then the cutoff is passed as the only parameter', async () => {
      await photosLocalDB.resetSyncedToPending(1714000000000);

      expect(mockSqlite.executeSql).toHaveBeenCalledWith(
        'photos_sync.db',
        expect.stringContaining('synced_at'),
        [1714000000000],
      );
    });
  });
});

describe('photosLocalDB month and day folder tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (photosLocalDB as any).initPromise = null;
  });

  test('when months are recorded, then each one is written with its folder identifier', async () => {
    await photosLocalDB.upsertMonthSyncEntries([
      { deviceId: 'device-1', year: 2026, month: 9, monthFolderUuid: 'month-uuid-1' },
      { deviceId: 'device-1', year: 2026, month: 8, monthFolderUuid: 'month-uuid-2' },
    ]);

    const [, stmt, paramsList] = mockSqlite.executeBulk.mock.calls[0];
    expect(stmt).toContain('photo_month_sync');
    expect(paramsList).toEqual([
      ['device-1', 2026, 9, 'month-uuid-1'],
      ['device-1', 2026, 8, 'month-uuid-2'],
    ]);
  });

  test('when no months are recorded, then the database is left untouched', async () => {
    await photosLocalDB.upsertMonthSyncEntries([]);

    expect(mockSqlite.executeBulk).not.toHaveBeenCalled();
  });

  test('when a month folder is recorded again with a different identifier, then its progress mark is cleared', async () => {
    await photosLocalDB.upsertMonthSyncEntries([
      { deviceId: 'device-1', year: 2026, month: 9, monthFolderUuid: 'month-uuid-1' },
    ]);

    const [, stmt] = mockSqlite.executeBulk.mock.calls[0];
    const collapsed = (stmt as string).replace(/\s+/g, ' ');
    for (const mark of ['last_server_updated_at', 'last_delta_check_at', 'last_full_sync_at']) {
      expect(collapsed).toContain(`${mark} = CASE`);
    }
    expect(collapsed).toContain('ELSE NULL');
  });

  test('when a month is forgotten, then its day folders are forgotten with it', async () => {
    await photosLocalDB.deleteMonthSyncEntry('device-1', 2026, 9);

    const statements = mockSqlite.executeSql.mock.calls.map(([, stmt]) => stmt as string);
    expect(statements.some((stmt) => stmt.includes('DELETE FROM photo_month_sync'))).toBe(true);
    expect(statements.some((stmt) => stmt.includes('DELETE FROM photo_day_folder'))).toBe(true);
  });

  test('when day folders are recorded, then each one is keyed by its own identifier', async () => {
    await photosLocalDB.upsertDayFolders([
      { dayFolderUuid: 'day-uuid-1', deviceId: 'device-1', year: 2026, month: 9, day: 1 },
      { dayFolderUuid: 'day-uuid-2', deviceId: 'device-1', year: 2026, month: 9, day: 2 },
    ]);

    const [, stmt, paramsList] = mockSqlite.executeBulk.mock.calls[0];
    expect(stmt).toContain('photo_day_folder');
    expect(paramsList).toEqual([
      ['day-uuid-1', 'device-1', 2026, 9, 1],
      ['day-uuid-2', 'device-1', 2026, 9, 2],
    ]);
  });

  test('when two day folders of the same month are named so they resolve to the same day, then both are kept', async () => {
    await photosLocalDB.upsertDayFolders([
      { dayFolderUuid: 'day-uuid-1', deviceId: 'device-1', year: 2026, month: 9, day: 1 },
      { dayFolderUuid: 'day-uuid-2', deviceId: 'device-1', year: 2026, month: 9, day: 1 },
    ]);

    const [, , paramsList] = mockSqlite.executeBulk.mock.calls[0];
    expect(paramsList).toHaveLength(2);
    expect(paramsList[0][0]).toBe('day-uuid-1');
    expect(paramsList[1][0]).toBe('day-uuid-2');
  });

  test('when the day folders are already known, then nothing is seeded from the local cloud index', async () => {
    mockSqlite.getFirstAsync.mockResolvedValue({ total: 12 });

    const seeded = await photosLocalDB.seedDayFoldersFromCloudAssets();

    expect(seeded).toBe(0);
    expect(mockSqlite.executeBulk).not.toHaveBeenCalled();
  });

  test('when no day folders are known yet, then they are seeded from the local cloud index using the local calendar day', async () => {
    mockSqlite.getFirstAsync.mockResolvedValue({ total: 0 });
    const folderDate = new Date(2026, 8, 15).getTime();
    mockSqlite.getAllAsync.mockResolvedValue([
      { remote_file_id: 'file-1', device_id: 'device-1', folder_date: folderDate, folder_uuid: 'day-uuid-1' },
      { remote_file_id: 'file-2', device_id: 'device-1', folder_date: folderDate, folder_uuid: 'day-uuid-1' },
      { remote_file_id: 'file-3', device_id: 'device-1', folder_date: folderDate, folder_uuid: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);

    const seeded = await photosLocalDB.seedDayFoldersFromCloudAssets();

    expect(seeded).toBe(1);
    const [, , paramsList] = mockSqlite.executeBulk.mock.calls[0];
    expect(paramsList).toEqual([['day-uuid-1', 'device-1', 2026, 9, 15]]);
  });
  test('when no day folders are given, then the cloud index is not queried', async () => {
    const result = await photosLocalDB.getCloudAssetsByFolderUuids([]);

    expect(result).toEqual([]);
    expect(mockSqlite.getAllAsync).not.toHaveBeenCalled();
  });

  test('when reading the photos of some day folders, then paired videos and burst members are included', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    await photosLocalDB.getCloudAssetsByFolderUuids(['day-uuid-1', 'day-uuid-2']);

    const [, stmt, params] = mockSqlite.getAllAsync.mock.calls[0];
    expect(stmt).toContain('folder_uuid IN (?, ?)');
    expect(stmt).not.toContain('live_photo_role != \'paired_video\'');
    expect(stmt).not.toContain('burst_role != \'member\'');
    expect(params).toEqual(['day-uuid-1', 'day-uuid-2']);
  });

  test('when reading the photos of more day folders than fit in one query, then every folder is still covered', async () => {
    const folderUuids = Array.from({ length: 301 }, (_, i) => `day-uuid-${i}`);
    mockSqlite.getAllAsync.mockResolvedValue([]);

    await photosLocalDB.getCloudAssetsByFolderUuids(folderUuids);

    expect(mockSqlite.getAllAsync).toHaveBeenCalledTimes(2);
    const passed = mockSqlite.getAllAsync.mock.calls.flatMap((call) => call[2] as string[]);
    expect(passed).toEqual(expect.arrayContaining(folderUuids));
    expect(passed).toHaveLength(301);
  });

  test('when a device is forgotten, then its photos and its known month and day folders are all removed', async () => {
    await photosLocalDB.deleteDeviceData('device-1');

    const statements = mockSqlite.executeSql.mock.calls.map(([, stmt]) => stmt as string);
    expect(statements.some((stmt) => stmt.includes('DELETE FROM cloud_asset'))).toBe(true);
    expect(statements.some((stmt) => stmt.includes('DELETE FROM photo_month_sync'))).toBe(true);
    expect(statements.some((stmt) => stmt.includes('DELETE FROM photo_day_folder'))).toBe(true);
    expect(mockSqlite.executeSql.mock.calls.every(([, , params]) => params?.[0] === 'device-1')).toBe(true);
  });

  test('when a month is recorded as fully synced, then the moment and the folder it was read from are stored', async () => {
    await photosLocalDB.markMonthFullySynced({
      deviceId: 'device-1',
      year: 2026,
      month: 9,
      monthFolderUuid: 'month-uuid',
      fullySyncedAt: 1788350000000,
    });

    const [, stmt, params] = mockSqlite.executeSql.mock.calls[0];
    expect(stmt).toContain('last_full_sync_at');
    expect(params).toEqual(['device-1', 2026, 9, 'month-uuid', 1788350000000]);
  });

  test('when a month has never been fully synced, then it has no timestamp', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({ last_full_sync_at: null });

    const result = await photosLocalDB.getMonthLastFullSyncAt('device-1', 2026, 9);

    expect(result).toBeNull();
  });

  test('when a month has been fully synced, then its timestamp is returned', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({ last_full_sync_at: 1788350000000 });

    const result = await photosLocalDB.getMonthLastFullSyncAt('device-1', 2026, 9);

    expect(result).toBe(1788350000000);
  });
});
