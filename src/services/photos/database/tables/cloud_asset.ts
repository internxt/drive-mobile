const TABLE_NAME = 'cloud_asset';

const COLUMNS = `
  remote_file_id, device_id, created_at, file_name, file_size, file_id,
  thumbnail_path, thumbnail_bucket_id, thumbnail_bucket_file, thumbnail_type, discovered_at,
  plain_name, extension, bucket, folder_uuid,
  creation_time_api, modification_time, updated_at, status, encrypt_version,
  is_live_photo, live_photo_role, paired_remote_file_id,
  burst_role, burst_group_id
`;

const statements = {
  createTable: `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      remote_file_id         TEXT    PRIMARY KEY NOT NULL,
      device_id              TEXT    NOT NULL,
      created_at             INTEGER NOT NULL,
      file_name              TEXT    NOT NULL,
      file_size              INTEGER,
      file_id                TEXT,
      thumbnail_path         TEXT,
      thumbnail_bucket_id    TEXT,
      thumbnail_bucket_file  TEXT,
      thumbnail_type         TEXT,
      discovered_at          INTEGER NOT NULL,
      plain_name             TEXT,
      extension              TEXT,
      bucket                 TEXT,
      folder_uuid            TEXT,
      creation_time_api      INTEGER,
      modification_time      INTEGER,
      updated_at             INTEGER,
      status                 TEXT,
      encrypt_version        TEXT,
      is_live_photo          INTEGER NOT NULL DEFAULT 0,
      live_photo_role        TEXT,
      paired_remote_file_id  TEXT,
      -- BURST: burst photo columns (iOS only). Clean install required when adding these.
      burst_role             TEXT,
      burst_group_id         TEXT
    );
  `,
  createIndexCreated: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_created ON ${TABLE_NAME}(created_at DESC);`,
  createIndexDevice: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_device ON ${TABLE_NAME}(device_id);`,
  createIndexMonth: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_month ON ${TABLE_NAME}(device_id, created_at);`,
  createIndexRole: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_role ON ${TABLE_NAME}(live_photo_role);`,
  createIndexBurstGroup: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_burst_group ON ${TABLE_NAME}(burst_group_id);`,

  upsert: `
    INSERT INTO ${TABLE_NAME} (${COLUMNS})
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(remote_file_id) DO UPDATE SET
      device_id              = excluded.device_id,
      created_at             = excluded.created_at,
      file_name              = excluded.file_name,
      file_size              = excluded.file_size,
      file_id                = excluded.file_id,
      thumbnail_path         = COALESCE(${TABLE_NAME}.thumbnail_path, excluded.thumbnail_path),
      thumbnail_bucket_id    = excluded.thumbnail_bucket_id,
      thumbnail_bucket_file  = excluded.thumbnail_bucket_file,
      thumbnail_type         = excluded.thumbnail_type,
      discovered_at          = excluded.discovered_at,
      plain_name             = excluded.plain_name,
      extension              = excluded.extension,
      bucket                 = excluded.bucket,
      folder_uuid            = excluded.folder_uuid,
      creation_time_api      = excluded.creation_time_api,
      modification_time      = excluded.modification_time,
      updated_at             = excluded.updated_at,
      status                 = excluded.status,
      encrypt_version        = excluded.encrypt_version,
      is_live_photo          = excluded.is_live_photo,
      live_photo_role        = excluded.live_photo_role,
      paired_remote_file_id  = excluded.paired_remote_file_id,
      burst_role             = COALESCE(excluded.burst_role, ${TABLE_NAME}.burst_role),
      burst_group_id         = COALESCE(excluded.burst_group_id, ${TABLE_NAME}.burst_group_id);
  `,

  getAll: `
    SELECT ${COLUMNS}
    FROM ${TABLE_NAME}
    WHERE (live_photo_role IS NULL OR live_photo_role != 'paired_video')
      AND (burst_role IS NULL OR burst_role != 'member')
    ORDER BY created_at DESC;
  `,

  getAllIncludingPaired: `
    SELECT ${COLUMNS}
    FROM ${TABLE_NAME}
    ORDER BY created_at DESC;
  `,

  getByRange: `
    SELECT ${COLUMNS}
    FROM ${TABLE_NAME}
    WHERE (created_at >= ? AND created_at <= ?)
      AND (live_photo_role IS NULL OR live_photo_role != 'paired_video')
      AND (burst_role IS NULL OR burst_role != 'member')
    ORDER BY created_at DESC;
  `,

  getBurstMembers: `
    SELECT ${COLUMNS}
    FROM ${TABLE_NAME}
    WHERE burst_group_id = ? AND burst_role = 'member';
  `,

  getById: `
    SELECT ${COLUMNS}
    FROM ${TABLE_NAME}
    WHERE remote_file_id = ?;
  `,

  setThumbnailPath: `
    UPDATE ${TABLE_NAME} SET thumbnail_path = ? WHERE remote_file_id = ?;
  `,

  delete: `DELETE FROM ${TABLE_NAME} WHERE remote_file_id = ?;`,
  deleteByDevice: `DELETE FROM ${TABLE_NAME} WHERE device_id = ?;`,
  getDistinctDeviceIds: `SELECT DISTINCT device_id FROM ${TABLE_NAME};`,
  reset: `DELETE FROM ${TABLE_NAME};`,

  getRemoteIdsByDeviceAndMonth: `
    SELECT remote_file_id FROM ${TABLE_NAME}
    WHERE device_id = ? AND created_at >= ? AND created_at < ?;
  `,

  getLatestDiscoveredAt: `
    SELECT MAX(discovered_at) AS latest
    FROM ${TABLE_NAME}
    WHERE device_id = ?
      AND created_at >= ?
      AND created_at <  ?;
  `,

  getMonthsByDevice: `
    SELECT DISTINCT
      CAST(strftime('%Y', created_at / 1000, 'unixepoch') AS INTEGER) AS year,
      CAST(strftime('%m', created_at / 1000, 'unixepoch') AS INTEGER) AS month
    FROM ${TABLE_NAME}
    WHERE device_id = ?;
  `,
};

export default { TABLE_NAME, statements };
