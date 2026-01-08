import * as SQLite from 'expo-sqlite';

type SQLiteDatabase = SQLite.SQLiteDatabase;

class SQLiteService {
  private readonly pool: Record<string, SQLiteDatabase>;

  constructor() {
    this.pool = {};
  }

  public async open(name: string) {
    const db = await SQLite.openDatabaseAsync(name);
    this.pool[name] = db;
  }

  public async close(name: string) {
    if (this.pool[name]) {
      await this.pool[name].closeAsync();
      delete this.pool[name];
    }
  }

  public async delete(name: string) {
    if (this.pool[name]) {
      await this.pool[name].closeAsync();
      delete this.pool[name];
    }
    await SQLite.deleteDatabaseAsync(name);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async executeSql(name: string, statement: string, params?: any[]) {
    if (!this.pool[name]) {
      this.throwDatabaseNotFound(name);
    }

    const result = await this.pool[name].runAsync(statement, params || []);
    return [result];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getAllAsync<T>(name: string, statement: string, params?: any[]): Promise<T[]> {
    if (!this.pool[name]) {
      this.throwDatabaseNotFound(name);
    }

    return await this.pool[name].getAllAsync<T>(statement, params || []);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getFirstAsync<T>(name: string, statement: string, params?: any[]): Promise<T | null> {
    if (!this.pool[name]) {
      this.throwDatabaseNotFound(name);
    }

    return await this.pool[name].getFirstAsync<T>(statement, params || []);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async transaction(name: string, scope: (t: any) => void | Promise<void>) {
    if (!this.pool[name]) {
      this.throwDatabaseNotFound(name);
    }

    await this.pool[name].withTransactionAsync(async () => {
      const txWrapper = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        executeSql: async (statement: string, params?: any[]) => {
          return await this.pool[name].runAsync(statement, params || []);
        },
      };

      await scope(txWrapper);
    });
  }

  private throwDatabaseNotFound(name: string) {
    throw new Error(`SQLiteService - database with name '${name}' not found`);
  }
}

const sqliteService = new SQLiteService();
export default sqliteService;
