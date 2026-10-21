import sqliteService from '../../SqliteService';
import { driveLocalDB } from './driveLocalDB';

jest.mock('../../SqliteService', () => ({
  __esModule: true,
  default: {
    open: jest.fn().mockResolvedValue(undefined),
    executeSql: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    transaction: jest.fn(),
  },
}));

jest.mock('../logger', () => ({
  driveLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockSqlite = sqliteService as jest.Mocked<typeof sqliteService>;

const runStatements = () => mockSqlite.executeSql.mock.calls.map(([, statement]) => statement as string);

describe('Opening the local Drive database', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when the device still has the tables from before, then they are dropped, created again and the new version is saved', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({ user_version: 0 });

    await driveLocalDB.init();

    const statements = runStatements();
    const dropIndexes = statements.flatMap((statement, index) => (statement.startsWith('DROP TABLE') ? [index] : []));
    const createIndexes = statements.flatMap((statement, index) =>
      statement.includes('CREATE TABLE IF NOT EXISTS') ? [index] : [],
    );
    expect(dropIndexes).toHaveLength(2);
    expect(createIndexes).toHaveLength(2);
    expect(Math.max(...dropIndexes)).toBeLessThan(Math.min(...createIndexes));
    expect(statements[statements.length - 1]).toBe('PRAGMA user_version = 1;');
  });

  test('when the app is installed for the first time, then the tables are created and the version is saved', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce(null);

    await driveLocalDB.init();

    const statements = runStatements();
    expect(statements.filter((statement) => statement.includes('CREATE TABLE IF NOT EXISTS'))).toHaveLength(2);
    expect(statements[statements.length - 1]).toBe('PRAGMA user_version = 1;');
  });

  test('when the tables are already up to date, then nothing is dropped', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({ user_version: 1 });

    await driveLocalDB.init();

    const statements = runStatements();
    expect(statements.some((statement) => statement.startsWith('DROP TABLE'))).toBe(false);
    expect(statements.some((statement) => statement.startsWith('PRAGMA user_version ='))).toBe(false);
  });

  test('when the new tables are created, then no column keeps the old numeric identifiers', async () => {
    mockSqlite.getFirstAsync.mockResolvedValueOnce({ user_version: 0 });

    await driveLocalDB.init();

    const createStatements = runStatements().filter((statement) => statement.includes('CREATE TABLE'));
    for (const createStatement of createStatements) {
      expect(createStatement).toContain('uuid TEXT NOT NULL');
      expect(createStatement).not.toMatch(/\bid INTEGER\b/);
      expect(createStatement).not.toContain('parent_id');
    }
  });
});

describe('Keeping Drive items in the local database', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when an item is deleted, then only the row of that item is removed', async () => {
    await driveLocalDB.deleteItem({ uuid: 'file-uuid-1' });

    expect(mockSqlite.executeSql).toHaveBeenCalledWith('drive.db', expect.stringContaining('WHERE uuid = ?'), [
      'file-uuid-1',
    ]);
  });

  test('when a new folder is saved, then it is stored together with the folder that holds it', async () => {
    await driveLocalDB.saveFolderContent(
      { uuid: 'folder-uuid-1', parentUuid: 'parent-uuid-1', name: 'Documents', updatedAt: '2025-02-16' },
      [],
    );

    const insertCall = mockSqlite.executeSql.mock.calls.find(([, statement]) =>
      (statement as string).startsWith('INSERT INTO folder_record'),
    );
    expect(insertCall?.[2]).toStrictEqual([
      'folder-uuid-1',
      'parent-uuid-1',
      'Documents',
      '2025-02-16',
      expect.any(String),
    ]);
  });

  test('when a file is saved, then it is stored under the folder that holds it', async () => {
    const transactionStatements = jest.fn();
    mockSqlite.transaction.mockImplementationOnce(async (_name, scope) => scope({ executeSql: transactionStatements }));

    await driveLocalDB.saveItems([
      {
        uuid: 'file-uuid-1',
        name: 'report',
        type: 'pdf',
        isFolder: false,
        folderUuid: 'folder-uuid-1',
        createdAt: '2025-02-16',
        updatedAt: '2025-02-16',
      },
    ]);

    expect(transactionStatements).toHaveBeenCalledWith(expect.stringContaining('"report", "folder-uuid-1", '));
  });

  test('when the content of a folder is read, then only the items inside that folder are asked', async () => {
    await driveLocalDB.getDriveItems('folder-uuid-1');

    expect(mockSqlite.getAllAsync).toHaveBeenCalledWith('drive.db', expect.stringContaining('WHERE parent_uuid = ?'), [
      'folder-uuid-1',
    ]);
  });
});
