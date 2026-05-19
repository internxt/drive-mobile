const TABLE_NAME = 'cloud_asset';

const statements = {
  createTable: `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      remote_file_id         TEXT    PRIMARY KEY NOT NULL,
      device_id              TEXT    NOT NULL,
      created_at             INTEGER NOT NULL,
      file_name              TEXT    NOT NULL,
      file_size              INTEGER,
      thumbnail_path         TEXT,
      thumbnail_bucket_id    TEXT,
      thumbnail_bucket_file  TEXT,
      thumbnail_type         TEXT,
      discovered_at          INTEGER NOT NULL
    );
  `,
  createIndexCreated: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_created ON ${TABLE_NAME}(created_at DESC);`,
  createIndexDevice: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_device ON ${TABLE_NAME}(device_id);`,
  createIndexMonth: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_month ON ${TABLE_NAME}(device_id, created_at);`,

  upsert: `
    INSERT INTO ${TABLE_NAME} (
      remote_file_id, device_id, created_at, file_name, file_size,
      thumbnail_path, thumbnail_bucket_id, thumbnail_bucket_file, thumbnail_type, discovered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(remote_file_id) DO UPDATE SET
      device_id              = excluded.device_id,
      created_at             = excluded.created_at,
      file_name              = excluded.file_name,
      file_size              = excluded.file_size,
      thumbnail_path         = COALESCE(${TABLE_NAME}.thumbnail_path, excluded.thumbnail_path),
      thumbnail_bucket_id    = excluded.thumbnail_bucket_id,
      thumbnail_bucket_file  = excluded.thumbnail_bucket_file,
      thumbnail_type         = excluded.thumbnail_type,
      discovered_at          = excluded.discovered_at;
  `,

  getAll: `
    SELECT remote_file_id, device_id, created_at, file_name, file_size,
           thumbnail_path, thumbnail_bucket_id, thumbnail_bucket_file, thumbnail_type, discovered_at
    FROM ${TABLE_NAME}
    ORDER BY created_at DESC;
  `,

  getByRange: `
    SELECT remote_file_id, device_id, created_at, file_name, file_size,
           thumbnail_path, thumbnail_bucket_id, thumbnail_bucket_file, thumbnail_type, discovered_at
    FROM ${TABLE_NAME}
    WHERE created_at >= ? AND created_at <= ?
    ORDER BY created_at DESC;
  `,

  setThumbnailPath: `
    UPDATE ${TABLE_NAME} SET thumbnail_path = ? WHERE remote_file_id = ?;
  `,

  delete: `DELETE FROM ${TABLE_NAME} WHERE remote_file_id = ?;`,
  reset: `DELETE FROM ${TABLE_NAME};`,

  getLatestDiscoveredAt: `
    SELECT MAX(discovered_at) AS latest
    FROM ${TABLE_NAME}
    WHERE device_id = ?
      AND created_at >= ?
      AND created_at <  ?;
  `,
};

export default { TABLE_NAME, statements };
