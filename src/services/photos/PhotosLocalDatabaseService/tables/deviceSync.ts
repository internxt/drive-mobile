export const TABLE_NAME = 'device_sync';
const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id INTEGER PRIMARY KEY AUTOINCREMENT, \
      photo_id TEXT, \
      device_photo_id TEXT NOT NULL,
      photo_ref TEXT NOT NULL, \
      stage TEXT
    );`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  selectCount: `SELECT COUNT(*) as count FROM ${TABLE_NAME}`,
  insert: `INSERT INTO ${TABLE_NAME} (device_photo_id, photo_id, photo_ref, stage) \
    VALUES ( ?,?,?,? );`,
  getByPhotoRef: `SELECT * FROM ${TABLE_NAME} WHERE photo_ref = ?`,
  getByDevicePhotoId: `SELECT * FROM ${TABLE_NAME} WHERE device_photo_id = ?`,
  getByPhotoId: `SELECT * FROM ${TABLE_NAME} WHERE photo_id = ?`,
  updateByPhotoId: `UPDATE ${TABLE_NAME} SET photo_ref = ? WHERE photo_id = ? `,
};

export default {
  statements,
};
