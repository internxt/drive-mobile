const TABLE_NAME = 'cloud_asset';

const COLUMNS = `
  remote_file_id, device_id, folder_date, file_name, file_size, file_id,
  thumbnail_path, thumbnail_bucket_id, thumbnail_bucket_file, thumbnail_type, discovered_at,
  plain_name, extension, bucket, folder_uuid,
  creation_time_api, modification_time, updated_at, status, encrypt_version,
  is_live_photo, live_photo_role, paired_remote_file_id,
  burst_role, burst_group_id, uploaded_at, is_favorite
`;

const statements = {
  createTable: `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      remote_file_id         TEXT    PRIMARY KEY NOT NULL,
      device_id              TEXT    NOT NULL,
      folder_date            INTEGER NOT NULL,
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
      burst_group_id         TEXT,
      uploaded_at            INTEGER NOT NULL,
      is_favorite            INTEGER NOT NULL DEFAULT 0
    );
  `,
  createIndexCreated: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_folder_date ON ${TABLE_NAME}(folder_date DESC);`,
  createIndexDevice: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_device ON ${TABLE_NAME}(device_id);`,
  createIndexMonth: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_month ON ${TABLE_NAME}(device_id, folder_date);`,
  createIndexRole: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_role ON ${TABLE_NAME}(live_photo_role);`,
  createIndexBurstGroup: `CREATE INDEX IF NOT EXISTS idx_cloud_asset_burst_group ON ${TABLE_NAME}(burst_group_id);`,

  upsert: `
    INSERT INTO ${TABLE_NAME} (${COLUMNS})
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(remote_file_id) DO UPDATE SET
      device_id              = excluded.device_id,
      folder_date            = excluded.folder_date,
      file_name              = excluded.file_name,
      file_size              = excluded.file_size,
      file_id                = COALESCE(excluded.file_id, ${TABLE_NAME}.file_id),
      thumbnail_path         = CASE
        WHEN excluded.thumbnail_bucket_file IS NOT NULL
         AND ${TABLE_NAME}.thumbnail_bucket_file IS NOT excluded.thumbnail_bucket_file
        THEN NULL
        ELSE COALESCE(${TABLE_NAME}.thumbnail_path, excluded.thumbnail_path)
      END,
      thumbnail_bucket_id    = COALESCE(excluded.thumbnail_bucket_id, ${TABLE_NAME}.thumbnail_bucket_id),
      thumbnail_bucket_file  = COALESCE(excluded.thumbnail_bucket_file, ${TABLE_NAME}.thumbnail_bucket_file),
      thumbnail_type         = COALESCE(excluded.thumbnail_type, ${TABLE_NAME}.thumbnail_type),
      -- 0 = unconfirmed by a real listing; never regress an already-confirmed row back to it.
      discovered_at          = CASE WHEN excluded.discovered_at = 0 THEN ${TABLE_NAME}.discovered_at ELSE excluded.discovered_at END,
      plain_name             = COALESCE(excluded.plain_name, ${TABLE_NAME}.plain_name),
      extension              = COALESCE(excluded.extension, ${TABLE_NAME}.extension),
      bucket                 = COALESCE(excluded.bucket, ${TABLE_NAME}.bucket),
      folder_uuid            = COALESCE(excluded.folder_uuid, ${TABLE_NAME}.folder_uuid),
      creation_time_api      = COALESCE(excluded.creation_time_api, ${TABLE_NAME}.creation_time_api),
      modification_time      = COALESCE(excluded.modification_time, ${TABLE_NAME}.modification_time),
      updated_at             = COALESCE(excluded.updated_at, ${TABLE_NAME}.updated_at),
      status                 = COALESCE(excluded.status, ${TABLE_NAME}.status),
      encrypt_version        = COALESCE(excluded.encrypt_version, ${TABLE_NAME}.encrypt_version),
      is_live_photo          = excluded.is_live_photo,
      live_photo_role        = excluded.live_photo_role,
      paired_remote_file_id  = excluded.paired_remote_file_id,
      burst_role             = COALESCE(excluded.burst_role, ${TABLE_NAME}.burst_role),
      burst_group_id         = COALESCE(excluded.burst_group_id, ${TABLE_NAME}.burst_group_id),
      uploaded_at            = excluded.uploaded_at,
      is_favorite            = excluded.is_favorite;
  `,

  getAll: `
    SELECT ${COLUMNS}
    FROM ${TABLE_NAME}
    WHERE (live_photo_role IS NULL OR live_photo_role != 'paired_video')
      AND (burst_role IS NULL OR burst_role != 'member')
    ORDER BY COALESCE(creation_time_api, folder_date) DESC, remote_file_id ASC;
  `,

  getAllIncludingPaired: `
    SELECT ${COLUMNS}
    FROM ${TABLE_NAME}
    ORDER BY COALESCE(creation_time_api, folder_date) DESC, remote_file_id ASC;
  `,

  getByRange: `
    SELECT ${COLUMNS}
    FROM ${TABLE_NAME}
    WHERE (folder_date >= ? AND folder_date <= ?)
      AND (live_photo_role IS NULL OR live_photo_role != 'paired_video')
      AND (burst_role IS NULL OR burst_role != 'member')
    ORDER BY COALESCE(creation_time_api, folder_date) DESC, remote_file_id ASC;
  `,

  getAllByDevice: `
    SELECT ${COLUMNS}
    FROM ${TABLE_NAME}
    WHERE device_id = ?
      AND (live_photo_role IS NULL OR live_photo_role != 'paired_video')
      AND (burst_role IS NULL OR burst_role != 'member')
    ORDER BY COALESCE(creation_time_api, folder_date) DESC, remote_file_id ASC;
  `,

  getByRangeAndDevice: `
    SELECT ${COLUMNS}
    FROM ${TABLE_NAME}
    WHERE (folder_date >= ? AND folder_date <= ?)
      AND device_id = ?
      AND (live_photo_role IS NULL OR live_photo_role != 'paired_video')
      AND (burst_role IS NULL OR burst_role != 'member')
    ORDER BY COALESCE(creation_time_api, folder_date) DESC, remote_file_id ASC;
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

  getThumbnailRefsInList: (placeholders: string) => `
    SELECT remote_file_id, thumbnail_path, thumbnail_bucket_file
    FROM ${TABLE_NAME}
    WHERE remote_file_id IN (${placeholders});
  `,

  getByFolderUuids: (placeholders: string) => `
    SELECT ${COLUMNS}
    FROM ${TABLE_NAME}
    WHERE folder_uuid IN (${placeholders});
  `,

  setThumbnailPath: `
    UPDATE ${TABLE_NAME} SET thumbnail_path = ? WHERE remote_file_id = ?;
  `,

  setThumbnailRefs: `
    UPDATE ${TABLE_NAME}
    SET thumbnail_bucket_id = ?, thumbnail_bucket_file = ?, thumbnail_type = ?, thumbnail_path = ?
    WHERE remote_file_id = ?;
  `,

  delete: `DELETE FROM ${TABLE_NAME} WHERE remote_file_id = ?;`,
  deleteByDevice: `DELETE FROM ${TABLE_NAME} WHERE device_id = ?;`,
  getDistinctDeviceIds: `SELECT DISTINCT device_id FROM ${TABLE_NAME};`,
  reset: `DELETE FROM ${TABLE_NAME};`,

  // discovered_at != 0 excludes rows written directly (not yet confirmed by a real Drive
  // listing) from cloud-deletion reconciliation, so a stale snapshot can't mark them deleted.
  getRemoteIdsByDeviceAndMonth: `
    SELECT remote_file_id FROM ${TABLE_NAME}
    WHERE device_id = ? AND folder_date >= ? AND folder_date < ? AND discovered_at != 0;
  `,

  getLatestDiscoveredAt: `
    SELECT MAX(discovered_at) AS latest
    FROM ${TABLE_NAME}
    WHERE device_id = ?
      AND folder_date >= ?
      AND folder_date <  ?;
  `,

  getMonthsByDevice: `
    SELECT DISTINCT
      CAST(strftime('%Y', folder_date / 1000, 'unixepoch') AS INTEGER) AS year,
      CAST(strftime('%m', folder_date / 1000, 'unixepoch') AS INTEGER) AS month
    FROM ${TABLE_NAME}
    WHERE device_id = ?;
  `,
};

export default { TABLE_NAME, statements };
