import * as SQLite from 'expo-sqlite';

type SQLiteDatabase = SQLite.SQLiteDatabase;

class SQLiteService {
  private readonly pool: Record<string, SQLiteDatabase>;
  private readonly queues: Record<string, Promise<unknown>>;

  constructor() {
    this.pool = {};
    this.queues = {};
  }

  // expo-sqlite's single connection isn't safe under concurrent statement execution:
  // concurrent runAsync/getAllAsync calls on the same SQLiteDatabase can race and throw
  // "Cannot use shared object that was already released".
  // Serialize per DB name so only one statement runs against a given connection at a time.
  private enqueue<T>(name: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues[name] ?? Promise.resolve();
    const run = previous.then(task, task);
    this.queues[name] = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
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
    delete this.queues[name];
  }

  public async delete(name: string) {
    if (this.pool[name]) {
      await this.pool[name].closeAsync();
      delete this.pool[name];
    }
    delete this.queues[name];
    await SQLite.deleteDatabaseAsync(name);
  }

  public async executeSql(name: string, statement: string, params?: any[]) {
    if (!this.pool[name]) {
      this.throwDatabaseNotFound(name);
    }

    return this.enqueue(name, async () => {
      const result = await this.pool[name].runAsync(statement, params || []);
      return [result];
    });
  }

  public async getAllAsync<T>(name: string, statement: string, params?: any[]): Promise<T[]> {
    if (!this.pool[name]) {
      this.throwDatabaseNotFound(name);
    }

    return this.enqueue(name, () => this.pool[name].getAllAsync<T>(statement, params || []));
  }

  public async getFirstAsync<T>(name: string, statement: string, params?: any[]): Promise<T | null> {
    if (!this.pool[name]) {
      this.throwDatabaseNotFound(name);
    }

    return this.enqueue(name, () => this.pool[name].getFirstAsync<T>(statement, params || []));
  }

  /**
   * Runs `statement` once per row of `paramsList` by preparing it a single time and reusing
   * it, inside one transaction. Use for bulk writes of the same statement instead of firing
   * one `executeSql` per row.
   *
   * @param name - DB name, as passed to `open`.
   * @param statement - SQL with `?` placeholders, run once per entry in `paramsList`.
   * @param paramsList - Bind params for each execution, in order. No-ops on an empty list.
   */
  public async executeBulk(name: string, statement: string, paramsList: any[][]): Promise<void> {
    if (!this.pool[name]) {
      this.throwDatabaseNotFound(name);
    }
    if (paramsList.length === 0) {
      return;
    }

    return this.enqueue(name, () =>
      this.pool[name].withTransactionAsync(async () => {
        const prepared = await this.pool[name].prepareAsync(statement);
        try {
          for (const params of paramsList) {
            await prepared.executeAsync(params);
          }
        } finally {
          await prepared.finalizeAsync();
        }
      }),
    );
  }

  public async transaction(name: string, scope: (t: any) => void | Promise<void>) {
    if (!this.pool[name]) {
      this.throwDatabaseNotFound(name);
    }

    return this.enqueue(name, () =>
      this.pool[name].withTransactionAsync(async () => {
        const txWrapper = {
          executeSql: async (statement: string, params?: any[]) => {
            return await this.pool[name].runAsync(statement, params || []);
          },
        };

        await scope(txWrapper);
      }),
    );
  }

  private throwDatabaseNotFound(name: string) {
    throw new Error(`SQLiteService - database with name '${name}' not found`);
  }
}

const sqliteService = new SQLiteService();
export default sqliteService;
