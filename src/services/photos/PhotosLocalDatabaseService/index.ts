import _ from 'lodash';
import { Photo, PhotoId, PhotoStatus } from '@internxt/sdk/dist/photos';
import { PhotosServiceModel, PHOTOS_DB_NAME, SqlitePhotoRow } from '../../../types/photos';

import sqliteService from '../../sqlite';
import photoTable from './tables/photo';
import syncTable from './tables/sync';

export default class PhotosLocalDatabaseService {
  private readonly model: PhotosServiceModel;

  constructor(model: PhotosServiceModel) {
    this.model = model;
  }

  public async initialize(): Promise<void> {
    await sqliteService.open(PHOTOS_DB_NAME);

    await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.createTable);
    await sqliteService.executeSql(PHOTOS_DB_NAME, syncTable.statements.createTable);

    const count = await this.getSyncDatesCount();
    const syncDatesNotInitialized = count === 0;
    if (syncDatesNotInitialized) {
      await this.initSyncDates();
    }

    console.log('(PhotosService) Local database initialized');
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
          results.push({
            data: this.mapPhotoRowToModel(row),
            preview: row.preview_source,
          });
        }

        return results;
      });
  }

  public async getYearsList(): Promise<{ year: number; preview: string }[]> {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.getYearsList);
    const allYears = (rows.raw() as { year: string }[]).map((row) => parseInt(row.year));
    const uniqueYears = [...new Set(allYears)];
    const results: { year: number; preview: string }[] = [];

    for (const year of uniqueYears) {
      const preview = await this.getYearPreview(year);
      results.push({
        year,
        preview: preview || '',
      });
    }

    return results;
  }

  private async getYearPreview(year: number): Promise<string | null> {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.getLastPhotoOfTheYear, [
      year.toString(),
    ]);
    const lastPhotoOfTheYear = rows.item(0) as SqlitePhotoRow | null;

    return lastPhotoOfTheYear && lastPhotoOfTheYear.preview_source;
  }

  public async getMonthsList(): Promise<{ year: number; month: number; preview: string }[]> {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.getMonthsList);
    const allYearsAndMonths = (rows.raw() as { year: string; month: string }[]).map((row) => ({
      year: parseInt(row.year),
      month: parseInt(row.month),
    }));
    const uniqueYearsAndMonths = _.uniqBy(allYearsAndMonths, (n) => {
      return `${n.year}-${n.month}`;
    });
    const results: { year: number; month: number; preview: string }[] = [];

    for (const { year, month } of uniqueYearsAndMonths) {
      const preview = await this.getMonthPreview(year, month);
      results.push({
        year,
        month,
        preview: preview || '',
      });
    }

    return results;
  }

  private async getMonthPreview(year: number, month: number): Promise<string | null> {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.getLastPhotoOfTheMonth, [
      year.toString(),
      month < 10 ? '0' + month.toString() : month,
    ]);
    const lastPhotoOfTheMonth = rows.item(0) as SqlitePhotoRow | null;

    return lastPhotoOfTheMonth && lastPhotoOfTheMonth.preview_source;
  }

  public async getAllWithoutPreview(): Promise<Photo[]> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.getAllWithoutPreview).then(([{ rows }]) => {
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
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.getById, [photoId]);
    const photoSourceRow: SqlitePhotoRow | null = rows.item(0) || null;

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
      .executeSql(PHOTOS_DB_NAME, photoTable.statements.insert, [
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
        photo.takenAt.getTime(),
        photo.statusChangedAt.getTime(),
        photo.createdAt.getTime(),
        photo.updatedAt.getTime(),
        preview,
      ])
      .then(() => undefined);
  }

  public async resetDatabase(): Promise<void> {
    await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.dropTable);
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
      statusChangedAt: new Date(row.status_changed_at),
      takenAt: new Date(row.taken_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
