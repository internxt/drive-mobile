import sqliteService from '../../SqliteService';
import assetSyncTable from './tables/asset_sync';
import cloudAssetTable from './tables/cloud_asset';
import photoDayFolderTable from './tables/photo_day_folder';
import photoMonthSyncTable from './tables/photo_month_sync';

const DB_NAME = 'photos_sync.db';

export type LivePhotoRole = 'photo' | 'paired_video';
// BURST:
export type BurstRole = 'representative' | 'member';

export interface CloudAssetEntry {
  remoteFileId: string;
  deviceId: string;
  /** Time of the device/year/month/day cloud folder this asset was discovered in. Used for timeline day-grouping and month-range queries*/
  folderDate: number;
  fileName: string;
  fileSize: number | null;
  fileId: string | null;
  thumbnailPath: string | null;
  thumbnailBucketId: string | null;
  thumbnailBucketFile: string | null;
  thumbnailType: string | null;
  discoveredAt: number;
  plainName?: string | null;
  extension?: string | null;
  bucket?: string | null;
  folderUuid?: string | null;
  creationTimeApi?: number | null;
  modificationTime?: number | null;
  updatedAt?: number | null;
  status?: string | null;
  encryptVersion?: string | null;
  isLivePhoto?: boolean;
  livePhotoRole?: LivePhotoRole | null;
  pairedRemoteFileId?: string | null;
  burstRole?: BurstRole | null;
  burstGroupId?: string | null;
  /** Real upload timestamp reported by Drive (`file.createdAt`) */
  uploadedAt: number;
  isFavorite: boolean;
}

interface CloudAssetRow {
  remote_file_id: string;
  device_id: string;
  folder_date: number;
  file_name: string;
  file_size: number | null;
  file_id: string | null;
  thumbnail_path: string | null;
  thumbnail_bucket_id: string | null;
  thumbnail_bucket_file: string | null;
  thumbnail_type: string | null;
  discovered_at: number;
  plain_name: string | null;
  extension: string | null;
  bucket: string | null;
  folder_uuid: string | null;
  creation_time_api: number | null;
  modification_time: number | null;
  updated_at: number | null;
  status: string | null;
  encrypt_version: string | null;
  is_live_photo: number;
  live_photo_role: LivePhotoRole | null;
  paired_remote_file_id: string | null;
  burst_role: BurstRole | null;
  burst_group_id: string | null;
  uploaded_at: number;
  is_favorite: number;
}

export type AssetSyncStatus = 'pending' | 'pending_edit' | 'synced' | 'error' | 'deleted' | 'cloud_deleted';
export type PairedVideoStatus = 'synced' | 'error';

export interface AssetSyncEntry {
  assetId: string;
  status: AssetSyncStatus;
  remoteFileId: string | null;
  syncedAt: number | null;
  deletedAt: number | null;
  errorMessage: string | null;
  attemptCount: number;
  createdAt: number;
  lastAttemptAt: number | null;
  modificationTime: number | null;
  fileName: string | null;
  fileSize: number | null;
  creationTime: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  mediaType: string | null;
  isLivePhoto: boolean;
  pairedVideoRemoteFileId: string | null;
  pairedVideoStatus: PairedVideoStatus | null;
  isBurst: boolean;
  burstId: string | null;
  burstMemberRemoteFileIds: string[] | null;
  burstMemberCount: number | null;
  /** Thumbnail/content refs captured straight from the upload that produced this asset — present
   * only when this device generated them itself (see PhotoCloudBrowser.recordSyncedAsset). */
  thumbnailBucketId: string | null;
  thumbnailBucketFile: string | null;
  thumbnailType: string | null;
  contentFileId: string | null;
  bucket: string | null;
  /** uuid of the day folder this asset was uploaded into. */
  folderUuid: string | null;
}

export interface AssetSyncRow {
  asset_id: string;
  status: AssetSyncStatus;
  remote_file_id: string | null;
  synced_at: number | null;
  deleted_at: number | null;
  error_message: string | null;
  attempt_count: number;
  created_at: number;
  last_attempt_at: number | null;
  modification_time: number | null;
  file_name: string | null;
  file_size: number | null;
  creation_time: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  media_type: string | null;
  is_live_photo: number;
  paired_video_remote_file_id: string | null;
  paired_video_status: PairedVideoStatus | null;
  is_burst: number;
  burst_id: string | null;
  burst_member_remote_file_ids: string | null;
  burst_member_count: number | null;
  thumbnail_bucket_id: string | null;
  thumbnail_bucket_file: string | null;
  thumbnail_type: string | null;
  content_file_id: string | null;
  bucket: string | null;
  folder_uuid: string | null;
}

/** A month folder's identity, without the marks the full sync and the delta keep on their own. */
export type PhotoMonthFolderRef = Omit<
  PhotoMonthSyncEntry,
  'lastServerUpdatedAt' | 'lastDeltaCheckAt' | 'lastFullSyncAt'
>;

