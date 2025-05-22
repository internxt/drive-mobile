const TABLE_NAME = 'folder_record';

const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id INTEGER NOT NULL, \
      uuid TEXT, \
      parent_id INTEGER, \
      parent_uuid TEXT, \
      name TEXT NOT NULL, \
      updated_at TEXT NOT NULL, \
      date TEXT NOT NULL \
    );`,
  updateItem: `UPDATE ${TABLE_NAME} SET name = ? WHERE id = ?;`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  insert: `INSERT INTO ${TABLE_NAME} (id, uuid, parent_id, parent_uuid, name, updated_at, date) VALUES (?, ?, ?, ?, ?, ?, ?);`,
  getById: `SELECT * FROM ${TABLE_NAME} WHERE id = ?;`,
  deleteById: `DELETE FROM ${TABLE_NAME} WHERE id = ?;`,
};

export default {
  statements,
};
