const tableName = 'sync_dates';

const statements = {
  cleanTable: `DELETE FROM ${tableName};`,
  selectCount: `SELECT COUNT(*) as count FROM ${tableName}`,
  createTable:
    `CREATE TABLE IF NOT EXISTS ${tableName} (\
      id TEXT PRIMARY KEY, \
      last_pull_from_remote DATE NOT NULL
    );`,
  getMostRecentPullFromRemoteDate:
    `SELECT last_pull_from_remote as lastPullFromRemote
    FROM ${tableName} 
    LIMIT 1;`,
  dropTable:
    `DROP TABLE ${tableName};`,
  insert:
    `INSERT INTO ${tableName} (last_pull_from_remote) \
    VALUES ( ? );`,
  updateByDate: `UPDATE ${tableName} SET last_pull_from_remote = ?;`
};

export default {
  statements,
};