export interface PhotoMonthSyncEntry {
  deviceId: string;
  year: number;
  month: number;
  monthFolderUuid: string;
  /**
   * The delta's cursor into the server's content: the newest `updatedAt` it has applied. A Drive
   * timestamp, so it stays old for an old month however recently the delta ran — never read it as
   * "when we last checked". Null until a delta ran.
   */
  lastServerUpdatedAt: number | null;
  /** Local clock, when the delta last asked about this month. Null until it asked. */
  lastDeltaCheckAt: number | null;
  /** Local clock, when the full sync last read this month. Null until it read it. */
  lastFullSyncAt: number | null;
}

interface PhotoMonthSyncRow {
  device_id: string;
  year: number;
  month: number;
  month_folder_uuid: string;
  last_server_updated_at: number | null;
  last_delta_check_at: number | null;
  last_full_sync_at: number | null;
}

const rowToMonthSyncEntry = (row: PhotoMonthSyncRow): PhotoMonthSyncEntry => ({
  deviceId: row.device_id,
  year: row.year,
  month: row.month,
  monthFolderUuid: row.month_folder_uuid,
  lastServerUpdatedAt: row.last_server_updated_at,
  lastDeltaCheckAt: row.last_delta_check_at,
  lastFullSyncAt: row.last_full_sync_at,
});

export interface PhotoDayFolderEntry {
  dayFolderUuid: string;
  deviceId: string;
  year: number;
  month: number;
  day: number;
}

interface PhotoDayFolderRow {
  day_folder_uuid: string;
  device_id: string;
  year: number;
  month: number;
  day: number;
}

const rowToDayFolderEntry = (row: PhotoDayFolderRow): PhotoDayFolderEntry => ({
  dayFolderUuid: row.day_folder_uuid,
  deviceId: row.device_id,
  year: row.year,
  month: row.month,
  day: row.day,
});

export interface SyncedAssetInfo {
  modificationTime: number | null;
  status: 'synced' | 'cloud_deleted' | 'deleted' | 'error';
}

export interface IncompleteBurstAsset {
  assetId: string;
  remoteFileId: string | null;
  fileName: string | null;
  creationTime: number | null;
  modificationTime: number | null;
}

export interface ManifestAssetEntry {
  assetId: string;
  status: 'synced' | 'cloud_deleted';
  remoteFileId: string | null;
  modificationTime: number | null;
  fileName: string | null;
  creationTime: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  mediaType: string | null;
  isLivePhoto: boolean;
  pairedVideoRemoteFileId: string | null;
  pairedVideoStatus: PairedVideoStatus | null;
  isBurst: boolean;
  burstId: string | null;
  burstMemberRemoteFileIds: string[] | null;
  burstMemberCount: number | null;
}

interface ManifestAssetRow {
  asset_id: string;
  status: 'synced' | 'cloud_deleted';
  remote_file_id: string | null;
  modification_time: number | null;
  file_name: string | null;
  creation_time: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  media_type: string | null;
  is_live_photo: number;
  paired_video_remote_file_id: string | null;
  paired_video_status: PairedVideoStatus | null;
  is_burst: number;
  burst_id: string | null;
  burst_member_remote_file_ids: string | null;
  burst_member_count: number | null;
}

const rowToManifestEntry = (row: ManifestAssetRow): ManifestAssetEntry => ({
  assetId: row.asset_id,
  status: row.status,
  remoteFileId: row.remote_file_id,
  modificationTime: row.modification_time,
  fileName: row.file_name,
  creationTime: row.creation_time,
  width: row.width,
  height: row.height,
  duration: row.duration,
  mediaType: row.media_type,
  isLivePhoto: row.is_live_photo === 1,
  pairedVideoRemoteFileId: row.paired_video_remote_file_id,
  pairedVideoStatus: row.paired_video_status,
  isBurst: row.is_burst === 1,
  burstId: row.burst_id,
  burstMemberRemoteFileIds: row.burst_member_remote_file_ids ? JSON.parse(row.burst_member_remote_file_ids) : null,
  burstMemberCount: row.burst_member_count,
});

export interface AssetMediaInfo {
  fileName: string;
  creationTime: number;
  width: number;
  height: number;
  duration: number;
  mediaType: string;
  isLivePhoto?: boolean;
  isBurst?: boolean;
  burstId?: string | null;
}

const CHUNK_SIZE = 300;

const rowToCloudAssetEntry = (row: CloudAssetRow): CloudAssetEntry => {
  return {
    remoteFileId: row.remote_file_id,
    deviceId: row.device_id,
    folderDate: row.folder_date,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileId: row.file_id,
    thumbnailPath: row.thumbnail_path,
    thumbnailBucketId: row.thumbnail_bucket_id,
    thumbnailBucketFile: row.thumbnail_bucket_file,
    thumbnailType: row.thumbnail_type,
    discoveredAt: row.discovered_at,
    plainName: row.plain_name,
    extension: row.extension,
    bucket: row.bucket,
    folderUuid: row.folder_uuid,
    creationTimeApi: row.creation_time_api,
    modificationTime: row.modification_time,
    updatedAt: row.updated_at,
    status: row.status,
    encryptVersion: row.encrypt_version,
    isLivePhoto: row.is_live_photo === 1,
    livePhotoRole: row.live_photo_role,
    pairedRemoteFileId: row.paired_remote_file_id,
    burstRole: row.burst_role,
    burstGroupId: row.burst_group_id,
    uploadedAt: row.uploaded_at,
    isFavorite: row.is_favorite === 1,
  };
};

