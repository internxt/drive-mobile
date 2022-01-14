import { Photo, PhotoId, PhotoStatus } from '@internxt/sdk/dist/photos';
import { PhotosServiceModel, PHOTOS_DB_NAME, SqlitePhotoRow, SqlitePhotoSourceRow } from '../../../types/photos';

import sqliteService from '../../sqlite';
import photoTable from './tables/photo';
import photoSourceTable from './tables/photo_source';
import syncTable from './tables/sync';

export default class PhotosLocalDatabaseService {
  private readonly model: PhotosServiceModel;

  constructor(model: PhotosServiceModel) {
    this.model = model;
  }

  public async initialize(): Promise<void> {
    await sqliteService.open(PHOTOS_DB_NAME);

    await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.createTable);
    await sqliteService.executeSql(PHOTOS_DB_NAME, photoSourceTable.statements.createTable);
    await sqliteService.executeSql(PHOTOS_DB_NAME, syncTable.statements.createTable);

    const count = await this.getSyncDatesCount();
    const syncDatesNotInitialized = count === 0;
    if (syncDatesNotInitialized) {
      await this.initSyncDates();
    }
  }

  public async initSyncDates(): Promise<void> {
    await sqliteService.executeSql(PHOTOS_DB_NAME, syncTable.statements.insert, [new Date('January 1, 1971 00:00:01')]);
  }

  public async countPhotos(): Promise<number> {
    const result = await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.count);

    return result[0].rows.item(0).count;
  }

  public async getPhotos(offset: number, limit: number): Promise<{ data: Photo; preview: string }[]> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, photoTable.statements.get, [limit, offset])
      .then(async ([{ rows }]) => {
        const results: { data: Photo; preview: string }[] = [];

        for (const row of rows.raw() as unknown as SqlitePhotoRow[]) {
          const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, photoSourceTable.statements.getByPhotoId, [
            row.id,
          ]);
          const photoSourceRow = rows.item(0) as SqlitePhotoSourceRow;

          results.push({
            data: this.mapPhotoRowToModel(row),
            preview: photoSourceRow.preview_source,
          });
        }

        return results;
      });
  }

  public async getAllWithoutPreview(): Promise<Photo[]> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.getAll).then(([{ rows }]) => {
      return (rows.raw() as unknown as SqlitePhotoRow[]).map((row) => this.mapPhotoRowToModel(row));
    });
  }

  public async getMostRecentTakenAt(): Promise<Date | null> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.getMostRecentTakenAt).then((res) => {
      if (res[0].rows.item(0) && res[0].rows.item(0).takenAt) {
        return new Date(res[0].rows.item(0).takenAt);
      } else {
        return null;
      }
    });
  }

  public async getPhotoByNameAndType(name: string, type: string): Promise<Photo | null> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, photoTable.statements.getPhotoByNameAndType, [name, type])
      .then((res) => {
        if (res[0].rows.item(0)) {
          return res[0].rows.item(0);
        } else {
          return null;
        }
      });
  }

  public async getPhotoById(photoId: PhotoId): Promise<Photo | null> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.getById, [photoId]).then((res) => {
      if (res[0].rows.item(0)) {
        return res[0].rows.item(0);
      } else {
        return null;
      }
    });
  }

  public async getPhotoPreview(photoId: PhotoId): Promise<string | null> {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, photoSourceTable.statements.getByPhotoId, [
      photoId,
    ]);
    const photoSourceRow: SqlitePhotoSourceRow | null = rows.item(0) || null;

    return photoSourceRow && photoSourceRow.preview_source;
  }

  public async updatePhotoStatusById(photoId: PhotoId, newStatus: PhotoStatus): Promise<void> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, photoTable.statements.updatePhotoStatusById, [newStatus, photoId])
      .then(() => undefined);
  }

  public async getSyncUpdatedAt(): Promise<Date> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, syncTable.statements.getUpdatedAt).then((res) => {
      if (res[0].rows.item(0) && res[0].rows.item(0).updatedAt) {
        return new Date(res[0].rows.item(0).updatedAt);
      } else {
        return new Date('January 1, 1971 00:00:01');
      }
    });
  }

  public async setSyncUpdatedAt(date: Date): Promise<void> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, syncTable.statements.setUpdatedAt, [date.toUTCString()])
      .then(() => undefined);
  }

  public async insertPhoto(photo: Photo, preview: string): Promise<void> {
    return sqliteService
      .transaction(PHOTOS_DB_NAME, (tx) => {
        tx.executeSql(photoTable.statements.insert, [
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
          photo.takenAt,
          photo.statusChangedAt,
          photo.createdAt,
          photo.updatedAt,
        ]);
        tx.executeSql(photoSourceTable.statements.insert, [photo.id, preview, null]);
      })
      .then(() => undefined);
  }

  public async resetDatabase(): Promise<void> {
    await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.dropTable);
    await sqliteService.executeSql(PHOTOS_DB_NAME, photoSourceTable.statements.dropTable);
    await sqliteService.executeSql(PHOTOS_DB_NAME, syncTable.statements.dropTable);
  }

  private getSyncDatesCount(): Promise<number> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, syncTable.statements.selectCount).then((res) => {
      if (res[0].rows.item(0)) {
        return res[0].rows.item(0).count;
      } else {
        return null;
      }
    });
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
      statusChangedAt: row.status_changed_at,
      takenAt: row.taken_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
