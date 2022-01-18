const TABLE_NAME = 'sync_dates';

const statements = {
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id TEXT PRIMARY KEY, \
      remote_sync_at DATE NOT NULL, \
      last_upload_at DATE NOT NULL \
    );`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  selectCount: `SELECT COUNT(*) as count FROM ${TABLE_NAME}`,
  getRemoteSyncAt: `SELECT remote_sync_at as remoteSyncAt
    FROM ${TABLE_NAME} 
    LIMIT 1;`,
  getLastUploadAt: `SELECT last_upload_at as lastUploadAt
    FROM ${TABLE_NAME} 
    LIMIT 1;`,
  insert: `INSERT INTO ${TABLE_NAME} (remote_sync_at, last_upload_at) \
    VALUES ( ?, ? );`,
  setRemoteSyncAt: `UPDATE ${TABLE_NAME} SET remote_sync_at = ?;`,
  setLastUploadAt: `UPDATE ${TABLE_NAME} SET last_upload_at = ?;`,
};

export default {
  statements,
};
