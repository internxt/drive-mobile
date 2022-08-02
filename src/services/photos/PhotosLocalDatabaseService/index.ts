import { PhotosCommonServices } from '../PhotosCommonService';
import sqliteService from '../../SqliteService';
import { DevicePhoto, PhotoFileSystemRef, PHOTOS_DB_NAME, SyncStage } from '../../../types/photos';
import deviceSyncTable from './tables/deviceSync';
import { Photo } from '@internxt/sdk/dist/photos';

export class PhotosLocalDatabaseService {
  public isInitialized = false;
  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await sqliteService.open(PHOTOS_DB_NAME);
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.createTable);
    this.isInitialized = true;
    PhotosCommonServices.log.info('Local database initialized');
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
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.dropTable);
  }

  public async persistPhotoSync(photo: Photo, devicePhoto?: DevicePhoto) {
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.insert, [
      devicePhoto?.id || null,
      photo.id,
      SyncStage.IN_SYNC,
    ]);
  }
}
