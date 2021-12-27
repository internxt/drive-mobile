const tableName = 'photos';

const statements = {
  createTable:
    `CREATE TABLE IF NOT EXISTS ${tableName} (\
      id TEXT PRIMARY KEY, \
      name TEXT NOT NULL, \
      type TEXT NOT NULL, \
      size INTEGER NOT NULL, \
      width INTEGER NOT NULL, \
      heigth INTEGER NOT NULL, \
      file_id TEXT UNIQUE, \
      preview_id TEXT UNIQUE, \
      device_id TEXT, \
      user_id TEXT NOT NULL, \
      creation_date DATE NOT NULL, \
      last_status_change_at DATE NOT NULL, \
      preview BLOB NOT NULL \
    );`,
  dropTable:
    `DROP TABLE ${tableName};`,
  insert:
    `INSERT INTO ${tableName} (\
      id, name, type, size, width, heigth, file_id, preview_id, device_id, user_id, creation_date, last_status_change_at, preview \
    ) \
    VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );`,
  deleteById: `DELETE FROM ${tableName} WHERE id = ?;`,
  getAll: `SELECT * FROM ${tableName};`,
  getMostRecentUpdatedAt: `SELECT MAX(updated_at) FROM ${tableName}`
};

export default {
  statements,
};
