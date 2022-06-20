import { PhotosCommonServices } from '../PhotosCommonService';
import sqliteService from '../../SqliteService';
import { PhotoFileSystemRef, PHOTOS_DB_NAME, SyncStage } from '../../../types/photos';
import deviceSyncTable from './tables/deviceSync';
import { PhotoId } from '@internxt/sdk/dist/photos';

export default class PhotosLocalDatabaseService {
  public async initialize(): Promise<void> {
    await sqliteService.open(PHOTOS_DB_NAME);
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.createTable);

    PhotosCommonServices.log.info('Local database initialized');
  }

  public async getByPhotoId(photoId: string) {
    const [{ rows }] = await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.getByPhotoId, [
      photoId,
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

  public async persistPhotoSync(photoId: PhotoId, photoRef: PhotoFileSystemRef) {
    await sqliteService.executeSql(PHOTOS_DB_NAME, deviceSyncTable.statements.insert, [
      photoId,
      photoRef,
      SyncStage.IN_SYNC,
    ]);
  }
}
