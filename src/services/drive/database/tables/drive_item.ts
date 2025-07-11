import { InsertSqliteDriveItemRowData } from '../../../../types/drive';

const TABLE_NAME = 'drive_item';

const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id INTEGER NOT NULL, \
      uuid TEXT, \
      bucket TEXT, \
      color TEXT, \
      encrypt_version TEXT, \
      icon TEXT, \
      icon_id INTEGER, \
      is_folder INTEGER NOT NULL, \
      name TEXT NOT NULL, \
      parent_id INTEGER, \
      parent_uuid TEXT, \
      user_id TEXT, \
      file_id TEXT, \
      folder_uuid TEXT, \
      size INTEGER, \
      type TEXT, \
      created_at TEXT NOT NULL, \
      updated_at TEXT NOT NULL \
    );`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  bulkInsert: (rows: InsertSqliteDriveItemRowData[]): string => {
    let query = `INSERT INTO ${TABLE_NAME} (\
      id, uuid, bucket, color, encrypt_version, icon, icon_id, is_folder, name, parent_id, parent_uuid, user_id, file_id, folder_uuid, size, type, created_at, updated_at \
    ) VALUES `;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const isTheLastRow = i === rows.length - 1;

      query += '(';
      query += `"${row.id}", `;
      query += row.uuid ? `"${row.uuid}",` : `${null},`;
      query += row.bucket ? `"${row.bucket}",` : `${null},`;
      query += row.color ? `"${row.color}", ` : `${null},`;
      query += row.encrypt_version ? `"${row.encrypt_version}", ` : `${null},`;
      query += row.icon ? `"${row.icon}", ` : `${null},`;
      query += `${row.icon_id || null}, `;
      query += `${row.is_folder ? 1 : 0}, `;
      query += `"${row.name}", `;
      query += `${row.parent_id || null}, `;
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
  deleteFolderContent: `DELETE FROM ${TABLE_NAME} WHERE parent_id = ?;`,
  deleteItem: `DELETE FROM ${TABLE_NAME} WHERE id = ?;`,
  updateItem: `UPDATE ${TABLE_NAME} SET name = ? WHERE id = ?;`,
  getOne: `SELECT * FROM ${TABLE_NAME} WHERE id = ?`,
  get: (options: { parentId: number }): string => {
    const query = `SELECT * FROM ${TABLE_NAME} WHERE parent_id=${options.parentId} ORDER BY is_folder ASC;`;

    return query;
  },
};

export default {
  statements,
};
