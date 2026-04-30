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
      modification_time INTEGER
    );
  `,
  createIndex: `CREATE INDEX IF NOT EXISTS idx_asset_sync_status ON ${TABLE_NAME}(status);`,
  dropTable: `DROP TABLE IF EXISTS ${TABLE_NAME};`,

  markPending: `
    INSERT INTO ${TABLE_NAME} (asset_id, status)
    VALUES (?, 'pending')
    ON CONFLICT(asset_id) DO UPDATE SET status = 'pending'
    WHERE ${TABLE_NAME}.status != 'synced';
  `,

  markPendingEdit: `
    INSERT INTO ${TABLE_NAME} (asset_id, status)
    VALUES (?, 'pending_edit')
    ON CONFLICT(asset_id) DO UPDATE SET status = 'pending_edit'
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

  getStatus: `
    SELECT asset_id, status, remote_file_id, synced_at, error_message, attempt_count, created_at, last_attempt_at, modification_time
    FROM ${TABLE_NAME} WHERE asset_id = ?;
  `,
  getSyncedInList: (placeholders: string) =>
    `SELECT asset_id, modification_time FROM ${TABLE_NAME} WHERE asset_id IN (${placeholders}) AND status = 'synced';`,
  getPendingAssets: `SELECT asset_id, status, remote_file_id FROM ${TABLE_NAME} WHERE status != 'synced';`,
  reset: `DELETE FROM ${TABLE_NAME};`,
};

export default { TABLE_NAME, statements };
