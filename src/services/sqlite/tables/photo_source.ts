const statements = {
  createTable:
    'CREATE TABLE IF NOT EXISTS photo_source (\
    id INTEGER PRIMARY KEY, \
    photoId TEXT unique, \
    previewSource BLOB NOT NULL, \
    photoSource BLOB \
  )',
  insert: 'INSERT INTO photo_source (\
      photoId, previewSource, photoSource\
    ) \
    VALUES ( ?, ?, ?);',
  deleteByPhotoId: 'DELETE FROM photo_source WHERE photoId = ?;',
  getByPhotoId: 'SELECT * FROM photo_source WHERE photoId = ?;',
};

export default {
  statements,
};
