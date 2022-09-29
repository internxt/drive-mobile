import sqliteService from '../../SqliteService';
import { PHOTOS_DB_NAME } from '../../../types/photos';
import deviceSyncTable, { SynchedPhotoRow } from './tables/deviceSync';
import { Photo, PhotoId, PhotoStatus } from '@internxt/sdk/dist/photos';
import { photosLogger, PhotosLogger } from '../logger';

export class PhotosLocalDB {
  public isInitialized = false;
  constructor(private logger: PhotosLogger, private config = { enableLog: false }) {
    this.init();
  }

  private async init(): Promise<void> {
    await sqliteService.open(PHOTOS_DB_NAME);
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.createTable);
    this.isInitialized = true;
    this.logger.info('Local database initialized');
  }

  public async clear() {
    this.logger.info('Clearing photos db');
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.cleanTable);
  }

  public async getSyncedPhotos() {
    const [result] = await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.getSyncedPhotos);

    this.log(`${result.rows.length} photos items found in local DB`);
    return result.rows.raw().map<SynchedPhotoRow>((row) => {
      return this.parseRow(row);
    });
  }

  public async getSyncedPhotoByName(photoName: string) {
    const [result] = await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.getSyncedPhotoByName, [
      photoName,
    ]);

    const row = result.rows.item(0);

    if (row) {
      return this.parseRow(row);
    } else {
      return null;
    }
  }

  public async getSyncedPhotoByPhotoId(photoId: PhotoId) {
    const [result] = await sqliteService.executeSql(
      PHOTOS_DB_NAME,
      deviceSyncTable.statements.getSyncedPhotoByPhotoId,
      [photoId],
    );

    const row = result.rows.item(0);

    if (row) {
      return this.parseRow(row);
    } else {
      return null;
    }
  }

  public async deleteSyncedPhotosItem(photoId: PhotoId) {
    this.log('Marking photo as TRASHED in the DB');
    const existingPhoto = await this.getSyncedPhotoByPhotoId(photoId);

    if (!existingPhoto) {
      this.log('Cant mark as TRASHED since photo does not exists');
      return;
    }
    const newPhoto: Photo = {
      ...existingPhoto.photo,
      status: PhotoStatus.Trashed,
    };

    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.updatePhotoById, [
      JSON.stringify(newPhoto),
      photoId,
    ]);

    this.log('Photos item marked as TRASHED in the DB');
  }

  public async savePhotosItem(photo: Photo) {
    this.log('Saving photos item');
    const photoExists = await this.getSyncedPhotoByName(photo.name);
    if (photoExists) {
      this.log('Photos item already exists, skipping insert');
      await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.updatePhotoById, [
        JSON.stringify(photo),
        photo.id,
      ]);
    } else {
      this.log('Photos item saved into DB');
      await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.insert, [
        photo.id,
        photo.name,
        JSON.stringify(photo),
      ]);
    }
  }

  private parseRow(row: Record<string, string>) {
    return {
      ...row,
      photo: JSON.parse(row.photo),
    } as SynchedPhotoRow;
  }

  private log(message: string) {
    if (!this.config.enableLog) return;
    this.logger.info(message);
  }
}
export const photosLocalDB = new PhotosLocalDB(photosLogger, { enableLog: false });
