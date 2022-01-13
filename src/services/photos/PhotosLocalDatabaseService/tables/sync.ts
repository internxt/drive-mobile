const tableName = 'sync_dates';

const statements = {
  cleanTable: `DELETE FROM ${tableName};`,
  selectCount: `SELECT COUNT(*) as count FROM ${tableName}`,
  createTable: `CREATE TABLE IF NOT EXISTS ${tableName} (\
      id TEXT PRIMARY KEY, \
      last_pull_from_remote DATE NOT NULL, \
      status_updated_date DATE NOT NULL \
    );`,
  getStatusUpdatedDate: `SELECT status_updated_date as statusUpdatedDate
    FROM ${tableName} 
    LIMIT 1;`,
  getMostRecentPullFromRemoteDate: `SELECT last_pull_from_remote as lastPullFromRemote
    FROM ${tableName} 
    LIMIT 1;`,
  dropTable: `DROP TABLE ${tableName};`,
  insert: `INSERT INTO ${tableName} (last_pull_from_remote, status_updated_date) \
    VALUES ( ?, ? );`,
  updateByDate: `UPDATE ${tableName} SET last_pull_from_remote = ?;`,
  updateStatusUpdatedDate: `UPDATE ${tableName} SET status_updated_date = ?;`,
};

export default {
  statements,
};
