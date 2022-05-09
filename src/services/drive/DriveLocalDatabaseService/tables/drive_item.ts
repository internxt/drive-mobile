import { InsertSqliteDriveItemRowData } from '../../../../types/drive';

const TABLE_NAME = 'drive_item';

const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id INTEGER PRIMARY KEY, \
      bucket TEXT, \
      color TEXT, \
      encrypt_version TEXT, \
      icon TEXT, \
      icon_id INTEGER, \
      is_folder INTEGER NOT NULL, \
      name TEXT NOT NULL, \
      parent_id INTEGER NOT NULL, \
      user_id TEXT, \
      file_id TEXT, \
      size INTEGER, \
      type TEXT, \
      created_at TEXT NOT NULL, \
      updated_at TEXT NOT NULL, \
    );`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  bulkInsert: (rows: InsertSqliteDriveItemRowData[]): string => {
    let query = `INSERT INTO ${TABLE_NAME} (\
      id, bucket, color, encrypt_version, icon, icon_id, is_folder, name, parent_id, user_id, file_id, size, type, created_at, updated_at \
    ) VALUES `;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const isTheLastRow = i === rows.length - 1;

      query += '(';
      query += `"${row.id}", `;
      query += row.bucket ? `"${row.bucket}",` : `${null},`;
      query += row.color ? `"${row.color}", ` : `${null},`;
      query += row.encrypt_version ? `"${row.encrypt_version}", ` : `${null},`;
      query += row.icon ? `"${row.icon}", ` : `${null},`;
      query += `${row.icon_id}, `;
      query += `${row.is_folder}, `;
      query += `"${row.name}", `;
      query += `${row.parent_id}, `;
      query += row.user_id ? `"${row.user_id}", ` : `${null},`;
      query += row.file_id ? `"${row.file_id}", ` : `${null},`;
      query += `${row.size}, `;
      query += row.type ? `"${row.type}", ` : `${null},`;
      query += `"${row.created_at}", `;
      query += `"${row.updated_at}")`;
      query += isTheLastRow ? ';' : ',';
    }

    console.log('query: ' + query);

    return query;
  },
  deleteFolderContent: `DELETE FROM ${TABLE_NAME} WHERE parent_id = ?;`,
  get: (options: { parentId: number }): string => {
    const query = `SELECT * FROM ${TABLE_NAME} WHERE parent_id=${options.parentId} ORDER BY timestamp DESC;`;

    return query;
  },
};

export default {
  statements,
};
