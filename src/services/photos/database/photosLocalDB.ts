import sqliteService from '../../SqliteService';
import assetSyncTable from './tables/asset_sync';
import cloudAssetTable from './tables/cloud_asset';

const DB_NAME = 'photos_sync.db';

export type LivePhotoRole = 'photo' | 'paired_video';
// BURST:
export type BurstRole = 'representative' | 'member';

export interface CloudAssetEntry {
  remoteFileId: string;
  deviceId: string;
  createdAt: number;
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
}

interface CloudAssetRow {
  remote_file_id: string;
  device_id: string;
  created_at: number;
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
}

interface AssetSyncRow {
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
}

export interface SyncedAssetInfo {
  modificationTime: number | null;
  status: 'synced' | 'cloud_deleted';
}

export interface IncompleteBurstAsset {
  assetId: string;
  remoteFileId: string | null;
  fileName: string | null;
  creationTime: number | null;
  modificationTime: number | null;
}

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
    createdAt: row.created_at,
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
});

class PhotosLocalDB {
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    this.initPromise ??= (async () => {
      await sqliteService.open(DB_NAME);
      await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.createTable);
      await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.createIndex);
      await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.createTable);
      await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.createIndexCreated);
      await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.createIndexDevice);
      await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.createIndexMonth);
      await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.createIndexRole);
      await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.createIndexBurstGroup);
    })();
    return this.initPromise;
  }

  async markPending(assetId: string, mediaInfo?: AssetMediaInfo): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markPending, [
      assetId,
      mediaInfo?.fileName ?? null,
      mediaInfo?.creationTime ?? null,
      mediaInfo?.width ?? null,
      mediaInfo?.height ?? null,
      mediaInfo?.duration ?? null,
      mediaInfo?.mediaType ?? null,
      mediaInfo?.isLivePhoto ? 1 : 0,
      mediaInfo?.isBurst ? 1 : 0,
    ]);
  }

  async markPendingEdit(assetId: string, mediaInfo?: AssetMediaInfo): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markPendingEdit, [
      assetId,
      mediaInfo?.fileName ?? null,
      mediaInfo?.creationTime ?? null,
      mediaInfo?.width ?? null,
      mediaInfo?.height ?? null,
      mediaInfo?.duration ?? null,
      mediaInfo?.mediaType ?? null,
      mediaInfo?.isLivePhoto ? 1 : 0,
      mediaInfo?.isBurst ? 1 : 0,
    ]);
  }

  async markSynced(assetId: string, remoteFileId: string, modificationTime: number | null): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markSynced, [
      assetId,
      remoteFileId,
      modificationTime,
    ]);
  }

  async markSyncedLivePhoto(
    assetId: string,
    remoteFileId: string,
    modificationTime: number | null,
    pairedVideoRemoteFileId: string | null,
    pairedVideoStatus: PairedVideoStatus,
  ): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markSyncedLivePhoto, [
      assetId,
      remoteFileId,
      modificationTime,
      pairedVideoRemoteFileId,
      pairedVideoStatus,
    ]);
  }

  async markError(assetId: string, errorMessage?: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markError, [assetId, errorMessage ?? null]);
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
        const placeholders = chunk.map(() => '?').join(', ');
        return sqliteService.getAllAsync<{
          asset_id: string;
          modification_time: number | null;
          status: 'synced' | 'cloud_deleted';
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

  async getSyncedRemoteIdsByCreationMonth(year: number, month: number): Promise<Set<string>> {
    const startMs = new Date(year, month - 1, 1).getTime();
    const endMs = new Date(year, month, 1).getTime();
    const rows = await sqliteService.getAllAsync<{ remote_file_id: string }>(
      DB_NAME,
      assetSyncTable.statements.getSyncedRemoteIdsByCreationMonth,
      [startMs, endMs],
    );
    return new Set(rows.map((r) => r.remote_file_id));
  }

  async markCloudDeleted(remoteFileId: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markCloudDeleted, [remoteFileId]);
  }

  async resetSyncedToPending(): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.resetSyncedToPending);
  }

  async getDistinctCloudAssetDeviceIds(): Promise<string[]> {
    const rows = await sqliteService.getAllAsync<{ device_id: string }>(
      DB_NAME,
      cloudAssetTable.statements.getDistinctDeviceIds,
    );
    return rows.map((r) => r.device_id);
  }

  async deleteCloudAssetsByDevice(deviceId: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.deleteByDevice, [deviceId]);
  }

  async getCloudAssetMonthsByDevice(deviceId: string): Promise<{ year: number; month: number }[]> {
    return sqliteService.getAllAsync<{ year: number; month: number }>(
      DB_NAME,
      cloudAssetTable.statements.getMonthsByDevice,
      [deviceId],
    );
  }

  async getSyncedMonths(): Promise<{ year: number; month: number }[]> {
    return sqliteService.getAllAsync<{ year: number; month: number }>(
      DB_NAME,
      assetSyncTable.statements.getSyncedMonths,
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

  async getDeletedAssetIds(): Promise<Set<string>> {
    const rows = await sqliteService.getAllAsync<{ asset_id: string }>(
      DB_NAME,
      assetSyncTable.statements.getDeletedIds,
    );
    return new Set(rows.map((row) => row.asset_id));
  }

  async deleteAssetSync(assetId: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.deleteById, [assetId]);
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
      entry.createdAt,
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
      // BURST:
      entry.burstRole ?? null,
      entry.burstGroupId ?? null,
    ]);
  }

  async getCloudAssetById(remoteFileId: string): Promise<CloudAssetEntry | null> {
    const row = await sqliteService.getFirstAsync<CloudAssetRow>(DB_NAME, cloudAssetTable.statements.getById, [
      remoteFileId,
    ]);
    return row ? rowToCloudAssetEntry(row) : null;
  }

  async getAllCloudAssets(): Promise<CloudAssetEntry[]> {
    const rows = await sqliteService.getAllAsync<CloudAssetRow>(DB_NAME, cloudAssetTable.statements.getAll);
    return rows.map(rowToCloudAssetEntry);
  }

  async getCloudAssetsByRange(from: number, to: number): Promise<CloudAssetEntry[]> {
    const rows = await sqliteService.getAllAsync<CloudAssetRow>(DB_NAME, cloudAssetTable.statements.getByRange, [
      from,
      to,
    ]);
    return rows.map(rowToCloudAssetEntry);
  }

  async setCloudThumbnailPath(remoteFileId: string, path: string | null): Promise<void> {
    await sqliteService.executeSql(DB_NAME, cloudAssetTable.statements.setThumbnailPath, [path, remoteFileId]);
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
  ): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markSyncedBurst, [
      assetId,
      remoteFileId,
      modificationTime,
      burstId,
      JSON.stringify(memberUuids),
      memberCount,
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

  async getCloudFetchCacheAge(deviceId: string, year: number, month: number): Promise<number | null> {
    const from = new Date(year, month - 1, 1).getTime();
    const to = new Date(year, month, 1).getTime();
    const row = await sqliteService.getFirstAsync<{ latest: number | null }>(
      DB_NAME,
      cloudAssetTable.statements.getLatestDiscoveredAt,
      [deviceId, from, to],
    );
    return row?.latest ?? null;
  }
}

export const photosLocalDB = new PhotosLocalDB();
