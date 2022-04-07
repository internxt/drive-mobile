import _ from 'lodash';
import { Photo, PhotoId, PhotoStatus } from '@internxt/sdk/dist/photos';
import { PhotosServiceModel, PHOTOS_DB_NAME, SqlitePhotoRow, SqliteTmpCameraRollRow } from '../../../types/photos';

import sqliteService from '../../sqlite';
import photoTable from './tables/photo';
import syncTable from './tables/sync';
import imageService from '../../image';
import PhotosLogService from '../PhotosLogService';
import { pathToUri } from '../../fileSystem';
import tmp_camera_roll from './tables/tmp_camera_roll';
import CameraRoll from '@react-native-community/cameraroll';

export default class PhotosLocalDatabaseService {
  private readonly model: PhotosServiceModel;
  private readonly logService: PhotosLogService;

  constructor(model: PhotosServiceModel, logService: PhotosLogService) {
    this.model = model;
    this.logService = logService;
  }

  public async initialize(): Promise<void> {
    await sqliteService.open(PHOTOS_DB_NAME);

    await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.createTable);
    await sqliteService.executeSql(PHOTOS_DB_NAME, syncTable.statements.createTable);
    await sqliteService.executeSql(PHOTOS_DB_NAME, tmp_camera_roll.statements.createTable);

    const count = await this.getSyncDatesCount();
    const syncDatesNotInitialized = count === 0;
    if (syncDatesNotInitialized) {
      await this.initSyncDates();
    }

