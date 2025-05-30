import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import {
  DRIVE_DB_NAME,
  DriveItemData,
  InsertSqliteDriveItemRowData,
  SqliteDriveFolderRecord,
  SqliteDriveItemRow,
} from '../../../types/drive';
import sqliteService from '../../SqliteService';
import { driveLogger, DriveLogger } from '../logger';
import driveItemTable from './tables/drive_item';
import folderRecordTable from './tables/folder_record';

export interface DriveRowItem {
  id: number;
  uuid?: string;
  bucket?: string;
  color: string | null;
  name: string;
  encrypt_version: string;
  parentId: number | null;
  parentUuid?: string;
  fileId?: string;
  folderUuid?: string;
  icon: string | null;
  size?: number;
  type?: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
  folderId?: number;
  icon_id: number | null;
}

class DriveLocalDB {
  private readonly logger: DriveLogger;

  constructor(logger: DriveLogger) {
    this.logger = logger;
    this.init();
    this.logger.info('Local database initialized');
  }

  public async init(): Promise<void> {
    await sqliteService.open(DRIVE_DB_NAME);

    await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.createTable);
    await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.createTable);
  }

  public async getDriveItems(parentId: number): Promise<DriveItemData[]> {
    return sqliteService
      .executeSql(DRIVE_DB_NAME, driveItemTable.statements.get({ parentId }))
      .then(async ([{ rows }]) => {
        const results: DriveItemData[] = [];

        for (const row of rows.raw() as SqliteDriveItemRow[]) {
          results.push(this.mapDriveItemRowToModel(row));
        }

        return results;
      });
  }

  public async getDriveItem(id: number): Promise<DriveItemData | null> {
    const [{ rows }] = await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.getOne, [id]);

    if (!rows.item(0)) return null;
    return this.mapDriveItemRowToModel(rows.item(0));
  }

  public async getFolderRecord(folderId: number): Promise<SqliteDriveFolderRecord | null> {
    const [{ rows }] = await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.getById, [folderId]);

    return rows.raw().length > 0 ? (rows.raw()[0] as SqliteDriveFolderRecord) : null;
  }

  public async saveFolderContent(
    folderRecordData: {
      id: number;
      uuid: string;
      parentId: number;
      parentUuid: string;
      name: string;
      updatedAt: string;
    },
    items: DriveItemData[],
  ) {
    const { id, uuid, parentId, parentUuid, name, updatedAt } = folderRecordData;
    await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.deleteById, [id]);
    await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.deleteFolderContent, [id]);
    await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.insert, [
      id,
      uuid ?? '',
      parentId,
      parentUuid ?? '',
      name,
      updatedAt,
      new Date().toString(),
    ]);

    this.saveItems(items);
  }
  public async saveItems(items: DriveRowItem[]) {
    // TODO: Should move this to some kind of UPSERT but SQlite is really tricky for that
    for (const item of items) {
      await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.deleteItem, [item.id]);
    }
    await sqliteService.transaction(DRIVE_DB_NAME, async (tx) => {
      if (items.length > 0) {
        const rows = items.map<InsertSqliteDriveItemRowData>((item) => {
          return {
            id: item.id,
            uuid: item.uuid ?? '',
            bucket: item.bucket,
            color: item.color,
            encrypt_version: item.encrypt_version,
            icon: item.icon,
            icon_id: item.icon_id ?? null,
            is_folder: item.parentId !== undefined,
            created_at: item.createdAt ?? '',
            updated_at: item.updatedAt ?? '',
            file_id: item.fileId,
            // SQlite way to insert double quotes
            name: item.name.toString().replace(/"/g, '\\""'),
            parent_id: item.parentId ?? item.folderId,
            parent_uuid: item.parentUuid ?? '',
            folder_uuid: item.folderUuid ?? '',
            size: item.size,
            type: item.type,
          } as InsertSqliteDriveItemRowData;
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

  public async deleteItem({ id }: { id: number }) {
    const remove = await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.deleteItem, [id]);

    return remove;
  }

  public async updateItemName(itemId: number, newName: string) {
    await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.updateItem, [newName, itemId]);
    await this.updateFolderName(itemId, newName);
  }

  public async updateFolderName(folderId: number, newName: string) {
    const [{ rows }] = await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.updateItem, [
      newName,
      folderId,
    ]);

    return rows.raw;
  }

  public async resetDatabase(): Promise<void> {
    await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.dropTable);
    await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.dropTable);
    await sqliteService.close(DRIVE_DB_NAME);
    await sqliteService.delete(DRIVE_DB_NAME);
    await this.init();
    this.logger.info('Local database reset');
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
        plain_name: row.name,
        deleted: false,
        // TODO: add to database
        parentUuid: row.parent_uuid ?? '',
        uuid: row.uuid ?? '',
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
        type: row.type ?? '',
        updatedAt: row.updated_at,
        thumbnails: row.thumbnails,
        plain_name: row.plain_name,
        currentThumbnail: null,
        // All the items in the DB are marked as EXISTS, trashed and removed ones
        // should not exists in the db for now, we cannot handle those cases
        status: 'EXISTS',
        // TODO: add to database
        folderUuid: row.folder_uuid ?? row.parent_uuid ?? '',
        uuid: row.uuid ?? '',
      };
      result = file;
    }

    return result as DriveItemData;
  }
}

export const driveLocalDB = new DriveLocalDB(driveLogger);
