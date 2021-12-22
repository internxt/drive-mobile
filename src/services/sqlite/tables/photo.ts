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
};

export default {
  statements,
};
