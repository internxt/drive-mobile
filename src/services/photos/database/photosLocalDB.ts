import sqliteService from '../../SqliteService';
import { DevicePhoto, PhotoFileSystemRef, PHOTOS_DB_NAME, SyncStage } from '../../../types/photos';
import deviceSyncTable from './tables/deviceSync';
import { Photo, PhotoId } from '@internxt/sdk/dist/photos';
import { photosLogger, PhotosLogger } from '../logger';

export class PhotosLocalDB {
  public isInitialized = false;
  constructor(private logger: PhotosLogger) {
    this.init();
  }

  private async init(): Promise<void> {
    await sqliteService.open(PHOTOS_DB_NAME);
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.createTable);
    this.isInitialized = true;
    this.logger.info('Local database initialized');
  }

  public async getByPreviewUri(previewUri: string) {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.getByPreviewUri, [
      previewUri,
    ]);

    return rows.raw().length ? rows.raw()[0] : null;
  }
  public async getByPhoto(photo: Photo) {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.getByPhotoId, [
      photo.id,
    ]);

    return rows.raw().length ? rows.raw()[0] : null;
  }

  public async getAll() {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.getAll, []);

    return rows.raw();
  }

  public async getByDevicePhoto(devicePhoto: DevicePhoto) {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.getByDevicePhotoId, [
      devicePhoto.id,
    ]);

    return rows.raw().length ? rows.raw()[0] : null;
  }

  public async getByPhotoRef(photoRef: PhotoFileSystemRef) {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.getByPhotoRef, [
      photoRef,
    ]);
    return rows.raw().length ? rows.raw()[0] : null;
  }

  public async clear() {
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.deleteTableRows);
  }

  public async deletePhotoById(photoId: PhotoId) {
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.deletePhotoById, [photoId]);
  }

  public async persistPhotoSync(photo: Photo, devicePhoto?: DevicePhoto) {
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.insert, [
      devicePhoto?.id || null,
      photo.id,
      SyncStage.IN_SYNC,
    ]);
  }
}
export const photosLocalDB = new PhotosLocalDB(photosLogger);
