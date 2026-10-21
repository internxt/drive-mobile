const TABLE_NAME = 'folder_record';

const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      uuid TEXT NOT NULL, \
      parent_uuid TEXT, \
      name TEXT NOT NULL, \
      updated_at TEXT NOT NULL, \
      date TEXT NOT NULL \
    );`,
  updateItem: `UPDATE ${TABLE_NAME} SET name = ? WHERE uuid = ?;`,
  dropTable: `DROP TABLE IF EXISTS ${TABLE_NAME};`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  insert: `INSERT INTO ${TABLE_NAME} (uuid, parent_uuid, name, updated_at, date) VALUES (?, ?, ?, ?, ?);`,
  getByUuid: `SELECT * FROM ${TABLE_NAME} WHERE uuid = ?;`,
  deleteByUuid: `DELETE FROM ${TABLE_NAME} WHERE uuid = ?;`,
};

export default {
  statements,
};
