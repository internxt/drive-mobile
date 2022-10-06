import { Photo } from '@internxt/sdk/dist/photos';

export const TABLE_NAME = 'synced_photos';

export type SynchedPhotoRow = {
  photo_id: string;
  photo_name: string;
  photo_hash: string;
  photo: Photo;
};
const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      photo_id TEXT UNIQUE,  \
      photo_name TEXT, \
      photo_hash TEXT, \
      photo_taken_at INTEGER,   \
      photo TEXT
    );`,

  dropTable: `DROP TABLE ${TABLE_NAME}`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  insert: `INSERT INTO ${TABLE_NAME} (photo_id, photo_name, photo_hash, photo) VALUES (?,?,?,?);`,
  deleteSyncedPhotoByPhotoId: `DELETE FROM ${TABLE_NAME} WHERE photo_id = ? `,
  getSyncedPhotos: `SELECT * FROM ${TABLE_NAME}`,
  getSyncedPhotoByName: `SELECT * FROM ${TABLE_NAME} WHERE photo_name = ?`,
  getSyncedPhotoByHash: `SELECT * FROM ${TABLE_NAME} WHERE photo_hash = ?`,
  getSyncedPhotoByNameAndDate: `SELECT * FROM ${TABLE_NAME} WHERE photo_name = ? AND photo_taken_at = ? `,
  getSyncedPhotoByPhotoId: `SELECT * FROM ${TABLE_NAME} WHERE photo_id = ?  `,
  updatePhotoById: `UPDATE ${TABLE_NAME} SET photo = ? WHERE photo_id = ? `,
};

export default {
  statements,
};
