import {
  DriveFileData,
  DriveFolderData,
  FetchFolderContentResponse,
  FolderChild,
} from '@internxt/sdk/dist/drive/storage/types';
import {
  DRIVE_DB_NAME,
  SqliteDriveItemRow,
  DriveItemData,
  InsertSqliteDriveItemRowData,
  SqliteDriveFolderRecord,
} from '../../../types/drive';
import sqliteService from '../../SqliteService';
import { driveLogger, DriveLogger } from '../logger';
import driveItemTable from './tables/drive_item';
import folderRecordTable from './tables/folder_record';
import _ from 'lodash';

export interface DriveRowItem {
  id: number;
  bucket?: string;
  color: string | null;
  name: string;
  encrypt_version: string;
  parentId: number | null;
  fileId?: string;
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
    folderRecordData: { id: number; parentId: number; name: string; updatedAt: string },
    items: DriveItemData[],
  ) {
    const { id, parentId, name, updatedAt } = folderRecordData;
    await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.deleteById, [id]);
    await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.deleteFolderContent, [id]);
    await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.insert, [
      id,
      parentId,
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
            bucket: item.bucket,
            color: item.color,
            encrypt_version: item.encrypt_version,
            icon: item.icon,
            icon_id: item.icon_id || null,
            is_folder: item.parentId !== undefined,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
            file_id: item.fileId,
            // SQlite way to insert double quotes
            name: item.name.toString().replace(/"/g, '\\""'),
            parent_id: item.parentId || item.folderId,
            size: item.size,
            type: item.type,
            user_id: item.userId,
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

  public async deleteItem({ id, isFolder }: { id: number; isFolder: boolean }) {
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
        thumbnails: row.thumbnails,
        currentThumbnail: row.currentThumbnail,
        plain_name: row.name,
      };
      result = file;
    }

    return result as DriveItemData;
  }

  async getFolderContent(folderId: number): Promise<FetchFolderContentResponse | null> {
    const [items, folderContent] = await Promise.all([this.getDriveItems(folderId), this.getFolderRecord(folderId)]);
    if (!folderContent) return null;
    return {
      name: folderContent.name,
      icon: '',
      parent_id: folderContent.parent_id,
      parentId: folderContent.parent_id,
      bucket: '-',
      color: '',
      createdAt: '-',
      encrypt_version: '-',
      id: folderId,
      plain_name: folderContent.name,
      updatedAt: folderContent.updated_at,
      user_id: -1,
      userId: -1,
      files: items.filter((item) => item.type),
      children: items
        .filter((item) => !item.type)
        .map<FolderChild>((item) => {
          return {
            ...item,
            parent_id: item.parentId || folderId,
            parentId: item.parentId || folderId,
            icon: item.icon || '-',
            name: item.name,
            plain_name: item.plain_name,
            color: item.color || '-',
          };
        }),
    };
  }
}

export const driveLocalDB = new DriveLocalDB(driveLogger);
