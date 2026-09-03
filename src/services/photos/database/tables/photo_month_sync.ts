const TABLE_NAME = 'photo_month_sync';

/**
 * Month folders known to exist in Drive, per device.
 *
 * Three marks, each answering a different question and none readable as another:
 *
 * - `last_server_updated_at` — the delta's **cursor into the server's content**: the newest
 *   `updatedAt` among the files it has applied. It is a Drive timestamp, so for an old month it
 *   stays old however recently the delta ran. It says where to ask from, never when we asked.
 * - `last_delta_check_at` — local clock, when the delta last asked about the month.
 * - `last_full_sync_at` — local clock, when the full sync last read the month.
 */
const statements = {
  createTable: `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      device_id               TEXT    NOT NULL,
      year                    INTEGER NOT NULL,
      month                   INTEGER NOT NULL,
      month_folder_uuid       TEXT    NOT NULL,
      last_server_updated_at  INTEGER,
      last_delta_check_at     INTEGER,
      last_full_sync_at       INTEGER,
      PRIMARY KEY (device_id, year, month)
    );
  `,

  /** Keeps the three marks when the uuid is unchanged; clears them when the folder was recreated. */
  upsert: `
    INSERT INTO ${TABLE_NAME} (device_id, year, month, month_folder_uuid, last_server_updated_at, last_delta_check_at, last_full_sync_at)
    VALUES (?, ?, ?, ?, NULL, NULL, NULL)
    ON CONFLICT(device_id, year, month) DO UPDATE SET
      month_folder_uuid      = excluded.month_folder_uuid,
      last_server_updated_at = CASE
                                 WHEN ${TABLE_NAME}.month_folder_uuid = excluded.month_folder_uuid
                                   THEN ${TABLE_NAME}.last_server_updated_at
                                 ELSE NULL
                               END,
      last_delta_check_at    = CASE
                                 WHEN ${TABLE_NAME}.month_folder_uuid = excluded.month_folder_uuid
                                   THEN ${TABLE_NAME}.last_delta_check_at
                                 ELSE NULL
                               END,
      last_full_sync_at      = CASE
                                 WHEN ${TABLE_NAME}.month_folder_uuid = excluded.month_folder_uuid
                                   THEN ${TABLE_NAME}.last_full_sync_at
                                 ELSE NULL
                               END;
  `,

  setLastServerUpdatedAt: `
    UPDATE ${TABLE_NAME} SET last_server_updated_at = ? WHERE device_id = ? AND year = ? AND month = ?;
  `,

  setLastDeltaCheckAt: `
    UPDATE ${TABLE_NAME} SET last_delta_check_at = ? WHERE device_id = ? AND year = ? AND month = ?;
  `,

  /** Records a full sync of the month, creating the row if it reached the month before discovery did. */
  markFullySynced: `
    INSERT INTO ${TABLE_NAME} (device_id, year, month, month_folder_uuid, last_server_updated_at, last_delta_check_at, last_full_sync_at)
    VALUES (?, ?, ?, ?, NULL, NULL, ?)
    ON CONFLICT(device_id, year, month) DO UPDATE SET
      month_folder_uuid      = excluded.month_folder_uuid,
      last_full_sync_at      = excluded.last_full_sync_at,
      last_server_updated_at = CASE
                                 WHEN ${TABLE_NAME}.month_folder_uuid = excluded.month_folder_uuid
                                   THEN ${TABLE_NAME}.last_server_updated_at
                                 ELSE NULL
                               END,
      last_delta_check_at    = CASE
                                 WHEN ${TABLE_NAME}.month_folder_uuid = excluded.month_folder_uuid
                                   THEN ${TABLE_NAME}.last_delta_check_at
                                 ELSE NULL
                               END;
  `,

  getLastFullSyncAt: `
    SELECT last_full_sync_at FROM ${TABLE_NAME} WHERE device_id = ? AND year = ? AND month = ?;
  `,

  getByDevice: `
    SELECT device_id, year, month, month_folder_uuid, last_server_updated_at, last_delta_check_at, last_full_sync_at
    FROM ${TABLE_NAME} WHERE device_id = ?;
  `,

  getOne: `
    SELECT device_id, year, month, month_folder_uuid, last_server_updated_at, last_delta_check_at, last_full_sync_at
    FROM ${TABLE_NAME} WHERE device_id = ? AND year = ? AND month = ?;
  `,

  delete: `DELETE FROM ${TABLE_NAME} WHERE device_id = ? AND year = ? AND month = ?;`,
  deleteByDevice: `DELETE FROM ${TABLE_NAME} WHERE device_id = ?;`,
  countAll: `SELECT COUNT(*) AS total FROM ${TABLE_NAME};`,
  reset: `DELETE FROM ${TABLE_NAME};`,
};

/**
 * Additive columns for installs created before they existed. Duplicate-column errors are swallowed.
 *
 * Every nullable column of `createTable` needs an entry here, including the ones that shipped under
 * an earlier name: `CREATE TABLE IF NOT EXISTS` does nothing to a table that already exists, so a
 * renamed column only reaches an existing install through its own `ALTER`.
 */
const migrateAddColumns = [
  `ALTER TABLE ${TABLE_NAME} ADD COLUMN last_server_updated_at INTEGER;`,
  `ALTER TABLE ${TABLE_NAME} ADD COLUMN last_delta_check_at INTEGER;`,
  `ALTER TABLE ${TABLE_NAME} ADD COLUMN last_full_sync_at INTEGER;`,
];

export default { TABLE_NAME, statements, migrateAddColumns };
