const TABLE_NAME = 'sync_dates';

const statements = {
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id TEXT PRIMARY KEY, \
      updated_at DATE NOT NULL \
    );`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  selectCount: `SELECT COUNT(*) as count FROM ${TABLE_NAME}`,
  getUpdatedAt: `SELECT updated_at as updatedAt
    FROM ${TABLE_NAME} 
    LIMIT 1;`,
  insert: `INSERT INTO ${TABLE_NAME} (updated_at) \
    VALUES ( ? );`,
  setUpdatedAt: `UPDATE ${TABLE_NAME} SET updated_at = ?;`,
};

export default {
  statements,
};
