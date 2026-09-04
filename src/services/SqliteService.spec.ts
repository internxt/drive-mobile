import * as SQLite from 'expo-sqlite';
import sqliteService from './SqliteService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedOpenDatabaseAsync = SQLite.openDatabaseAsync as jest.Mock<any>;

const getOpenedDb = async (callIndex: number) => mockedOpenDatabaseAsync.mock.results[callIndex].value;

describe('SqliteService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when two calls run against the same DB, then the second does not start until the first settles', async () => {
    await sqliteService.open('photos_sync.db');
    const db = await getOpenedDb(0);

    const order: string[] = [];
    let resolveFirst: () => void = () => undefined;
    db.runAsync.mockImplementationOnce(async () => {
      order.push('first-start');
      await new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      order.push('first-end');
    });
    db.runAsync.mockImplementationOnce(async () => {
      order.push('second-start');
    });

    const first = sqliteService.executeSql('photos_sync.db', 'UPDATE test SET a = 1');
    const second = sqliteService.executeSql('photos_sync.db', 'UPDATE test SET a = 2');

    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual(['first-start']);

    resolveFirst();
    await Promise.all([first, second]);

    expect(order).toEqual(['first-start', 'first-end', 'second-start']);
  });

  test('when a queued call fails, then the next queued call for the same DB still runs', async () => {
    await sqliteService.open('photos_sync.db');
    const db = await getOpenedDb(0);

    db.runAsync.mockRejectedValueOnce(new Error('boom'));
    db.runAsync.mockResolvedValueOnce(undefined);

    await expect(sqliteService.executeSql('photos_sync.db', 'BAD SQL')).rejects.toThrow('boom');
    await expect(sqliteService.executeSql('photos_sync.db', 'GOOD SQL')).resolves.toBeDefined();
  });

  test('when calls target different DB names, then they are not serialized against each other', async () => {
    await sqliteService.open('photos_sync.db');
    await sqliteService.open('drive.db');
    const photosDb = await getOpenedDb(0);
    const driveDb = await getOpenedDb(1);

    let releasePhotos: () => void = () => undefined;
    photosDb.runAsync.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releasePhotos = resolve;
        }),
    );
    driveDb.runAsync.mockResolvedValueOnce(undefined);

    const photosCall = sqliteService.executeSql('photos_sync.db', 'UPDATE test SET a = 1');
    await sqliteService.executeSql('drive.db', 'UPDATE test SET a = 2');

    // The drive.db call completed even though the photos_sync.db call is still pending —
    // proof the two DBs don't share a queue.
    expect(driveDb.runAsync).toHaveBeenCalledTimes(1);

    releasePhotos();
    await photosCall;
  });

  test('when the database is closed, then its queue is cleared so a later call to the same name starts fresh', async () => {
    await sqliteService.open('photos_sync.db');
    await sqliteService.close('photos_sync.db');
    await sqliteService.open('photos_sync.db');
    const db = await getOpenedDb(1);

    await expect(sqliteService.executeSql('photos_sync.db', 'SELECT 1')).resolves.toBeDefined();
    expect(db.runAsync).toHaveBeenCalledTimes(1);
  });

  test('when executeBulk runs, then it prepares the statement once and executes it once per row', async () => {
    await sqliteService.open('photos_sync.db');
    const db = await getOpenedDb(0);

    await sqliteService.executeBulk('photos_sync.db', 'INSERT INTO asset_sync VALUES (?)', [['a'], ['b'], ['c']]);

    expect(db.prepareAsync).toHaveBeenCalledTimes(1);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    const statement = await db.prepareAsync.mock.results[0].value;
    expect(statement.executeAsync).toHaveBeenCalledTimes(3);
    expect(statement.executeAsync).toHaveBeenNthCalledWith(1, ['a']);
    expect(statement.executeAsync).toHaveBeenNthCalledWith(3, ['c']);
    expect(statement.finalizeAsync).toHaveBeenCalledTimes(1);
  });

  test('when executeBulk is called with an empty list, then it does not touch the database', async () => {
    await sqliteService.open('photos_sync.db');
    const db = await getOpenedDb(0);

    await sqliteService.executeBulk('photos_sync.db', 'INSERT INTO asset_sync VALUES (?)', []);

    expect(db.prepareAsync).not.toHaveBeenCalled();
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });

  test('when the database was never opened, then executeSql throws instead of touching a connection', async () => {
    await expect(sqliteService.executeSql('unknown.db', 'SELECT 1')).rejects.toThrow(
      'SQLiteService - database with name \'unknown.db\' not found',
    );
  });
});
