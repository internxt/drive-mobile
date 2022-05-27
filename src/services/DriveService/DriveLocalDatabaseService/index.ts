import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import {
  DriveServiceModel,
  DRIVE_DB_NAME,
  SqliteDriveItemRow,
  DriveItemData,
  InsertSqliteDriveItemRowData,
  SqliteDriveFolderRecord,
} from '../../../types/drive';
import sqliteService from '../../SqliteService';
import PhotosLogService from '../DriveLogService';
import driveItemTable from './tables/drive_item';
import folderRecordTable from './tables/folder_record';

export default class DriveLocalDatabaseService {
  private readonly model: DriveServiceModel;
  private readonly logService: PhotosLogService;

  constructor(model: DriveServiceModel, logService: PhotosLogService) {
    this.model = model;
    this.logService = logService;
  }

  public async initialize(): Promise<void> {
    await sqliteService.open(DRIVE_DB_NAME);
    await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.createTable);
    await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.createTable);

    this.logService.info('Local database initialized');
  }

  public async getDriveItems(parentId: number): Promise<DriveItemData[]> {
    return sqliteService
      .executeSql(DRIVE_DB_NAME, driveItemTable.statements.get({ parentId }))
      .then(async ([{ rows }]) => {
        const results: DriveItemData[] = [];

        for (const row of rows.raw() as unknown as SqliteDriveItemRow[]) {
          results.push(this.mapDriveItemRowToModel(row));
        }

        return results;
      });
  }

  public async getFolderRecord(folderId: number): Promise<SqliteDriveFolderRecord | null> {
    const [{ rows }] = await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.getById, [folderId]);

    return rows.raw().length > 0 ? (rows.raw()[0] as SqliteDriveFolderRecord) : null;
  }

  public async saveFolderContent(
    folderRecordData: { id: number; parentId: number; name: string; updatedAt: string },
    items: DriveItemData[],
  ) {
    const { id, parentId, name, updatedAt } = folderRecordData;

    await sqliteService.transaction(DRIVE_DB_NAME, async (tx) => {
      tx.executeSql(folderRecordTable.statements.deleteById, [id]);
      tx.executeSql(driveItemTable.statements.deleteFolderContent, [id]);
      tx.executeSql(folderRecordTable.statements.insert, [id, parentId, name, updatedAt, new Date().toString()]);

      if (items.length > 0) {
        const rows = items.map<InsertSqliteDriveItemRowData>((item) => {
          return {
            id: item.id,
            bucket: item.bucket,
            color: item.color,
            encrypt_version: item.encrypt_version,
            icon: item.icon,
            icon_id: item.icon_id,
            is_folder: item.parentId !== undefined,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
            file_id: item.fileId,
            name: item.name,
            parent_id: item.parentId || item.folderId,
            size: item.size,
            type: item.type,
            user_id: item.userId,
          };
        });
        const bulkInsertQuery = driveItemTable.statements.bulkInsert(rows);

        tx.executeSql(bulkInsertQuery);
      }
    });
  }

  public async deleteFolderContent(folderId: number) {
    return sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.deleteFolderContent, [folderId]);
  }

  public deleteFolderRecord(folderId: number) {
    return sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.deleteById, [folderId]);
  }

  public deleteItem({ id, isFolder }: { id: number; isFolder: boolean }) {
    return sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.deleteItem, [id, isFolder]);
  }

  public async resetDatabase(): Promise<void> {
    await sqliteService.close(DRIVE_DB_NAME);
    await sqliteService.delete(DRIVE_DB_NAME);

    this.logService.info('Local database reset');
  }

  private mapDriveItemRowToModel(row: SqliteDriveItemRow): DriveItemData {
    let result: DriveFolderData | DriveFileData;

    if (row.is_folder) {
      const folder: DriveFolderData = {
        id: row.id,
        bucket: row.bucket,
        color: row.color,
        name: row.name,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        encrypt_version: row.encrypt_version,
        icon: row.icon,
        iconId: row.icon_id,
        icon_id: row.icon_id,
        parentId: row.parent_id,
        parent_id: row.parent_id,
        user_id: row.user_id,
      };
      result = folder;
    } else {
      const file: DriveFileData = {
        id: row.id,
        bucket: row.bucket as string,
        createdAt: row.created_at,
        created_at: row.created_at,
        deleted: false,
        deletedAt: null,
        encrypt_version: row.encrypt_version as string,
        fileId: row.file_id as string,
        folderId: row.parent_id as number,
        folder_id: row.parent_id as number,
        name: row.name,
        size: row.size as number,
        type: row.type || '',
        updatedAt: row.updated_at,
      };
      result = file;
    }

    return result as DriveItemData;
  }
}
