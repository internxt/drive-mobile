import SQLite, { Location, SQLiteDatabase, Transaction } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

const IOS_LOCATION: Location = 'default';

class SQLiteService {
  private readonly pool: Record<string, SQLiteDatabase>;

  constructor() {
    this.pool = {};
  }

  public async open(name: string) {
    const db = await SQLite.openDatabase({ name, location: IOS_LOCATION });

    this.pool[name] = db;
  }

  public async close(name: string) {
    if (this.pool[name]) {
      await this.pool[name].close();
      delete this.pool[name];
    }
  }

  public async delete(name: string) {
    await SQLite.deleteDatabase({ name, location: IOS_LOCATION });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async executeSql(name: string, statement: string, params?: any[]) {
    if (!this.pool[name]) {
      this.throwDatabaseNotFound(name);
    }

    return this.pool[name].executeSql(statement, params);
  }

  public async transaction(name: string, scope: (t: Transaction) => void) {
    if (!this.pool[name]) {
      this.throwDatabaseNotFound(name);
    }

    return this.pool[name].transaction(scope);
  }

  private throwDatabaseNotFound(name: string) {
    throw new Error(`SQLiteService - database with name '${name}' not found`);
  }
}

const sqliteService = new SQLiteService();
export default sqliteService;
