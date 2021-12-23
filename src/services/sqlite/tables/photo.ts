const statements: Record<string, string> = {
  createTable:
    'CREATE TABLE IF NOT EXISTS photo(\
    id TEXT PRIMARY KEY, \
    name TEXT NOT NULL, \
    type TEXT NOT NULL, \
    size INTEGER NOT NULL, \
    width INTEGER NOT NULL, \
    heigth INTEGER NOT NULL, \
    fileId TEXT UNIQUE, \
    previewId TEXT UNIQUE, \
    deviceId TEXT UNIQUE, \
    userUuid TEXT NOT NULL \
    );',
  insert:
    'INSERT INTO photo (\
      id, name, type, size, width, heigth, fileId, previewId, deviceId, userUuid\
    ) \
    VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
  deleteById: 'DELETE FROM photo WHERE id = ?;',
  getAll: 'SELECT * FROM photo;',
};

export default {
  statements,
};
