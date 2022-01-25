import { PhotoStatus } from '@internxt/sdk/dist/photos';

const TABLE_NAME = 'photos';

const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id TEXT PRIMARY KEY, \
      name TEXT NOT NULL, \
      type TEXT NOT NULL, \
      size INTEGER NOT NULL, \
      width INTEGER NOT NULL, \
      height INTEGER NOT NULL, \
      status TEXT NOT NULL, \
      file_id TEXT UNIQUE, \
      preview_id TEXT UNIQUE, \
      device_id TEXT, \
      user_id TEXT NOT NULL, \
      taken_at INTEGER NOT NULL, \
      status_changed_at INTEGER NOT NULL, \
      created_at INTEGER NOT NULL, \
      updated_at INTEGER NOT NULL, \
      preview_path string NOT NULL \
    );`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  insert: `INSERT INTO ${TABLE_NAME} (\
      id, name, type, size, width, height, status, file_id, preview_id, device_id, user_id, taken_at, status_changed_at, created_at, updated_at, preview_path \
    ) \
    VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );`,
  deleteById: `DELETE FROM ${TABLE_NAME} WHERE id = ?;`,
  count: `SELECT COUNT(*) as count FROM ${TABLE_NAME} WHERE status = '${PhotoStatus.Exists}';`,
  get: `SELECT * FROM ${TABLE_NAME} WHERE status = '${PhotoStatus.Exists}' ORDER BY taken_at DESC, created_at DESC LIMIT ? OFFSET ?;`,
  getAll: `SELECT * FROM ${TABLE_NAME} WHERE status = '${PhotoStatus.Exists}';`,
  getPhotoByNameAndType: `SELECT * FROM ${TABLE_NAME} WHERE name = ? AND type = ? LIMIT 1;`,
  getYearsList: `SELECT strftime('%Y', taken_at / 1000, 'unixepoch') as 'year' FROM ${TABLE_NAME};`,
  getLastPhotoOfTheYear: `SELECT preview_path, strftime('%Y', taken_at / 1000, 'unixepoch') as 'year' FROM ${TABLE_NAME} WHERE year = ?;`,
  getLastPhotoOfTheMonth: `SELECT preview_path, strftime('%Y', taken_at / 1000, 'unixepoch') as 'year', strftime('%m', taken_at / 1000, 'unixepoch') as 'month' FROM ${TABLE_NAME} WHERE year = ? AND month = ?;`,
  getMonthsList: `SELECT strftime('%Y', taken_at / 1000, 'unixepoch') as 'year', strftime('%m', taken_at / 1000, 'unixepoch') as 'month' FROM ${TABLE_NAME};`,
  getById: `SELECT * FROM ${TABLE_NAME} WHERE id = ?;`,
  updatePhotoStatusById: `UPDATE ${TABLE_NAME} SET status = ? WHERE id = ?;`,
};

export default {
  statements,
};
