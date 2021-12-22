const statements: Record<string, string> = {
  createTable:
    'CREATE TABLE IF NOT EXISTS photo_source(\
    id INTEGER PRIMARY KEY, \
    photoId TEXT unique, \
    previewSource BLOB NOT NULL, \
    photoSource BLOB \
  )',
};

export default {
  statements,
};
