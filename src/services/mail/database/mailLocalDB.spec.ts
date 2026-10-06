import sqliteService from '../../SqliteService';
import { MAIL_DB_NAME, mailLocalDB } from './mailLocalDB';
import mailEmailTable from './tables/mail_email';

jest.mock('../../SqliteService', () => ({
  __esModule: true,
  default: {
    open: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    executeSql: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn().mockResolvedValue(null),
  },
}));

const mockSqliteService = sqliteService as jest.Mocked<typeof sqliteService>;

describe('Deleting the messages Mail keeps on the device', () => {
  beforeEach(() => jest.clearAllMocks());

  test('when the cached messages are deleted, then the whole database file is removed', async () => {
    await mailLocalDB.resetDatabase();

    expect(mockSqliteService.delete).toHaveBeenCalledWith(MAIL_DB_NAME);
  });

  test('when the messages are deleted on a device where mail was never opened, then the database is created first so it can be removed', async () => {
    await mailLocalDB.resetDatabase();

    expect(mockSqliteService.open).toHaveBeenCalledWith(MAIL_DB_NAME);
    expect(mockSqliteService.open.mock.invocationCallOrder[0]).toBeLessThan(
      mockSqliteService.delete.mock.invocationCallOrder[0],
    );
  });

  test('when a message is read after the deletion, then the database is opened again instead of failing', async () => {
    await mailLocalDB.resetDatabase();
    jest.clearAllMocks();

    await expect(mailLocalDB.getCachedEmail('an-email-id')).resolves.toBeNull();

    expect(mockSqliteService.open).toHaveBeenCalledWith(MAIL_DB_NAME);
    expect(mockSqliteService.executeSql).toHaveBeenCalledWith(MAIL_DB_NAME, mailEmailTable.statements.createTable);
  });

  test('when two messages are read after the deletion, then the database is only opened once', async () => {
    await mailLocalDB.resetDatabase();
    jest.clearAllMocks();

    await mailLocalDB.getCachedEmail('an-email-id');
    await mailLocalDB.getCachedEmail('another-email-id');

    expect(mockSqliteService.open).toHaveBeenCalledTimes(1);
  });
});
