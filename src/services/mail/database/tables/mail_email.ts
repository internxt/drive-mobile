const TABLE_NAME = 'mail_email';

const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id TEXT NOT NULL PRIMARY KEY, \
      text_body TEXT NOT NULL, \
      attachments_session_key TEXT NOT NULL, \
      cached_at TEXT NOT NULL \
    );`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  insert: `INSERT OR REPLACE INTO ${TABLE_NAME} (id, text_body, attachments_session_key, cached_at) VALUES (?, ?, ?, ?);`,
  getById: `SELECT * FROM ${TABLE_NAME} WHERE id = ?;`,
  deleteById: `DELETE FROM ${TABLE_NAME} WHERE id = ?;`,
};

export default {
  statements,
};
