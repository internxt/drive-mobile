const TABLE_NAME = 'asset_sync';

const statements = {
  createTable: `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      asset_id          TEXT    PRIMARY KEY NOT NULL,
      status            TEXT    NOT NULL CHECK (status IN ('pending', 'pending_edit', 'synced', 'error')),
      remote_file_id    TEXT,
      error_message     TEXT,
      attempt_count     INTEGER NOT NULL DEFAULT 0,
      created_at        INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      last_attempt_at   INTEGER,
      synced_at         INTEGER,
      modification_time INTEGER,
      file_name         TEXT,
      file_size         INTEGER,
      creation_time     INTEGER,
      width             INTEGER,
      height            INTEGER,
      duration          INTEGER,
      media_type        TEXT
    );
  `,
  createIndex: `CREATE INDEX IF NOT EXISTS idx_asset_sync_status ON ${TABLE_NAME}(status);`,
  dropTable: `DROP TABLE IF EXISTS ${TABLE_NAME};`,

  markPending: `
    INSERT INTO ${TABLE_NAME} (asset_id, status, file_name, creation_time, width, height, duration, media_type)
    VALUES (?, 'pending', ?, ?, ?, ?, ?, ?)
    ON CONFLICT(asset_id) DO UPDATE SET
      status       = 'pending',
      file_name    = COALESCE(excluded.file_name, ${TABLE_NAME}.file_name),
      creation_time = COALESCE(excluded.creation_time, ${TABLE_NAME}.creation_time),
      width        = COALESCE(excluded.width, ${TABLE_NAME}.width),
      height       = COALESCE(excluded.height, ${TABLE_NAME}.height),
      duration     = COALESCE(excluded.duration, ${TABLE_NAME}.duration),
      media_type   = COALESCE(excluded.media_type, ${TABLE_NAME}.media_type)
    WHERE ${TABLE_NAME}.status != 'synced';
  `,

  markPendingEdit: `
    INSERT INTO ${TABLE_NAME} (asset_id, status, file_name, creation_time, width, height, duration, media_type)
    VALUES (?, 'pending_edit', ?, ?, ?, ?, ?, ?)
    ON CONFLICT(asset_id) DO UPDATE SET
      status       = 'pending_edit',
      file_name    = COALESCE(excluded.file_name, ${TABLE_NAME}.file_name),
      creation_time = COALESCE(excluded.creation_time, ${TABLE_NAME}.creation_time),
      width        = COALESCE(excluded.width, ${TABLE_NAME}.width),
      height       = COALESCE(excluded.height, ${TABLE_NAME}.height),
      duration     = COALESCE(excluded.duration, ${TABLE_NAME}.duration),
      media_type   = COALESCE(excluded.media_type, ${TABLE_NAME}.media_type)
    WHERE ${TABLE_NAME}.status = 'synced';
  `,

  markSynced: `
    INSERT INTO ${TABLE_NAME} (asset_id, status, remote_file_id, synced_at, last_attempt_at, modification_time)
    VALUES (?, 'synced', ?, (unixepoch() * 1000), (unixepoch() * 1000), ?)
    ON CONFLICT(asset_id) DO UPDATE SET
      status            = 'synced',
      remote_file_id    = excluded.remote_file_id,
      synced_at         = excluded.synced_at,
      last_attempt_at   = excluded.last_attempt_at,
      modification_time = excluded.modification_time;
  `,

  markError: `
    INSERT INTO ${TABLE_NAME} (asset_id, status, error_message, attempt_count, last_attempt_at)
    VALUES (?, 'error', ?, 1, (unixepoch() * 1000))
    ON CONFLICT(asset_id) DO UPDATE SET
      status          = 'error',
      error_message   = excluded.error_message,
      attempt_count   = ${TABLE_NAME}.attempt_count + 1,
      last_attempt_at = excluded.last_attempt_at
    WHERE ${TABLE_NAME}.status != 'synced';
  `,

  cacheFileSize: `
    UPDATE ${TABLE_NAME} SET file_size = ? WHERE asset_id = ?;
  `,

  getStatus: `
    SELECT asset_id, status, remote_file_id, synced_at, error_message, attempt_count,
           created_at, last_attempt_at, modification_time,
           file_name, file_size, creation_time, width, height, duration, media_type
    FROM ${TABLE_NAME} WHERE asset_id = ?;
  `,
  getSyncedInList: (placeholders: string) =>
    `SELECT asset_id, modification_time FROM ${TABLE_NAME} WHERE asset_id IN (${placeholders}) AND status = 'synced';`,
  getPendingAssets: `SELECT asset_id, status, remote_file_id FROM ${TABLE_NAME} WHERE status != 'synced';`,
  reset: `DELETE FROM ${TABLE_NAME};`,
  getSyncedRemoteFileIds: `SELECT remote_file_id FROM ${TABLE_NAME} WHERE status = 'synced' AND remote_file_id IS NOT NULL;`,
};

export default { TABLE_NAME, statements };
