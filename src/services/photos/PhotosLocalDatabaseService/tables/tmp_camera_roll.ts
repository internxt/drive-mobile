import { CreateSqliteTmpCameraRollRowData } from '../../../../types/photos';

const TABLE_NAME = 'tmp_camera_roll';

const statements = {
  createTable: `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (\
      id INTEGER PRIMARY KEY AUTOINCREMENT, \
      group_name TEXT NOT NULL, \
      timestamp INTEGER NOT NULL, \
      type TEXT NOT NULL, \
      filename TEXT NOT NULL, \
      file_size INTEGER NOT NULL, \
      width INTEGER NOT NULL, \
      height INTEGER NOT NULL, \
      uri TEXT NOT NULL \
    );`,
  dropTable: `DROP TABLE ${TABLE_NAME};`,
  cleanTable: `DELETE FROM ${TABLE_NAME};`,
  insert: `INSERT INTO ${TABLE_NAME} (\
      group_name, timestamp, type, filename, file_size, width, height, uri \
    ) \
    VALUES ( ?, ?, ?, ?, ?, ?, ?, ? );`,
  bulkInsert: (rows: CreateSqliteTmpCameraRollRowData[]): string => {
    let query = `INSERT INTO ${TABLE_NAME} (\
      group_name, timestamp, type, filename, file_size, width, height, uri \
    ) VALUES `;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const isTheLastRow = i === rows.length - 1;

      query += '(';
      query += `"${row.group_name}",`;
      query += `${row.timestamp}, `;
      query += `"${row.type}", `;
      query += `"${row.filename}", `;
      query += `${row.file_size}, `;
      query += `${row.width}, `;
      query += `${row.height}, `;
      query += `"${row.uri}")`;
      query += isTheLastRow ? ';' : ',';
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
