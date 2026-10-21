import { SqliteFolderRecord } from '../../../types/drive/folder';
import { DriveItemData, InsertSqliteDriveItemRowData, SqliteDriveItemRow } from '../../../types/drive/item';
import { DRIVE_DB_NAME, DRIVE_DB_SCHEMA_VERSION } from '../../../types/drive/operations';
import sqliteService from '../../SqliteService';
import { driveLogger, DriveLogger } from '../logger';
import driveItemTable from './tables/drive_item';
import folderRecordTable from './tables/folder_record';

class DriveLocalDB {
  private readonly logger: DriveLogger;

  constructor(logger: DriveLogger) {
    this.logger = logger;
    this.init();
    this.logger.info('Local database initialized');
  }

  public async init(): Promise<void> {
    await sqliteService.open(DRIVE_DB_NAME);

    const schemaVersionRow = await sqliteService.getFirstAsync<{ user_version: number }>(
      DRIVE_DB_NAME,
      'PRAGMA user_version;',
    );
    const isSchemaOutdated = (schemaVersionRow?.user_version ?? 0) < DRIVE_DB_SCHEMA_VERSION;
    if (isSchemaOutdated) {
      await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.dropTable);
      await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.dropTable);
    }

    await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.createTable);
    await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.createTable);

    if (isSchemaOutdated) {
      await sqliteService.executeSql(DRIVE_DB_NAME, `PRAGMA user_version = ${DRIVE_DB_SCHEMA_VERSION};`);
    }
  }

  public async getDriveItems(parentUuid: string): Promise<DriveItemData[]> {
    const rows = await sqliteService.getAllAsync<SqliteDriveItemRow>(DRIVE_DB_NAME, driveItemTable.statements.get, [
      parentUuid,
    ]);
    const results: DriveItemData[] = [];

    for (const row of rows) {
      results.push(this.mapDriveItemRowToModel(row));
    }

    return results;
  }

  public async getDriveItem(uuid: string): Promise<DriveItemData | null> {
    const row = await sqliteService.getFirstAsync<SqliteDriveItemRow>(DRIVE_DB_NAME, driveItemTable.statements.getOne, [
      uuid,
    ]);

    if (!row) return null;
    return this.mapDriveItemRowToModel(row);
  }

  public async getFolderRecord(folderUuid: string): Promise<SqliteFolderRecord | null> {
    const row = await sqliteService.getFirstAsync<SqliteFolderRecord>(
      DRIVE_DB_NAME,
      folderRecordTable.statements.getByUuid,
      [folderUuid],
    );

    return row;
  }

  public async saveFolderContent(
    folderRecordData: {
      uuid: string;
      parentUuid: string;
      name: string;
      updatedAt: string;
    },
    items: DriveItemData[],
  ) {
    const { uuid, parentUuid, name, updatedAt } = folderRecordData;
    await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.deleteByUuid, [uuid]);
    await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.deleteFolderContent, [uuid]);
    await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.insert, [
      uuid,
      parentUuid ?? '',
      name,
      updatedAt,
      new Date().toString(),
    ]);

    await this.saveItems(items);
  }
  public async saveItems(items: DriveItemData[]) {
    // TODO: Should move this to some kind of UPSERT but SQlite is really tricky for that
    for (const item of items) {
      await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.deleteItem, [item.uuid]);
    }
    await sqliteService.transaction(DRIVE_DB_NAME, async (tx) => {
      if (items.length > 0) {
        const rows = items.map<InsertSqliteDriveItemRowData>((item) => {
          return {
            uuid: item.uuid,
            bucket: item.bucket,
            // color: item.color,
            // encrypt_version: item.encrypt_version,
            // icon: item.icon,
            // icon_id: item.icon_id ?? null,
            is_folder: item.parentId !== undefined,
            created_at: item.createdAt ?? '',
            updated_at: item.updatedAt ?? '',
            file_id: item.fileId,
            // SQlite way to insert double quotes
            name: item.name.toString().replace(/"/g, '\\""'),
            parent_uuid: item.parentUuid ?? '',
            folder_uuid: item.folderUuid ?? '',
            size: item.size,
            type: item.type,
          } as InsertSqliteDriveItemRowData;
        });
        const bulkInsertQuery = driveItemTable.statements.bulkInsert(rows);
        await tx.executeSql(bulkInsertQuery);
      }
    });
  }

  public async deleteFolderContent(folderUuid: string) {
    return sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.deleteFolderContent, [folderUuid]);
  }

  public deleteFolderRecord(folderUuid: string) {
    return sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.deleteByUuid, [folderUuid]);
  }

  public async deleteItem({ uuid }: { uuid: string }) {
    const remove = await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.deleteItem, [uuid]);

    return remove;
  }

  public async updateItemName(itemUuid: string, newName: string) {
    await sqliteService.executeSql(DRIVE_DB_NAME, driveItemTable.statements.updateItem, [newName, itemUuid]);
    await this.updateFolderName(itemUuid, newName);
  }

  public async updateFolderName(folderUuid: string, newName: string) {
    const result = await sqliteService.executeSql(DRIVE_DB_NAME, folderRecordTable.statements.updateItem, [
      newName,
      folderUuid,
    ]);

    return result;
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
    let result;

    if (row.is_folder) {
      const folder = {
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
        user_id: row.user_id,
        plain_name: row.name,
        deleted: false,
        // TODO: add to database
        parentUuid: row.parent_uuid ?? '',
        uuid: row.uuid,
      };
      result = folder;
    } else {
      const file = {
        bucket: row.bucket as string,
        createdAt: row.created_at,
        created_at: row.created_at,
        deleted: false,
        deletedAt: null,
        encrypt_version: row.encrypt_version as string,
        fileId: row.file_id as string,
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
        uuid: row.uuid,
        isFolder: false,
      };
      result = file;
    }

    return result as DriveItemData;
  }
}

export const driveLocalDB = new DriveLocalDB(driveLogger);
