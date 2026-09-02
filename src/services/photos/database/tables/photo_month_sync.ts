const TABLE_NAME = 'photo_month_sync';

/**
 * Month folders known to exist in Drive, per device. `last_synced_at` is the high-water mark of
 * the delta sync for that month: the newest `updatedAt` already applied to `cloud_asset`.
 */
const statements = {
  createTable: `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      device_id          TEXT    NOT NULL,
      year               INTEGER NOT NULL,
      month              INTEGER NOT NULL,
      month_folder_uuid  TEXT    NOT NULL,
      last_synced_at     INTEGER,
      PRIMARY KEY (device_id, year, month)
    );
  `,

  /** Keeps `last_synced_at` when the uuid is unchanged; clears it when the folder was recreated. */
  upsert: `
    INSERT INTO ${TABLE_NAME} (device_id, year, month, month_folder_uuid, last_synced_at)
    VALUES (?, ?, ?, ?, NULL)
    ON CONFLICT(device_id, year, month) DO UPDATE SET
      month_folder_uuid = excluded.month_folder_uuid,
      last_synced_at    = CASE
                            WHEN ${TABLE_NAME}.month_folder_uuid = excluded.month_folder_uuid
                              THEN ${TABLE_NAME}.last_synced_at
                            ELSE NULL
                          END;
  `,

  setLastSyncedAt: `
    UPDATE ${TABLE_NAME} SET last_synced_at = ? WHERE device_id = ? AND year = ? AND month = ?;
  `,

  getByDevice: `
    SELECT device_id, year, month, month_folder_uuid, last_synced_at
    FROM ${TABLE_NAME} WHERE device_id = ?;
  `,

  getOne: `
    SELECT device_id, year, month, month_folder_uuid, last_synced_at
    FROM ${TABLE_NAME} WHERE device_id = ? AND year = ? AND month = ?;
  `,

  delete: `DELETE FROM ${TABLE_NAME} WHERE device_id = ? AND year = ? AND month = ?;`,
  deleteByDevice: `DELETE FROM ${TABLE_NAME} WHERE device_id = ?;`,
  countAll: `SELECT COUNT(*) AS total FROM ${TABLE_NAME};`,
  reset: `DELETE FROM ${TABLE_NAME};`,
};

export default { TABLE_NAME, statements };