const rowToAssetSyncEntry = (row: AssetSyncRow): AssetSyncEntry => ({
  assetId: row.asset_id,
  status: row.status,
  remoteFileId: row.remote_file_id,
  syncedAt: row.synced_at,
  deletedAt: row.deleted_at,
  errorMessage: row.error_message,
  attemptCount: row.attempt_count,
  createdAt: row.created_at,
  lastAttemptAt: row.last_attempt_at,
  modificationTime: row.modification_time,
  fileName: row.file_name,
  fileSize: row.file_size,
  creationTime: row.creation_time,
  width: row.width,
  height: row.height,
  duration: row.duration,
  mediaType: row.media_type,
  isLivePhoto: row.is_live_photo === 1,
  pairedVideoRemoteFileId: row.paired_video_remote_file_id,
  pairedVideoStatus: row.paired_video_status,
  isBurst: row.is_burst === 1,
  burstId: row.burst_id,
  burstMemberRemoteFileIds: row.burst_member_remote_file_ids ? JSON.parse(row.burst_member_remote_file_ids) : null,
  burstMemberCount: row.burst_member_count,
  thumbnailBucketId: row.thumbnail_bucket_id,
  thumbnailBucketFile: row.thumbnail_bucket_file,
  thumbnailType: row.thumbnail_type,
  contentFileId: row.content_file_id,
  bucket: row.bucket,
  folderUuid: row.folder_uuid,
});

/** Refs captured from a successful upload/replace call, passed to markSynced* so
 * recordSyncedAsset can later write a complete cloud_asset row without fetching Drive. */
export interface SyncedUploadRefs {
  thumbnailBucketId?: string;
  thumbnailBucketFile?: string;
  thumbnailType?: string;
  contentFileId?: string;
  bucket?: string;
  /** uuid of the day folder the asset was uploaded into. */
  folderUuid?: string;
}

const toUploadRefParams = (refs?: SyncedUploadRefs): (string | null)[] => [
  refs?.thumbnailBucketId ?? null,
  refs?.thumbnailBucketFile ?? null,
  refs?.thumbnailType ?? null,
  refs?.contentFileId ?? null,
  refs?.bucket ?? null,
  refs?.folderUuid ?? null,
];

const toMarkPendingParams = (assetId: string, mediaInfo?: AssetMediaInfo) => [
  assetId,
  mediaInfo?.fileName ?? null,
  mediaInfo?.creationTime ?? null,
  mediaInfo?.width ?? null,
  mediaInfo?.height ?? null,
  mediaInfo?.duration ?? null,
  mediaInfo?.mediaType ?? null,
  mediaInfo?.isLivePhoto ? 1 : 0,
  mediaInfo?.isBurst ? 1 : 0,
];

