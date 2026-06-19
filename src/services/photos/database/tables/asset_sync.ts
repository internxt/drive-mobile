const TABLE_NAME = 'asset_sync';

const statements = {
  createTable: `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      asset_id                    TEXT    PRIMARY KEY NOT NULL,
      status                      TEXT    NOT NULL CHECK (status IN ('pending', 'pending_edit', 'synced', 'error', 'deleted', 'cloud_deleted')),
      remote_file_id              TEXT,
      error_message               TEXT,
      attempt_count               INTEGER NOT NULL DEFAULT 0,
      created_at                  INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      last_attempt_at             INTEGER,
      synced_at                   INTEGER,
      deleted_at                  INTEGER,
      modification_time           INTEGER,
      file_name                   TEXT,
      file_size                   INTEGER,
      creation_time               INTEGER,
      width                       INTEGER,
      height                      INTEGER,
      duration                    INTEGER,
      media_type                  TEXT,
      is_live_photo               INTEGER NOT NULL DEFAULT 0,
      paired_video_remote_file_id TEXT,
      paired_video_status         TEXT,
      -- BURST: burst photo columns (iOS only). Clean install required when adding these.
      is_burst                    INTEGER NOT NULL DEFAULT 0,
      burst_id                    TEXT,
      burst_member_remote_file_ids TEXT,
      burst_member_count          INTEGER
    );
  `,
  createIndex: `CREATE INDEX IF NOT EXISTS idx_asset_sync_status ON ${TABLE_NAME}(status);`,
  dropTable: `DROP TABLE IF EXISTS ${TABLE_NAME};`,

  markPending: `
    INSERT INTO ${TABLE_NAME} (asset_id, status, file_name, creation_time, width, height, duration, media_type, is_live_photo, is_burst)
    VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(asset_id) DO UPDATE SET
      status        = 'pending',
      file_name     = COALESCE(excluded.file_name, ${TABLE_NAME}.file_name),
      creation_time = COALESCE(excluded.creation_time, ${TABLE_NAME}.creation_time),
      width         = COALESCE(excluded.width, ${TABLE_NAME}.width),
      height        = COALESCE(excluded.height, ${TABLE_NAME}.height),
      duration      = COALESCE(excluded.duration, ${TABLE_NAME}.duration),
      media_type    = COALESCE(excluded.media_type, ${TABLE_NAME}.media_type),
      is_live_photo = excluded.is_live_photo,
      -- BURST: persist burst flag from discovery so the upload pass can detect incomplete bursts.
      is_burst      = excluded.is_burst
    WHERE ${TABLE_NAME}.status != 'synced';
  `,

  markPendingEdit: `
    INSERT INTO ${TABLE_NAME} (asset_id, status, file_name, creation_time, width, height, duration, media_type, is_live_photo, is_burst)
    VALUES (?, 'pending_edit', ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(asset_id) DO UPDATE SET
      status        = 'pending_edit',
      file_name     = COALESCE(excluded.file_name, ${TABLE_NAME}.file_name),
      creation_time = COALESCE(excluded.creation_time, ${TABLE_NAME}.creation_time),
      width         = COALESCE(excluded.width, ${TABLE_NAME}.width),
      height        = COALESCE(excluded.height, ${TABLE_NAME}.height),
      duration      = COALESCE(excluded.duration, ${TABLE_NAME}.duration),
      media_type    = COALESCE(excluded.media_type, ${TABLE_NAME}.media_type),
      is_live_photo = excluded.is_live_photo,
      -- BURST:
      is_burst      = excluded.is_burst
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

  markSyncedLivePhoto: `
    INSERT INTO ${TABLE_NAME} (asset_id, status, remote_file_id, synced_at, last_attempt_at, modification_time,
                               is_live_photo, paired_video_remote_file_id, paired_video_status)
    VALUES (?, 'synced', ?, (unixepoch() * 1000), (unixepoch() * 1000), ?, 1, ?, ?)
    ON CONFLICT(asset_id) DO UPDATE SET
      status                      = 'synced',
      remote_file_id              = excluded.remote_file_id,
      synced_at                   = excluded.synced_at,
      last_attempt_at             = excluded.last_attempt_at,
      modification_time           = excluded.modification_time,
      is_live_photo               = 1,
      paired_video_remote_file_id = excluded.paired_video_remote_file_id,
      paired_video_status         = excluded.paired_video_status;
  `,

  // BURST: marks a burst representative as synced with its member uuids (iOS only).
  markSyncedBurst: `
    INSERT INTO ${TABLE_NAME} (asset_id, status, remote_file_id, synced_at, last_attempt_at, modification_time,
                               is_burst, burst_id, burst_member_remote_file_ids, burst_member_count)
    VALUES (?, 'synced', ?, (unixepoch() * 1000), (unixepoch() * 1000), ?, 1, ?, ?, ?)
    ON CONFLICT(asset_id) DO UPDATE SET
      status                       = 'synced',
      remote_file_id               = excluded.remote_file_id,
      synced_at                    = excluded.synced_at,
      last_attempt_at              = excluded.last_attempt_at,
      modification_time            = excluded.modification_time,
      is_burst                     = 1,
      burst_id                     = excluded.burst_id,
      burst_member_remote_file_ids = excluded.burst_member_remote_file_ids,
      burst_member_count           = excluded.burst_member_count;
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
           file_name, file_size, creation_time, width, height, duration, media_type,
           is_live_photo, paired_video_remote_file_id, paired_video_status,
           is_burst, burst_id, burst_member_remote_file_ids, burst_member_count
    FROM ${TABLE_NAME} WHERE asset_id = ?;
  `,
  getSyncedInList: (placeholders: string) =>
    `SELECT asset_id, modification_time, status FROM ${TABLE_NAME} WHERE asset_id IN (${placeholders}) AND status IN ('synced', 'cloud_deleted');`,
  getSyncedRemoteIdsByCreationMonth: `
    SELECT remote_file_id FROM ${TABLE_NAME}
    WHERE status = 'synced'
      AND remote_file_id IS NOT NULL
      AND creation_time >= ?
      AND creation_time < ?;
  `,
  getPendingAssets: `SELECT asset_id, status, remote_file_id, is_burst, burst_member_count FROM ${TABLE_NAME} WHERE status NOT IN ('synced', 'deleted', 'cloud_deleted') ORDER BY creation_time DESC NULLS LAST;`,
  markDeleted: `
    INSERT INTO ${TABLE_NAME} (asset_id, status, deleted_at)
    VALUES (?, 'deleted', (unixepoch() * 1000))
    ON CONFLICT(asset_id) DO UPDATE SET
      status     = 'deleted',
      deleted_at = (unixepoch() * 1000);
  `,
  getDeletedIds: `SELECT asset_id FROM ${TABLE_NAME} WHERE status = 'deleted';`,
  markCloudDeleted: `UPDATE ${TABLE_NAME} SET status = 'cloud_deleted' WHERE remote_file_id = ?;`,
  resetSyncedToPending: `
    UPDATE ${TABLE_NAME} SET
      status = 'pending',
      remote_file_id = NULL,
      synced_at = NULL,
      burst_member_remote_file_ids = NULL,
      burst_member_count = NULL,
      paired_video_remote_file_id = NULL,
      paired_video_status = NULL
    WHERE status = 'synced';
  `,
  deleteById: `DELETE FROM ${TABLE_NAME} WHERE asset_id = ?;`,
  reset: `DELETE FROM ${TABLE_NAME};`,
  getSyncedRemoteFileIds: `SELECT remote_file_id FROM ${TABLE_NAME} WHERE status = 'synced' AND remote_file_id IS NOT NULL;`,

  getSyncedMonths: `
    SELECT DISTINCT
      CAST(strftime('%Y', creation_time / 1000, 'unixepoch') AS INTEGER) AS year,
      CAST(strftime('%m', creation_time / 1000, 'unixepoch') AS INTEGER) AS month
    FROM ${TABLE_NAME}
    WHERE status = 'synced'
      AND creation_time IS NOT NULL
      AND remote_file_id IS NOT NULL;
  `,

  getIncompleteBurstAssets: `
    SELECT asset_id, remote_file_id, file_name, creation_time, modification_time
    FROM ${TABLE_NAME}
    WHERE status = 'synced'
      AND is_burst = 1
      AND burst_member_count IS NULL;
  `,
};

export default { TABLE_NAME, statements };
