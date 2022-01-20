const TABLE_NAME = 'sync_dates';

const statements = {
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id TEXT PRIMARY KEY, \
      remote_sync_at DATE NOT NULL, \
      newest_date DATE NOT NULL, \
      oldest_date DATE \
    );`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  selectCount: `SELECT COUNT(*) as count FROM ${TABLE_NAME}`,
  getRemoteSyncAt: `SELECT remote_sync_at as remoteSyncAt
    FROM ${TABLE_NAME} 
    LIMIT 1;`,
  getNewestDate: `SELECT newest_date as newestDate
    FROM ${TABLE_NAME} 
    LIMIT 1;`,
  getOldestDate: `SELECT oldest_date as oldestDate
    FROM ${TABLE_NAME} 
    LIMIT 1;`,
  insert: `INSERT INTO ${TABLE_NAME} (remote_sync_at, newest_date, oldest_date) \
    VALUES ( ?, ?, ? );`,
  setRemoteSyncAt: `UPDATE ${TABLE_NAME} SET remote_sync_at = ?;`,
  setNewestDate: `UPDATE ${TABLE_NAME} SET newest_date = ?;`,
  setOldestDate: `UPDATE ${TABLE_NAME} SET oldest_date = ?;`,
};

export default {
  statements,
};