class PhotosLocalDB {
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    this.initPromise ??= (async () => {
      await sqliteService.open(DB_NAME);
      await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.createTable);
      await this.migrateAddColumns(assetSyncTable.migrateAddColumns);
      await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.createIndex);
      await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.createTable);
      await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.createIndexCreated);
      await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.createIndexDevice);
      await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.createIndexMonth);
      await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.createIndexRole);
      await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.createIndexBurstGroup);
      await sqliteService.executeSql(DB_NAME, photoMonthSyncTable.statements.createTable);
      await this.migrateAddColumns(photoMonthSyncTable.migrateAddColumns);
      await sqliteService.executeSql(DB_NAME, photoDayFolderTable.statements.createTable);
      await sqliteService.executeSql(DB_NAME, photoDayFolderTable.statements.createIndexMonth);
    })();
    return this.initPromise;
  }

  /**
   * Applies additive column migrations, skipping the ones an install already has.
   *
   * @param statements - `ALTER TABLE … ADD COLUMN` statements to apply.
   */
  private async migrateAddColumns(statements: string[]): Promise<void> {
    for (const statement of statements) {
      try {
        await sqliteService.executeSql(DB_NAME, statement);
      } catch (err) {
        if (!String(err).includes('duplicate column name')) {
          throw err;
        }
      }
    }
  }

  /**
   * Marks assets pending, in bulk (see `SqliteService.executeBulk`).
   *
   * @param entries - Asset id + media info pairs, one per asset to mark pending.
   */
  async markPendingBulk(entries: Array<{ assetId: string; mediaInfo?: AssetMediaInfo }>): Promise<void> {
    await this.markBulk(assetSyncTable.statements.markPending, entries);
  }

  /**
   * Same as `markPendingBulk`, but for assets that were edited after already syncing.
   *
   * @param entries - Asset id + media info pairs, one per edited asset to mark pending.
   */
  async markPendingEditBulk(entries: Array<{ assetId: string; mediaInfo?: AssetMediaInfo }>): Promise<void> {
    await this.markBulk(assetSyncTable.statements.markPendingEdit, entries);
  }

  private async markBulk(
    statement: string,
    entries: Array<{ assetId: string; mediaInfo?: AssetMediaInfo }>,
  ): Promise<void> {
    await sqliteService.executeBulk(
      DB_NAME,
      statement,
      entries.map(({ assetId, mediaInfo }) => toMarkPendingParams(assetId, mediaInfo)),
    );
  }

  async markSynced(
    assetId: string,
    remoteFileId: string,
    modificationTime: number | null,
    uploadRefs?: SyncedUploadRefs,
  ): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markSynced, [
      assetId,
      remoteFileId,
      modificationTime,
      ...toUploadRefParams(uploadRefs),
    ]);
  }

  async markSyncedLivePhoto(
    assetId: string,
    remoteFileId: string,
    modificationTime: number | null,
    pairedVideoRemoteFileId: string | null,
    pairedVideoStatus: PairedVideoStatus,
    uploadRefs?: SyncedUploadRefs,
  ): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markSyncedLivePhoto, [
      assetId,
      remoteFileId,
      modificationTime,
      pairedVideoRemoteFileId,
      pairedVideoStatus,
      ...toUploadRefParams(uploadRefs),
    ]);
  }

  async resetErrorsToPending(): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.resetErrorsToPending);
  }

  async markError(assetId: string, errorMessage?: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markError, [assetId, errorMessage ?? null]);
  }

  async getAssetUploadErroredCount(): Promise<number> {
    const rows = await sqliteService.getAllAsync<{ count: number }>(
      DB_NAME,
      assetSyncTable.statements.getAssetUploadErroredCount,
    );
    return rows[0]?.count ?? 0;
  }

  async cacheAssetFileSize(assetId: string, fileSize: number): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.cacheFileSize, [fileSize, assetId]);
  }

  async getSyncedEntries(assetIds: string[]): Promise<Map<string, SyncedAssetInfo>> {
    if (assetIds.length === 0) return new Map();

    const chunks: string[][] = [];
    for (let i = 0; i < assetIds.length; i += CHUNK_SIZE) {
      chunks.push(assetIds.slice(i, i + CHUNK_SIZE));
    }

    const results = await Promise.all(
      chunks.map((chunk) => {
        const placeholders = this.buildInClausePlaceholders(chunk);
        return sqliteService.getAllAsync<{
          asset_id: string;
          modification_time: number | null;
          status: 'synced' | 'cloud_deleted' | 'deleted' | 'error';
        }>(DB_NAME, assetSyncTable.statements.getSyncedInList(placeholders), chunk);
      }),
    );

    const synced = new Map<string, SyncedAssetInfo>();
    for (const chunk of results) {
      for (const row of chunk) {
        synced.set(row.asset_id, { modificationTime: row.modification_time, status: row.status });
      }
    }
    return synced;
  }

  async getStatus(assetId: string): Promise<AssetSyncEntry | null> {
    const row = await sqliteService.getFirstAsync<AssetSyncRow>(DB_NAME, assetSyncTable.statements.getStatus, [
      assetId,
    ]);
    return row ? rowToAssetSyncEntry(row) : null;
  }

  async getPendingAssets(): Promise<
    Array<{
      assetId: string;
      status: AssetSyncStatus;
      remoteFileId: string | null;
      isBurst: boolean;
      burstMemberCount: number | null;
    }>
  > {
    const pendingAssets = await sqliteService.getAllAsync<{
      asset_id: string;
      status: AssetSyncStatus;
      remote_file_id: string | null;
      is_burst: number;
      burst_member_count: number | null;
    }>(DB_NAME, assetSyncTable.statements.getPendingAssets);
    return pendingAssets.map((asset) => ({
      assetId: asset.asset_id,
      status: asset.status,
      remoteFileId: asset.remote_file_id,
      isBurst: asset.is_burst === 1,
      burstMemberCount: asset.burst_member_count,
    }));
  }

  async getSyncedRemoteIdsByCreationMonth(year: number, month: number, syncedBefore: number): Promise<Set<string>> {
    const startMs = new Date(year, month - 1, 1).getTime();
    const endMs = new Date(year, month, 1).getTime();
    const rows = await sqliteService.getAllAsync<{ remote_file_id: string }>(
      DB_NAME,
      assetSyncTable.statements.getSyncedRemoteIdsByCreationMonth,
      [startMs, endMs, syncedBefore],
    );
    return new Set(rows.map((r) => r.remote_file_id));
  }

  async getCloudDeletedRemoteIdsByCreationMonth(year: number, month: number): Promise<Set<string>> {
    const startMs = new Date(year, month - 1, 1).getTime();
    const endMs = new Date(year, month, 1).getTime();
    const rows = await sqliteService.getAllAsync<{ remote_file_id: string }>(
      DB_NAME,
      assetSyncTable.statements.getCloudDeletedRemoteIdsByCreationMonth,
      [startMs, endMs],
    );
    return new Set(rows.map((r) => r.remote_file_id));
  }

  async revertCloudDeleted(remoteFileIds: string[]): Promise<void> {
    if (remoteFileIds.length === 0) {
      return;
    }
    for (let i = 0; i < remoteFileIds.length; i += CHUNK_SIZE) {
      const chunk = remoteFileIds.slice(i, i + CHUNK_SIZE);
      const placeholders = this.buildInClausePlaceholders(chunk);
      await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.revertCloudDeleted(placeholders), chunk);
    }
  }

  async markCloudDeleted(remoteFileId: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markCloudDeleted, [remoteFileId]);
  }

  async resetSyncedToPending(syncedBefore: number): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.resetSyncedToPending, [syncedBefore]);
  }

  async getDistinctCloudAssetDeviceIds(): Promise<string[]> {
    const rows = await sqliteService.getAllAsync<{ device_id: string }>(
      DB_NAME,
      cloudAssetTable.statements.getDistinctDeviceIds,
    );
    return rows.map((r) => r.device_id);
  }

  /**
   * Forgets everything stored for a device: its cloud assets and the month and day folders known
   * for it. Used when the device folder is gone from Drive.
   *
   * @param deviceId - Device folder uuid to forget.
   */
  async deleteDeviceData(deviceId: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.deleteByDevice, [deviceId]);
    await sqliteService.executeSql(DB_NAME, photoMonthSyncTable.statements.deleteByDevice, [deviceId]);
    await sqliteService.executeSql(DB_NAME, photoDayFolderTable.statements.deleteByDevice, [deviceId]);
  }

  async getCloudAssetMonthsByDevice(deviceId: string): Promise<{ year: number; month: number }[]> {
    return sqliteService.getAllAsync<{ year: number; month: number }>(
      DB_NAME,
      cloudAssetTable.statements.getMonthsByDevice,
      [deviceId],
    );
  }

  async getSyncedMonths(syncedBefore: number): Promise<{ year: number; month: number }[]> {
    return sqliteService.getAllAsync<{ year: number; month: number }>(
      DB_NAME,
      assetSyncTable.statements.getSyncedMonths,
      [syncedBefore],
    );
  }

  async getCloudAssetRemoteIdsByDeviceAndMonth(deviceId: string, year: number, month: number): Promise<Set<string>> {
    const startMs = new Date(year, month - 1, 1).getTime();
    const endMs = new Date(year, month, 1).getTime();
    const rows = await sqliteService.getAllAsync<{ remote_file_id: string }>(
      DB_NAME,
      cloudAssetTable.statements.getRemoteIdsByDeviceAndMonth,
      [deviceId, startMs, endMs],
    );
    return new Set(rows.map((r) => r.remote_file_id));
  }

  async markAssetDeleted(assetId: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markDeleted, [assetId]);
  }

  /**
   * Removes `asset_sync` rows for locally-deleted assets, in bulk (see `SqliteService.executeBulk`).
   *
   * @param assetIds - Ids of the local assets to remove from `asset_sync`.
   */
  async deleteAssetSyncBulk(assetIds: string[]): Promise<void> {
    await sqliteService.executeBulk(
      DB_NAME,
      assetSyncTable.statements.deleteById,
      assetIds.map((assetId) => [assetId]),
    );
  }

  /**
   * Ids of `asset_sync` rows tracked locally whose asset is no longer on the device
   * (`localAssetIds`). Read-only — callers decide what to do with the diff (see
   * `PhotoCloudBrowser.deleteAssetSyncPreservingCloudVisibility`, which preserves cloud
   * visibility for any orphan that had a remote backup before removing its row).
   *
   * @param localAssetIds - Ids of the assets currently on the device.
   */
  async getOrphanedAssetSyncIds(localAssetIds: Set<string>): Promise<string[]> {
    const allSyncedAssets = await sqliteService.getAllAsync<{ asset_id: string }>(
      DB_NAME,
      assetSyncTable.statements.getAllTrackedAssetIds,
    );
    return allSyncedAssets.filter((a) => !localAssetIds.has(a.asset_id)).map((a) => a.asset_id);
  }

  async reset(): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.reset);
  }

  async getSyncedRemoteFileIds(): Promise<Set<string>> {
    const rows = await sqliteService.getAllAsync<{ remote_file_id: string }>(
      DB_NAME,
      assetSyncTable.statements.getSyncedRemoteFileIds,
    );
    return new Set(rows.map((r) => r.remote_file_id));
  }

  // --- cloud_asset methods ---

  async upsertCloudAsset(entry: CloudAssetEntry): Promise<void> {
    await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.upsert, [
      entry.remoteFileId,
      entry.deviceId,
      entry.folderDate,
      entry.fileName,
      entry.fileSize ?? null,
      entry.fileId ?? null,
      entry.thumbnailPath ?? null,
      entry.thumbnailBucketId ?? null,
      entry.thumbnailBucketFile ?? null,
      entry.thumbnailType ?? null,
      entry.discoveredAt,
      entry.plainName ?? null,
      entry.extension ?? null,
      entry.bucket ?? null,
      entry.folderUuid ?? null,
      entry.creationTimeApi ?? null,
      entry.modificationTime ?? null,
      entry.updatedAt ?? null,
      entry.status ?? null,
      entry.encryptVersion ?? null,
      entry.isLivePhoto ? 1 : 0,
      entry.livePhotoRole ?? null,
      entry.pairedRemoteFileId ?? null,
      entry.burstRole ?? null,
      entry.burstGroupId ?? null,
      entry.uploadedAt,
      entry.isFavorite ? 1 : 0,
    ]);
  }

  async getCloudAssetById(remoteFileId: string): Promise<CloudAssetEntry | null> {
    const row = await sqliteService.getFirstAsync<CloudAssetRow>(DB_NAME, cloudAssetTable.statements.getById, [
      remoteFileId,
    ]);
    return row ? rowToCloudAssetEntry(row) : null;
  }

  async getAllCloudAssets(deviceId?: string): Promise<CloudAssetEntry[]> {
    const rows = deviceId
      ? await sqliteService.getAllAsync<CloudAssetRow>(DB_NAME, cloudAssetTable.statements.getAllByDevice, [deviceId])
      : await sqliteService.getAllAsync<CloudAssetRow>(DB_NAME, cloudAssetTable.statements.getAll);
    return rows.map(rowToCloudAssetEntry);
  }

  async getCloudAssetsByRange(from: number, to: number, deviceId?: string): Promise<CloudAssetEntry[]> {
    const rows = deviceId
      ? await sqliteService.getAllAsync<CloudAssetRow>(DB_NAME, cloudAssetTable.statements.getByRangeAndDevice, [
          from,
          to,
          deviceId,
        ])
      : await sqliteService.getAllAsync<CloudAssetRow>(DB_NAME, cloudAssetTable.statements.getByRange, [from, to]);
    return rows.map(rowToCloudAssetEntry);
  }

  private readonly buildInClausePlaceholders = (ids: string[]): string => ids.map(() => '?').join(', ');

  async getCachedThumbnailRefs(
    remoteFileIds: string[],
  ): Promise<Map<string, { thumbnailPath: string | null; thumbnailBucketFile: string | null }>> {
    const refs = new Map<string, { thumbnailPath: string | null; thumbnailBucketFile: string | null }>();
    if (remoteFileIds.length === 0) {
      return refs;
    }

    const chunks: string[][] = [];
    for (let i = 0; i < remoteFileIds.length; i += CHUNK_SIZE) {
      chunks.push(remoteFileIds.slice(i, i + CHUNK_SIZE));
    }

    const results = await Promise.all(
      chunks.map((chunk) => {
        const placeholders = this.buildInClausePlaceholders(chunk);
        return sqliteService.getAllAsync<{
          remote_file_id: string;
          thumbnail_path: string | null;
          thumbnail_bucket_file: string | null;
        }>(DB_NAME, cloudAssetTable.statements.getThumbnailRefsInList(placeholders), chunk);
      }),
    );

    for (const chunkRows of results) {
      for (const row of chunkRows) {
        refs.set(row.remote_file_id, {
          thumbnailPath: row.thumbnail_path,
          thumbnailBucketFile: row.thumbnail_bucket_file,
        });
      }
    }

    return refs;
  }

  /**
   * Returns every cloud asset stored under the given day-folder uuids, including paired Live Photo
   * videos and burst members, which the timeline getters leave out.
   *
   * @param folderUuids - Day-folder uuids to read. An empty array returns an empty list.
   */
  async getCloudAssetsByFolderUuids(folderUuids: string[]): Promise<CloudAssetEntry[]> {
    if (folderUuids.length === 0) {
      return [];
    }

    const chunks: string[][] = [];
    for (let i = 0; i < folderUuids.length; i += CHUNK_SIZE) {
      chunks.push(folderUuids.slice(i, i + CHUNK_SIZE));
    }

    const results = await Promise.all(
      chunks.map((chunk) => {
        const placeholders = this.buildInClausePlaceholders(chunk);
        return sqliteService.getAllAsync<CloudAssetRow>(
          DB_NAME,
          cloudAssetTable.statements.getByFolderUuids(placeholders),
          chunk,
        );
      }),
    );

    return results.flat().map(rowToCloudAssetEntry);
  }

  async setCloudThumbnailPath(remoteFileId: string, path: string | null): Promise<void> {
    await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.setThumbnailPath, [path, remoteFileId]);
  }

  async setCloudThumbnailRefs(
    remoteFileId: string,
    refs: { bucketId: string; bucketFile: string; type: string; localPath: string | null },
  ): Promise<void> {
    await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.setThumbnailRefs, [
      refs.bucketId,
      refs.bucketFile,
      refs.type,
      refs.localPath,
      remoteFileId,
    ]);
  }

  async deleteCloudAsset(remoteFileId: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.delete, [remoteFileId]);
  }

  async resetCloudAssets(): Promise<void> {
    await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.reset);
  }

  /**
   * Marks a burst representative as synced, storing the uploaded member UUIDs as JSON.
   *
   * @param assetId - Local device asset ID of the representative.
   * @param remoteFileId - Remote file ID assigned after upload.
   * @param modificationTime - Last modification timestamp of the asset, or `null` if unavailable.
   * @param burstId - Native burst identifier used to group member photos on device.
   * @param memberUuids - Remote file IDs of the member photos uploaded in this cycle.
   * @param memberCount - Total number of member photos in the burst group, or `null` if the group
   *   is incomplete (e.g. limited photo access prevented uploading all members). A `null` value
   *   signals the retry pass in `runUploadThunk` to re-attempt member upload on a later cycle.
   */
  async markSyncedBurst(
    assetId: string,
    remoteFileId: string,
    modificationTime: number | null,
    burstId: string,
    memberUuids: string[],
    memberCount: number | null,
    uploadRefs?: SyncedUploadRefs,
  ): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markSyncedBurst, [
      assetId,
      remoteFileId,
      modificationTime,
      burstId,
      JSON.stringify(memberUuids),
      memberCount,
      ...toUploadRefParams(uploadRefs),
    ]);
  }

  /**
   * Returns all member photos for a burst group (used for download and cascade delete).
   *
   * @param burstGroupId - The native burst identifier used to group members on device.
   * @returns A promise resolving to an array of cloud asset entries for the burst members.
   */
  async getBurstMembers(burstGroupId: string): Promise<CloudAssetEntry[]> {
    const rows = await sqliteService.getAllAsync<CloudAssetRow>(DB_NAME, cloudAssetTable.statements.getBurstMembers, [
      burstGroupId,
    ]);
    return rows.map(rowToCloudAssetEntry);
  }

  /**
   * Returns burst representatives whose members haven't been uploaded yet.
   *
   * @returns A promise resolving to an array of incomplete burst assets.
   */
  async getIncompleteBurstAssets(): Promise<IncompleteBurstAsset[]> {
    const rows = await sqliteService.getAllAsync<{
      asset_id: string;
      remote_file_id: string | null;
      file_name: string | null;
      creation_time: number | null;
      modification_time: number | null;
    }>(DB_NAME, assetSyncTable.statements.getIncompleteBurstAssets);
    return rows.map((r) => ({
      assetId: r.asset_id,
      remoteFileId: r.remote_file_id,
      fileName: r.file_name,
      creationTime: r.creation_time,
      modificationTime: r.modification_time,
    }));
  }

  async hasAnyAssetSyncEntry(): Promise<boolean> {
    const row = await sqliteService.getFirstAsync<{ result: number }>(DB_NAME, assetSyncTable.statements.hasAnyEntry);
    return row?.result === 1;
  }

  async getManifestEntries(): Promise<ManifestAssetEntry[]> {
    const rows = await sqliteService.getAllAsync<ManifestAssetRow>(
      DB_NAME,
      assetSyncTable.statements.getManifestEntries,
    );
    return rows.map(rowToManifestEntry);
  }

  async restoreEntries(entries: ManifestAssetEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    await sqliteService.transaction(DB_NAME, async (tx) => {
      for (const entry of entries) {
        await tx.executeSql(assetSyncTable.statements.restoreEntry, [
          entry.assetId,
          entry.status,
          entry.remoteFileId,
          entry.modificationTime,
          entry.fileName,
          entry.creationTime,
          entry.width,
          entry.height,
          entry.duration,
          entry.mediaType,
          entry.isLivePhoto ? 1 : 0,
          entry.pairedVideoRemoteFileId,
          entry.pairedVideoStatus,
          entry.isBurst ? 1 : 0,
          entry.burstId,
          entry.burstMemberRemoteFileIds ? JSON.stringify(entry.burstMemberRemoteFileIds) : null,
          entry.burstMemberCount,
        ]);
      }
    });
  }

  /**
   * Records a month folder for a device. Clears that month's `last_server_updated_at` when the folder uuid
   * changed, so a recreated month goes back through the full sync.
   *
   * @param entries - One per month discovered, with the month folder's uuid.
   */
  async upsertMonthSyncEntries(entries: PhotoMonthFolderRef[]): Promise<void> {
    if (entries.length === 0) return;
    await sqliteService.executeBulk(
      DB_NAME,
      photoMonthSyncTable.statements.upsert,
      entries.map(({ deviceId, year, month, monthFolderUuid }) => [deviceId, year, month, monthFolderUuid]),
    );
  }

  /**
   * Records that the delta asked about a month, regardless of whether it found any changes.
   *
   * @param deviceId - Device folder uuid.
   * @param year - Year of the month.
   * @param month - Month, 1-12.
   * @param checkedAt - When the delta asked.
   */
  async setMonthLastDeltaCheckAt(deviceId: string, year: number, month: number, checkedAt: number): Promise<void> {
    await sqliteService.executeSql(DB_NAME, photoMonthSyncTable.statements.setLastDeltaCheckAt, [
      checkedAt,
      deviceId,
      year,
      month,
    ]);
  }

  /**
   * Moves a month's delta high-water mark forward.
   *
   * @param deviceId - Device folder uuid.
   * @param year - Year of the month.
   * @param month - Month, 1-12.
   * @param lastServerUpdatedAt - Newest `updatedAt` already applied to `cloud_asset` for that month.
   */
  async setMonthLastServerUpdatedAt(
    deviceId: string,
    year: number,
    month: number,
    lastServerUpdatedAt: number,
  ): Promise<void> {
    await sqliteService.executeSql(DB_NAME, photoMonthSyncTable.statements.setLastServerUpdatedAt, [
      lastServerUpdatedAt,
      deviceId,
      year,
      month,
    ]);
  }

  /**
   * Records that the full sync read a month, creating the row if discovery had not reached it yet.
   *
   * @param params.deviceId - Device folder uuid.
   * @param params.year - Year of the month.
   * @param params.month - Month, 1-12.
   * @param params.monthFolderUuid - uuid of the month folder that was read.
   * @param params.fullySyncedAt - When the full sync read it.
   */
  async markMonthFullySynced(params: {
    deviceId: string;
    year: number;
    month: number;
    monthFolderUuid: string;
    fullySyncedAt: number;
  }): Promise<void> {
    await sqliteService.executeSql(DB_NAME, photoMonthSyncTable.statements.markFullySynced, [
      params.deviceId,
      params.year,
      params.month,
      params.monthFolderUuid,
      params.fullySyncedAt,
    ]);
  }

  /**
   * When the full sync last read a month, or null if it never did.
   *
   * @param deviceId - Device folder uuid.
   * @param year - Year of the month.
   * @param month - Month, 1-12.
   */
  async getMonthLastFullSyncAt(deviceId: string, year: number, month: number): Promise<number | null> {
    const row = await sqliteService.getFirstAsync<{ last_full_sync_at: number | null }>(
      DB_NAME,
      photoMonthSyncTable.statements.getLastFullSyncAt,
      [deviceId, year, month],
    );
    return row?.last_full_sync_at ?? null;
  }

  async getMonthSyncEntriesByDevice(deviceId: string): Promise<PhotoMonthSyncEntry[]> {
    const rows = await sqliteService.getAllAsync<PhotoMonthSyncRow>(
      DB_NAME,
      photoMonthSyncTable.statements.getByDevice,
      [deviceId],
    );
    return rows.map(rowToMonthSyncEntry);
  }

  async deleteMonthSyncEntry(deviceId: string, year: number, month: number): Promise<void> {
    await sqliteService.executeSql(DB_NAME, photoMonthSyncTable.statements.delete, [deviceId, year, month]);
    await sqliteService.executeSql(DB_NAME, photoDayFolderTable.statements.deleteByMonth, [deviceId, year, month]);
  }

  /**
   * Records the day folders of a month.
   *
   * @param entries - One per day folder, keyed by its uuid.
   */
  async upsertDayFolders(entries: PhotoDayFolderEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await sqliteService.executeBulk(
      DB_NAME,
      photoDayFolderTable.statements.upsert,
      entries.map(({ dayFolderUuid, deviceId, year, month, day }) => [dayFolderUuid, deviceId, year, month, day]),
    );
  }

  async getDayFoldersByMonth(deviceId: string, year: number, month: number): Promise<PhotoDayFolderEntry[]> {
    const rows = await sqliteService.getAllAsync<PhotoDayFolderRow>(
      DB_NAME,
      photoDayFolderTable.statements.getByMonth,
      [deviceId, year, month],
    );
    return rows.map(rowToDayFolderEntry);
  }

  async deleteDayFolders(dayFolderUuids: string[]): Promise<void> {
    if (dayFolderUuids.length === 0) return;
    const placeholders = this.buildInClausePlaceholders(dayFolderUuids);
    await sqliteService.executeSql(DB_NAME, photoDayFolderTable.statements.deleteByUuids(placeholders), dayFolderUuids);
  }

  async countKnownFolders(): Promise<{ months: number; days: number }> {
    const monthRow = await sqliteService.getFirstAsync<{ total: number }>(
      DB_NAME,
      photoMonthSyncTable.statements.countAll,
    );
    const dayRow = await sqliteService.getFirstAsync<{ total: number }>(
      DB_NAME,
      photoDayFolderTable.statements.countAll,
    );
    return { months: monthRow?.total ?? 0, days: dayRow?.total ?? 0 };
  }

  /**
   * Fills `photo_day_folder` from the day folders `cloud_asset` already knows. Only runs while the
   * table is empty.
   *
   * @returns How many day folders were seeded, or 0 when the table already had rows.
   */
  async seedDayFoldersFromCloudAssets(): Promise<number> {
    const existing = await sqliteService.getFirstAsync<{ total: number }>(
      DB_NAME,
      photoDayFolderTable.statements.countAll,
    );
    if ((existing?.total ?? 0) > 0) return 0;

    const assets = await this.getAllCloudAssets();
    const byUuid = new Map<string, PhotoDayFolderEntry>();

    for (const asset of assets) {
      if (!asset.folderUuid || byUuid.has(asset.folderUuid)) continue;
      // Local getters, matching how the full sync derives folder_date. `strftime(..., 'unixepoch')`
      // would read it as UTC and shift days either side of midnight.
      const folderDate = new Date(asset.folderDate);
      byUuid.set(asset.folderUuid, {
        dayFolderUuid: asset.folderUuid,
        deviceId: asset.deviceId,
        year: folderDate.getFullYear(),
        month: folderDate.getMonth() + 1,
        day: folderDate.getDate(),
      });
    }

    const entries = [...byUuid.values()];
    await this.upsertDayFolders(entries);
    return entries.length;
  }
}

export const photosLocalDB = new PhotosLocalDB();