    this.logService.info('Local database initialized');
  }

  public async initSyncDates(): Promise<void> {
    await sqliteService.executeSql(PHOTOS_DB_NAME, syncTable.statements.insert, [
      new Date('January 1, 1971 00:00:01').toUTCString(),
      new Date('January 1, 1971 00:00:01').toUTCString(),
      null,
    ]);
  }

  public async countPhotos(): Promise<number> {
    const result = await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.count);

    return result[0].rows.item(0).count;
  }

  public async countTmpCameraRoll(filter: { from?: Date; to?: Date }): Promise<number> {
    const result = await sqliteService.executeSql(PHOTOS_DB_NAME, tmp_camera_roll.statements.count(filter));

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
            preview: pathToUri(row.preview_path),
          });
        }

        return results;
      });
  }

  public async getTmpCameraRollPhotos(options: {
    from?: Date;
    to?: Date;
    limit: number;
    skip: number;
  }): Promise<SqliteTmpCameraRollRow[]> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, tmp_camera_roll.statements.get(options))
      .then(async ([{ rows }]) => {
        return rows.raw() as unknown as SqliteTmpCameraRollRow[];
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
        preview: imageService.BASE64_PREFIX + preview || '',
      });
    }

    return results;
  }

  private async getYearPreview(year: number): Promise<string | null> {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.getLastPhotoOfTheYear, [
      year.toString(),
    ]);
    const lastPhotoOfTheYear = rows.item(0) as SqlitePhotoRow | null;

    return lastPhotoOfTheYear && pathToUri(lastPhotoOfTheYear.preview_path);
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

    return lastPhotoOfTheMonth && pathToUri(lastPhotoOfTheMonth.preview_path);
  }

  public async getAll(): Promise<Photo[]> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.getAll).then(([{ rows }]) => {
      return (rows.raw() as unknown as SqlitePhotoRow[]).map((row) => this.mapPhotoRowToModel(row));
    });
  }

  public async getPhotoByNameTypeDeviceAndHash(
    name: string,
    type: string,
    deviceId: string,
    hash: string,
  ): Promise<Photo | null> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, photoTable.statements.getPhotoByNameTypeDeviceAndHash, [name, type, deviceId, hash])
      .then((res) => {
        if (res[0].rows.item(0)) {
          return res[0].rows.item(0);
        } else {
          return null;
        }
      });
  }

  public async getPhotoById(photoId: PhotoId): Promise<SqlitePhotoRow | null> {
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
    const photoRow: SqlitePhotoRow | null = rows.item(0) || null;

    return photoRow && pathToUri(photoRow.preview_path);
  }

  public async updatePhotoStatusById(photoId: PhotoId, newStatus: PhotoStatus): Promise<void> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, photoTable.statements.updatePhotoStatusById, [newStatus, photoId])
      .then(() => undefined);
  }

  public async getRemoteSyncAt(): Promise<Date> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, syncTable.statements.getRemoteSyncAt).then((res) => {
      if (res[0].rows.item(0) && res[0].rows.item(0).remoteSyncAt) {
        return new Date(res[0].rows.item(0).remoteSyncAt);
      } else {
        return new Date('January 1, 1971 00:00:01');
      }
    });
  }

  public async getNewestDate(): Promise<Date> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, syncTable.statements.getNewestDate).then((res) => {
      if (res[0].rows.item(0) && res[0].rows.item(0).newestDate) {
        return new Date(res[0].rows.item(0).newestDate);
      } else {
        return new Date('January 1, 1971 00:00:01');
      }
    });
  }

  public async getOldestDate(): Promise<Date | null> {
    return sqliteService.executeSql(PHOTOS_DB_NAME, syncTable.statements.getOldestDate).then((res) => {
      if (res[0].rows.item(0) && res[0].rows.item(0).oldestDate) {
        return new Date(res[0].rows.item(0).oldestDate);
      }

      return null;
    });
  }

  public async setRemoteSyncAt(date: Date): Promise<void> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, syncTable.statements.setRemoteSyncAt, [date.toUTCString()])
      .then(() => undefined);
  }

  public async setNewestDate(date: Date): Promise<void> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, syncTable.statements.setNewestDate, [date.toUTCString()])
      .then(() => undefined);
  }

  public async setOldestDate(date: Date | null): Promise<void> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, syncTable.statements.setOldestDate, [date && date.toUTCString()])
      .then(() => undefined);
  }

  public async insertPhoto(photo: Photo, previewPath: string): Promise<void> {
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
        previewPath,
        photo.hash,
      ])
      .then(() => undefined);
  }

  public async insertTmpCameraRollRow(edge: CameraRoll.PhotoIdentifier): Promise<void> {
    return sqliteService
      .executeSql(PHOTOS_DB_NAME, tmp_camera_roll.statements.insert, [
        edge.node.group_name || '',
        edge.node.timestamp * 1000,
        edge.node.type,
        edge.node.image.filename,
        edge.node.image.fileSize,
        edge.node.image.width,
        edge.node.image.height,
        edge.node.image.uri,
      ])
      .then(() => undefined);
  }

  public async bulkInsertTmpCameraRollRow(edges: CameraRoll.PhotoIdentifier[]): Promise<void> {
    const rows = edges.map((edge) => {
      const splittedUri = edge.node.image.uri.split('/');
      const filename = edge.node.image.filename || splittedUri[splittedUri.length - 1];

      return [
        edge.node.group_name || '',
        edge.node.timestamp * 1000,
        edge.node.type,
        filename,
        edge.node.image.fileSize,
        edge.node.image.width,
        edge.node.image.height,
        edge.node.image.uri,
      ];
    });
    const query = tmp_camera_roll.statements.bulkInsert(rows);

    await sqliteService.executeSql(PHOTOS_DB_NAME, query);
  }

  public async cleanTmpCameraRollTable(): Promise<void> {
    await sqliteService.executeSql(PHOTOS_DB_NAME, tmp_camera_roll.statements.cleanTable);
  }

  public async resetDatabase(): Promise<void> {
    //await sqliteService.executeSql(PHOTOS_DB_NAME, photoTable.statements.cleanTable);
    //await sqliteService.executeSql(PHOTOS_DB_NAME, syncTable.statements.cleanTable);
    await sqliteService.close(PHOTOS_DB_NAME);
    await sqliteService.delete(PHOTOS_DB_NAME);
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
      hash: row.hash,
      statusChangedAt: new Date(row.status_changed_at),
      takenAt: new Date(row.taken_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
