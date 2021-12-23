const statements = {
  createTable:
    'CREATE TABLE IF NOT EXISTS device (\
    id TEXT PRIMARY KEY, \
    mac TEXT UNIQUE, \
    name TEXT NOT NULL, \
    userId TEXT NOT NULL, \
    createdAt TEXT NOT NULL, \
    updatedAt TEXT NOT NULL\
    );',
  insert:
    'INSERT INTO device (\
      id, mac, name, userId, createdAt, updatedAt\
    ) \
    VALUES ( ?, ?, ?, ?, ?, ?);',
  deleteById: 'DELETE FROM device WHERE id = ?;',
  getById: 'SELECT * FROM device WHERE id = ?;',
  getAll: 'SELECT * FROM device;',
};

export default {
  statements,
};
