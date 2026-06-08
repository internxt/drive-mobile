import sqliteService from '../../SqliteService';
import assetSyncTable from './tables/asset_sync';
import cloudAssetTable from './tables/cloud_asset';

const DB_NAME = 'photos_sync.db';

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
}

export type AssetSyncStatus = 'pending' | 'pending_edit' | 'synced' | 'error' | 'deleted' | 'cloud_deleted';

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
}

export interface SyncedAssetInfo {
  modificationTime: number | null;
  status: 'synced' | 'cloud_deleted';
}

export interface AssetMediaInfo {
  fileName: string;
  creationTime: number;
  width: number;
  height: number;
  duration: number;
  mediaType: string;
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
    ]);
  }

  async markSynced(assetId: string, remoteFileId: string, modificationTime: number | null): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markSynced, [
      assetId,
      remoteFileId,
      modificationTime,
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

  async getPendingAssets(): Promise<Array<{ assetId: string; status: AssetSyncStatus; remoteFileId: string | null }>> {
    const pendingAssets = await sqliteService.getAllAsync<{
      asset_id: string;
      status: AssetSyncStatus;
      remote_file_id: string | null;
    }>(DB_NAME, assetSyncTable.statements.getPendingAssets);
    return pendingAssets.map((asset) => ({
      assetId: asset.asset_id,
      status: asset.status,
      remoteFileId: asset.remote_file_id,
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
