const TABLE_NAME = 'tmp_camera_roll';

const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id INTEGER PRIMARY KEY AUTOINCREMENT, \
      group_name TEXT NOT NULL, \
      timestamp INTEGER NOT NULL, \
      type TEXT NOT NULL, \
      filename TEXT NOT NULL, \
      fileSize INTEGER NOT NULL, \
      width INTEGER NOT NULL, \
      height INTEGER NOT NULL, \
      uri TEXT NOT NULL \
    );`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  insert: `INSERT INTO ${TABLE_NAME} (\
      group_name, timestamp, type, filename, fileSize, width, height, uri \
    ) \
    VALUES ( ?, ?, ?, ?, ?, ?, ?, ? );`,
  bulkInsert: (size: number): string => {
    let query = `INSERT INTO ${TABLE_NAME} (\
      group_name, timestamp, type, filename, fileSize, width, height, uri \
    ) VALUES `;

    for (let i = 0; i < size; i++) {
      query += `( ?, ?, ?, ?, ?, ?, ?, ? )${ i === (size - 1) ? ';' : ',' }`;
    }

    return query;
  },
  count: (options: { from?: Date; to?: Date }): string => {
    const where = getWhereString(options);
    const query = `SELECT COUNT(*) AS count FROM ${TABLE_NAME} ${where};`;

    return query;
  },
  get: (options: { from?: Date; to?: Date; limit: number; skip: number }): string => {
    const where = getWhereString(options);
    const query = `SELECT * FROM ${TABLE_NAME} ${where} ORDER BY timestamp DESC LIMIT ${options.limit} OFFSET ${options.skip};`;

    return query;
  },
};

function getWhereString(filter: { from?: Date; to?: Date }): string {
  let where = filter.from || filter.to ? 'WHERE ' : '';
  where += filter.from ? `timestamp >= ${filter.from.getTime()}` : '';
  where += !!filter.from && !!filter.to ? ' AND ' : '';
  where += filter.to ? `timestamp <= ${filter.to.getTime()}` : '';

  return where;
}

export default {
  statements,
};
