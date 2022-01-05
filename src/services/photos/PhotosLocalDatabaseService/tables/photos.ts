const tableName = 'photos';

const statements = {
  cleanTable: `DELETE FROM ${tableName};`,
  createTable: `CREATE TABLE IF NOT EXISTS ${tableName} (\
      id TEXT PRIMARY KEY, \
      name TEXT NOT NULL, \
      type TEXT NOT NULL, \
      size INTEGER NOT NULL, \
      width INTEGER NOT NULL, \
      heigth INTEGER NOT NULL, \
      status TEXT NOT NULL, \
      file_id TEXT UNIQUE, \
      preview_id TEXT UNIQUE, \
      device_id TEXT, \
      user_id TEXT NOT NULL, \
      creation_date DATE NOT NULL, \
      last_status_change_at DATE NOT NULL, \
      preview BLOB NOT NULL \
    );`,
  dropTable: `DROP TABLE ${tableName};`,
  insert: `INSERT INTO ${tableName} (\
      id, name, type, size, width, heigth, status, file_id, preview_id, device_id, user_id, creation_date, last_status_change_at, preview \
    ) \
    VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );`,
  deleteById: `DELETE FROM ${tableName} WHERE id = ?;`,
  count: `SELECT COUNT(*) as count FROM ${tableName};`,
  getAll: `SELECT * FROM ${tableName};`,
  get: `SELECT * FROM ${tableName} LIMIT ? OFFSET ?;`,
  getMostRecentCreationDate: `SELECT MAX(creation_date) as creationDate FROM ${tableName}`,
  getPhotoByName: `SELECT * FROM ${tableName} WHERE name = ? LIMIT 1;`,
  getById: `SELECT * FROM ${tableName} WHERE id = ?;`,
  updatePhotoStatusById: `UPDATE ${tableName} SET status = ? WHERE id = ?;`,
};

export default {
  statements,
};
