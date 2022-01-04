import SQLite, { Location, SQLiteDatabase, Transaction } from 'react-native-sqlite-storage';
import { PhotoId } from '@internxt/sdk/dist/photos';
import { Photo, PhotoStatus } from '../photosSync/types';
import photos from './tables/photos';
import syncDates from './tables/syncDates';

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

  public async resetDatabase() {
    await this.pool['photos.db'].executeSql(photos.statements.dropTable);
    await this.pool['photos.db'].executeSql(syncDates.statements.dropTable);
  }

  public async resetSyncDates() {
    await this.pool['photos.db'].executeSql(syncDates.statements.dropTable);
  }

  public async createPhotosTableIfNotExists() {
    return this.pool['photos.db'].executeSql(photos.statements.createTable);
  }

  public async createSyncDatesTableIfNotExists() {
    return this.pool['photos.db'].executeSql(syncDates.statements.createTable);
  }

  public async getPhotos(offset: number, limit = 60) {
    return this.pool['photos.db'].executeSql(photos.statements.get, [limit, offset]);
  }

  public async getMostRecentCreationDate(): Promise<Date | null> {
    return this.pool['photos.db'].executeSql(photos.statements.getMostRecentCreationDate).then((res) => {
      if (res[0].rows.item(0) && res[0].rows.item(0).creationDate) {
        return new Date(res[0].rows.item(0).creationDate);
      } else {
        return null;
      }
    });
  }

  public async getPhotoByName(photoName: string): Promise<Photo | null> {
    return this.pool['photos.db'].executeSql(photos.statements.getPhotoByName, [photoName]).then((res) => {
      if (res[0].rows.item(0)) {
        return res[0].rows.item(0);
      } else {
        return null;
      }
    });
  }

  public async getPhotoById(photoId: PhotoId): Promise<Photo | null> {
    return this.pool['photos.db'].executeSql(photos.statements.getById, [photoId]).then((res) => {
      if (res[0].rows.item(0)) {
        return res[0].rows.item(0);
      } else {
        return null;
      }
    });
  }

  public async updatePhotoStatusById(photoId: PhotoId, newStatus: PhotoStatus): Promise<void> {
    return this.pool['photos.db'].executeSql(photos.statements.updatePhotoStatusById, [newStatus, photoId]).then(() => {
      //
    });
  }

  public async getMostRecentPullFromRemoteDate(): Promise<Date | null> {
    return this.pool['photos.db'].executeSql(syncDates.statements.getMostRecentPullFromRemoteDate).then((res) => {
      if (res[0].rows.item(0) && res[0].rows.item(0).lastPullFromRemote) {
        return new Date(res[0].rows.item(0).lastPullFromRemote);
      } else {
        return null;
      }
    });
  }

  public async updateLastPullFromRemoteDate(newDate: Date): Promise<void> {
    return this.pool['photos.db'].executeSql(syncDates.statements.updateByDate, [newDate.toUTCString()]).then(() => {
      //
    });
  }

  public getSyncDatesCount(): Promise<number> {
    return this.pool['photos.db'].executeSql(syncDates.statements.selectCount).then((res) => {
      if (res[0].rows.item(0)) {
        return res[0].rows.item(0).count;
      } else {
        return null;
      }
    });
  }

  public initSyncDates() {
    return this.pool['photos.db'].executeSql(syncDates.statements.insert, [new Date('January 1, 1971 00:00:01')]);
  }

  public async deletePhotosTable() {
    return this.pool['photos.db'].executeSql(photos.statements.dropTable);
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
