const TABLE_NAME = 'folder_record';

const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id INTEGER PRIMARY KEY, \
      parent_id INTEGER, \
      name TEXT NOT NULL, \
      updated_at TEXT NOT NULL, \
      date TEXT NOT NULL \
    );`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  insert: `INSERT INTO ${TABLE_NAME} (id, parent_id, name, updated_at, date) VALUES (?, ?, ?, ?, ?);`,
  getById: `SELECT * FROM ${TABLE_NAME} WHERE id = ?;`,
  deleteById: `DELETE FROM ${TABLE_NAME} WHERE id = ?;`,
};

export default {
  statements,
};
