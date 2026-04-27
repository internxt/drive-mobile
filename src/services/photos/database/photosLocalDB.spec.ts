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

  test('when init runs, then it opens the DB and ensures the table and index exist', async () => {
    await photosLocalDB.init();

    expect(mockSqlite.open).toHaveBeenCalledWith('photos_sync.db');
    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(2);
  });

  test('when init runs a second time, then it is a no-op', async () => {
    await photosLocalDB.init();
    jest.clearAllMocks(); // Clear calls from the first init
    await photosLocalDB.init();

    expect(mockSqlite.open).not.toHaveBeenCalled();
    expect(mockSqlite.executeSql).not.toHaveBeenCalled();
  });

  test('when markPending runs, then it upserts to pending and never overwrites synced', async () => {
    await photosLocalDB.markPending('asset-1');

    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(1);
    const [, stmt, params] = mockSqlite.executeSql.mock.calls[0];
    expect(stmt).toContain('\'pending\'');
    expect(stmt).toContain('status != \'synced\'');
    expect(params).toEqual(['asset-1']);
  });

  test('when markSynced runs, then it upserts the asset with status synced and remoteFileId using SQL timestamps', async () => {
    await photosLocalDB.markSynced('asset-1', 'remote-file-id');

    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(1);
    const [, stmt, params] = mockSqlite.executeSql.mock.calls[0];
    expect(stmt).toContain('\'synced\'');
    expect(stmt).toContain('unixepoch()');
    expect(params).toEqual(['asset-1', 'remote-file-id']);
  });

  test('when markError runs without a message, then it upserts the asset with status error and null message', async () => {
    await photosLocalDB.markError('asset-2');

    expect(mockSqlite.executeSql).toHaveBeenCalledTimes(1);
    const [, stmt, params] = mockSqlite.executeSql.mock.calls[0];
    expect(stmt).toContain('\'error\'');
    expect(params).toEqual(['asset-2', null]);
  });

  test('when markError runs with a message, then it passes the message as a parameter', async () => {
    await photosLocalDB.markError('asset-2', 'Network timeout');

    const [, , params] = mockSqlite.executeSql.mock.calls[0];
    expect(params).toEqual(['asset-2', 'Network timeout']);
  });

  test('when markError runs, then the statement increments attempt_count and guards against overwriting synced', async () => {
    await photosLocalDB.markError('asset-2');

    const [, stmt] = mockSqlite.executeSql.mock.calls[0];
    expect(stmt).toContain('attempt_count + 1');
    expect(stmt).toContain('status != \'synced\'');
  });

  test('when getSyncedIds runs, then the query filters by status synced', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    await photosLocalDB.getSyncedIds(['asset-1']);

    const [, stmt] = mockSqlite.getAllAsync.mock.calls[0];
    expect(stmt).toContain('status = \'synced\'');
  });

  test('when getSyncedIds runs with exactly 300 ids, then it queries the DB in exactly 1 batch', async () => {
    const ids = Array.from({ length: 300 }, (_, i) => `asset-${i}`);
    mockSqlite.getAllAsync.mockResolvedValue([]);

    await photosLocalDB.getSyncedIds(ids);

    expect(mockSqlite.getAllAsync).toHaveBeenCalledTimes(1);
  });

  test('when getSyncedIds runs with 301 ids, then it queries the DB in 2 batches', async () => {
    const ids = Array.from({ length: 301 }, (_, i) => `asset-${i}`);
    mockSqlite.getAllAsync.mockResolvedValue([]);

    await photosLocalDB.getSyncedIds(ids);

    expect(mockSqlite.getAllAsync).toHaveBeenCalledTimes(2);
  });

  test('when getSyncedIds runs with a list of ids, then it returns only the synced ones', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([{ asset_id: 'asset-1' }, { asset_id: 'asset-3' }]);

    const result = await photosLocalDB.getSyncedIds(['asset-1', 'asset-2', 'asset-3']);

    expect(result).toEqual(new Set(['asset-1', 'asset-3']));
  });

  test('when getSyncedIds runs and no assets are synced, then it returns an empty set', async () => {
    mockSqlite.getAllAsync.mockResolvedValueOnce([]);

    const result = await photosLocalDB.getSyncedIds(['asset-1', 'asset-2']);

    expect(result).toEqual(new Set());
  });

  test('when getSyncedIds runs with an empty list, then it returns an empty set without querying the DB', async () => {
    const result = await photosLocalDB.getSyncedIds([]);

    expect(mockSqlite.getAllAsync).not.toHaveBeenCalled();
    expect(result).toEqual(new Set());
  });

  test('when getSyncedIds runs with 650 ids, then it queries the DB in 3 batches of at most 300', async () => {
    const ids = Array.from({ length: 650 }, (_, i) => `asset-${i}`);
    mockSqlite.getAllAsync.mockResolvedValue([]);

    await photosLocalDB.getSyncedIds(ids);

    expect(mockSqlite.getAllAsync).toHaveBeenCalledTimes(3);
  });

  test('when getStatus runs and the asset is pending, then it returns the pending entry', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({
      asset_id: 'asset-3',
      status: 'pending',
      remote_file_id: null,
      synced_at: null,
      error_message: null,
      attempt_count: 0,
      created_at: 1713900000000,
      last_attempt_at: null,
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
    });
  });

  test('when getStatus runs and the asset is not in the DB, then it returns null', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce(null);

    const result = await photosLocalDB.getStatus('unknown-asset');

    expect(result).toBeNull();
  });

  test('when getStatus runs and a synced asset exists, then it returns the fully mapped entry', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({
      asset_id: 'asset-1',
      status: 'synced',
      remote_file_id: 'remote-id',
      synced_at: 1714000000000,
      error_message: null,
      attempt_count: 0,
      created_at: 1713900000000,
      last_attempt_at: 1714000000000,
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
    });
  });

  test('when getStatus runs and the asset has errors, then it returns the error details', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({
      asset_id: 'asset-2',
      status: 'error',
      remote_file_id: null,
      synced_at: null,
      error_message: 'Network timeout',
      attempt_count: 3,
      created_at: 1713900000000,
      last_attempt_at: 1714000000000,
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
    });
  });

  test('when reset runs, then it deletes all records from the DB', async () => {
    await photosLocalDB.reset();

    expect(mockSqlite.executeSql).toHaveBeenCalledWith('photos_sync.db', expect.stringContaining('DELETE FROM'));
  });
});
