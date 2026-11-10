const TABLE_NAME = 'photo_day_folder';

/**
 * Day folders known to exist in Drive. The delta endpoint is asked for changes by day-folder uuid,
 * so this is the list that fills its `folderUuids` array.
 */
const statements = {
  createTable: `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      day_folder_uuid  TEXT    PRIMARY KEY NOT NULL,
      device_id        TEXT    NOT NULL,
      year             INTEGER NOT NULL,
      month            INTEGER NOT NULL,
      day              INTEGER NOT NULL
    );
  `,
  createIndexMonth: `CREATE INDEX IF NOT EXISTS idx_photo_day_folder_month ON ${TABLE_NAME}(device_id, year, month);`,

  upsert: `
    INSERT INTO ${TABLE_NAME} (day_folder_uuid, device_id, year, month, day)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(day_folder_uuid) DO UPDATE SET
      device_id = excluded.device_id,
      year      = excluded.year,
      month     = excluded.month,
      day       = excluded.day;
  `,

  getByMonth: `
    SELECT day_folder_uuid, device_id, year, month, day
    FROM ${TABLE_NAME} WHERE device_id = ? AND year = ? AND month = ?;
  `,

  getByDevice: `
    SELECT day_folder_uuid, device_id, year, month, day
    FROM ${TABLE_NAME} WHERE device_id = ?;
  `,

  deleteByUuids: (placeholders: string) =>
    `DELETE FROM ${TABLE_NAME} WHERE day_folder_uuid IN (${placeholders});`,
  deleteByMonth: `DELETE FROM ${TABLE_NAME} WHERE device_id = ? AND year = ? AND month = ?;`,
  deleteByDevice: `DELETE FROM ${TABLE_NAME} WHERE device_id = ?;`,
  countAll: `SELECT COUNT(*) AS total FROM ${TABLE_NAME};`,
  reset: `DELETE FROM ${TABLE_NAME};`,
};

export default { TABLE_NAME, statements };
