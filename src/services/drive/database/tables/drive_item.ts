import { InsertSqliteDriveItemRowData } from '../../../../types/drive/item';

const TABLE_NAME = 'drive_item';

const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      uuid TEXT NOT NULL, \
      bucket TEXT, \
      color TEXT, \
      encrypt_version TEXT, \
      icon TEXT, \
      icon_id INTEGER, \
      is_folder INTEGER NOT NULL, \
      name TEXT NOT NULL, \
      parent_uuid TEXT, \
      user_id TEXT, \
      file_id TEXT, \
      folder_uuid TEXT, \
      size INTEGER, \
      type TEXT, \
      created_at TEXT NOT NULL, \
      updated_at TEXT NOT NULL \
    );`,
  dropTable: `DROP TABLE IF EXISTS ${TABLE_NAME};`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  bulkInsert: (rows: InsertSqliteDriveItemRowData[]): string => {
    let query = `INSERT INTO ${TABLE_NAME} (\
      uuid, bucket, color, encrypt_version, icon, icon_id, is_folder, name, parent_uuid, user_id, file_id, folder_uuid, size, type, created_at, updated_at \
    ) VALUES `;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const isTheLastRow = i === rows.length - 1;

      query += '(';
      query += `"${row.uuid}", `;
      query += row.bucket ? `"${row.bucket}",` : `${null},`;
      query += row.color ? `"${row.color}", ` : `${null},`;
      query += row.encrypt_version ? `"${row.encrypt_version}", ` : `${null},`;
      query += row.icon ? `"${row.icon}", ` : `${null},`;
      query += `${row.icon_id || null}, `;
      query += `${row.is_folder ? 1 : 0}, `;
      query += `"${row.name}", `;
      query += row.parent_uuid ? `"${row.parent_uuid}", ` : `${null},`;
      query += row.user_id ? `"${row.user_id}", ` : `${null},`;
      query += row.file_id ? `"${row.file_id}", ` : `${null},`;
      query += row.folder_uuid ? `"${row.folder_uuid}", ` : `${null},`;
      query += `${row.size || null}, `;
      query += row.type ? `"${row.type}", ` : `${null},`;
      query += `"${row.created_at}", `;
      query += `"${row.updated_at}")`;
      query += isTheLastRow ? ';' : ',';
    }

    return query;
  },
  deleteFolderContent: `DELETE FROM ${TABLE_NAME} WHERE parent_uuid = ?;`,
  deleteItem: `DELETE FROM ${TABLE_NAME} WHERE uuid = ?;`,
  updateItem: `UPDATE ${TABLE_NAME} SET name = ? WHERE uuid = ?;`,
  getOne: `SELECT * FROM ${TABLE_NAME} WHERE uuid = ?`,
  get: `SELECT * FROM ${TABLE_NAME} WHERE parent_uuid = ? ORDER BY is_folder ASC;`,
};

export default {
  statements,
};
