import { PhotoStatus } from '@internxt/sdk/dist/photos';

const TABLE_NAME = 'photos';

const statements = {
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id TEXT PRIMARY KEY, \
      name TEXT NOT NULL, \
      type TEXT NOT NULL, \
      size INTEGER NOT NULL, \
      width INTEGER NOT NULL, \
      heigth INTEGER NOT NULL, \
      status TEXT NOT NULL, \
      file_id TEXT UNIQUE, \
      preview_id TEXT UNIQUE, \
      device_id TEXT, \
      user_id TEXT NOT NULL, \
      taken_at DATE NOT NULL, \
      status_changed_at DATE NOT NULL, \
      created_at DATE NOT NULL, \
      updated_at DATE NOT NULL \
    );`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  insert: `INSERT INTO ${TABLE_NAME} (\
      id, name, type, size, width, heigth, status, file_id, preview_id, device_id, user_id, taken_at, status_changed_at, created_at, updated_at \
    ) \
    VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );`,
  deleteById: `DELETE FROM ${TABLE_NAME} WHERE id = ?;`,
  count: `SELECT COUNT(*) as count FROM ${TABLE_NAME} WHERE status = '${PhotoStatus.Exists}';`,
  getAll: `SELECT * FROM ${TABLE_NAME} WHERE status = '${PhotoStatus.Exists}';`,
  get: `SELECT * FROM ${TABLE_NAME} WHERE status = '${PhotoStatus.Exists}' ORDER BY created_at DESC LIMIT ? OFFSET ?;`,
  getMostRecentTakenAt: `SELECT MAX(taken_at) as takenAt FROM ${TABLE_NAME}`,
  getPhotoByNameAndType: `SELECT * FROM ${TABLE_NAME} WHERE name = ? AND type = ? LIMIT 1;`,
  getById: `SELECT * FROM ${TABLE_NAME} WHERE id = ?;`,
  updatePhotoStatusById: `UPDATE ${TABLE_NAME} SET status = ? WHERE id = ?;`,
};

export default {
  statements,
};
