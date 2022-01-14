const TABLE_NAME = 'photo_source';

const statements = {
  createTable:
    'CREATE TABLE IF NOT EXISTS photo_source (\
    id INTEGER PRIMARY KEY, \
    photo_id TEXT unique, \
    preview_source BLOB NOT NULL, \
    photo_source BLOB \
  )',
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  insert: 'INSERT INTO photo_source (\
      photo_id, preview_source, photo_source\
    ) \
    VALUES (?, ?, ?);',
  deleteByPhotoId: 'DELETE FROM photo_source WHERE photo_id = ?;',
  getByPhotoId: 'SELECT * FROM photo_source WHERE photo_id = ?;',
};

export default {
  statements,
};
