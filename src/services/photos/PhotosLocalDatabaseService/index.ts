import { PhotosCommonServices } from '../PhotosCommonService';
import sqliteService from '../../SqliteService';
import { DevicePhoto, PhotoFileSystemRef, PHOTOS_DB_NAME, SyncStage } from '../../../types/photos';
import deviceSyncTable from './tables/deviceSync';
import { Photo, PhotoId } from '@internxt/sdk/dist/photos';

export default class PhotosLocalDatabaseService {
  public async initialize(): Promise<void> {
    await sqliteService.open(PHOTOS_DB_NAME);
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.createTable);

    PhotosCommonServices.log.info('Local database initialized');
  }

  public async getByDevicePhoto(devicePhoto: DevicePhoto) {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.getByDevicePhotoId, [
      devicePhoto.uri,
    ]);

    return rows.raw().length ? rows.raw()[0] : null;
  }
  public async getByPhoto(photo: Photo) {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.getByPhotoId, [
      photo.id,
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

  public async persistPhotoSync(devicePhoto: DevicePhoto, photoRef: PhotoFileSystemRef, photo: Photo) {
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.insert, [
      devicePhoto.uri,
      photo.id,
      photoRef,
      SyncStage.IN_SYNC,
    ]);
  }
}
