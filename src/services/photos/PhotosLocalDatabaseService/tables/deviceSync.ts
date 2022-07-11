export const TABLE_NAME = 'device_sync';
const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id INTEGER PRIMARY KEY AUTOINCREMENT, \
      device_photo_id TEXT,
      photo_id TEXT, \
      stage TEXT
    );`,
  getAll: `SELECT * FROM ${TABLE_NAME}`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  selectCount: `SELECT COUNT(*) as count FROM ${TABLE_NAME}`,
  insert: `INSERT INTO ${TABLE_NAME} (device_photo_id, photo_id, stage) \
    VALUES ( ?,?,? );`,
  getByPhotoRef: `SELECT * FROM ${TABLE_NAME} WHERE photo_ref = ?`,
  getByPreviewUri: `SELECT * FROM ${TABLE_NAME} WHERE photo_preview_uri = ?`,
  getByPhotoId: `SELECT * FROM ${TABLE_NAME} WHERE photo_id = ?`,
  getByDevicePhotoId: `SELECT * FROM ${TABLE_NAME} WHERE device_photo_id = ?`,
  updateByPhotoId: `UPDATE ${TABLE_NAME} SET device_photo_id = ? WHERE photo_id = ? `,
};

export default {
  statements,
};
