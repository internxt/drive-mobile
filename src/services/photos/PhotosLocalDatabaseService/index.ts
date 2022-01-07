import { Photo, PhotoId, PhotoStatus } from '@internxt/sdk/dist/photos';

import sqliteService from '../../sqlite';
import photosTable from './tables/photos';
import syncDatesTable from './tables/syncDates';
import { PhotosServiceModel, PHOTOS_DB_NAME, SqlitePhotoRow } from '../../../types';

export default class PhotosLocalDatabaseService {
  private readonly model: PhotosServiceModel;

  constructor(model: PhotosServiceModel) {
    this.model = model;
  }

  public async initialize(): Promise<void> {
    await sqliteService.open(PHOTOS_DB_NAME);

    await sqliteService.executeSql(PHOTOS_DB_NAME, photosTable.statements.createTable);
    await sqliteService.executeSql(PHOTOS_DB_NAME, syncDatesTable.statements.createTable);

    const count = await this.getSyncDatesCount();
    const syncDatesNotInitialized = count === 0;
    if (syncDatesNotInitialized) {
      await this.initSyncDates();
    }
  }

  public async initSyncDates(): Promise<void> {
    await sqliteService.executeSql(PHOTOS_DB_NAME, syncDatesTable.statements.insert, [
      new Date('January 1, 1971 00:00:01'),
    ]);
  }

  public async countPhotos(): Promise<number> {
    const result = await sqliteService.executeSql(PHOTOS_DB_NAME, photosTable.statements.count);

    return result[0].rows.item(0).count;
  }

  public async getPhotos(offset: number, limit = 60): Promise<{ data: Photo; preview: string }[]> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, photosTable.statements.get, [limit, offset]).then(([{ rows }]) => {
      offset += limit;

      return (rows.raw() as unknown as SqlitePhotoRow[]).map((row) => ({
        data: this.mapPhotoRowToModel(row),
        preview: row.preview,
      }));
    });
  }

  public async getAllWithoutPreview(): Promise<Photo[]> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, photosTable.statements.getAllWithoutPreview).then(([{ rows }]) => {
      return (rows.raw() as unknown as SqlitePhotoRow[]).map((row) => this.mapPhotoRowToModel(row));
    });
  }

  public async getMostRecentCreationDate(): Promise<Date | null> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, photosTable.statements.getMostRecentCreationDate).then((res) => {
      if (res[0].rows.item(0) && res[0].rows.item(0).creationDate) {
        return new Date(res[0].rows.item(0).creationDate);
      } else {
        return null;
      }
    });
  }

  public async getPhotoByName(photoName: string): Promise<Photo | null> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, photosTable.statements.getPhotoByName, [photoName]).then((res) => {
      if (res[0].rows.item(0)) {
        return res[0].rows.item(0);
      } else {
        return null;
      }
    });
  }

  public async getPhotoById(photoId: PhotoId): Promise<Photo | null> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, photosTable.statements.getById, [photoId]).then((res) => {
      if (res[0].rows.item(0)) {
        return res[0].rows.item(0);
      } else {
        return null;
      }
    });
  }

  public deletePhotoById(photoId: string): Promise<void> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, photosTable.statements.deleteById, [photoId]).then(() => undefined);
  }

  public async updatePhotoStatusById(photoId: PhotoId, newStatus: PhotoStatus): Promise<void> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, photosTable.statements.updatePhotoStatusById, [newStatus, photoId])
      .then(() => {
        //
      });
  }

  public async getMostRecentPullFromRemoteDate(): Promise<Date | null> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, syncDatesTable.statements.getMostRecentPullFromRemoteDate)
      .then((res) => {
        if (res[0].rows.item(0) && res[0].rows.item(0).lastPullFromRemote) {
          return new Date(res[0].rows.item(0).lastPullFromRemote);
        } else {
          return null;
        }
      });
  }

  public async updateLastPullFromRemoteDate(newDate: Date): Promise<void> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, syncDatesTable.statements.updateByDate, [newDate.toUTCString()])
      .then(() => {
        //
      });
  }

  public getSyncDatesCount(): Promise<number> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, syncDatesTable.statements.selectCount).then((res) => {
      if (res[0].rows.item(0)) {
        return res[0].rows.item(0).count;
      } else {
        return null;
      }
    });
  }

  public async insertPhoto(photo: Photo, preview: string): Promise<void> {
    sqliteService.executeSql(PHOTOS_DB_NAME, photosTable.statements.insert, [
      photo.id,
      photo.name,
      photo.type,
      photo.size,
      photo.width,
      photo.height,
      photo.status,
      photo.fileId,
      photo.previewId,
      photo.deviceId,
      photo.userId,
      photo.creationDate,
      photo.lastStatusChangeAt,
      photo.createdAt,
      photo.updatedAt,
      preview,
    ]);
  }

  public async deletePhotosTable(): Promise<void> {
    await sqliteService.executeSql(PHOTOS_DB_NAME, photosTable.statements.dropTable);
  }

  public async resetDatabase(): Promise<void> {
    await sqliteService.executeSql(PHOTOS_DB_NAME, photosTable.statements.dropTable);
    await sqliteService.executeSql(PHOTOS_DB_NAME, syncDatesTable.statements.dropTable);
  }

  private mapPhotoRowToModel(row: SqlitePhotoRow): Photo {
    return {
      id: row.id,
      status: row.status,
      name: row.name,
      width: row.width,
      height: row.height,
      size: row.size,
      type: row.type,
      userId: row.user_id,
      deviceId: row.device_id,
      fileId: row.file_id,
      previewId: row.preview_id,
      lastStatusChangeAt: row.last_status_change_at,
      creationDate: row.creation_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
