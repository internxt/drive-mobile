import sqliteService from '../../SqliteService';
import assetSyncTable from './tables/asset_sync';

const DB_NAME = 'photos_sync.db';

export type AssetSyncStatus = 'pending' | 'pending_edit' | 'synced' | 'error';

export interface AssetSyncEntry {
  assetId: string;
  status: AssetSyncStatus;
  remoteFileId: string | null;
  syncedAt: number | null;
  errorMessage: string | null;
  attemptCount: number;
  createdAt: number;
  lastAttemptAt: number | null;
  modificationTime: number | null;
}

interface AssetSyncRow {
  asset_id: string;
  status: AssetSyncStatus;
  remote_file_id: string | null;
  synced_at: number | null;
  error_message: string | null;
  attempt_count: number;
  created_at: number;
  last_attempt_at: number | null;
  modification_time: number | null;
}

export interface SyncedAssetInfo {
  modificationTime: number | null;
}

const CHUNK_SIZE = 300;

class PhotosLocalDB {
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    this.initPromise ??= (async () => {
      await sqliteService.open(DB_NAME);
      await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.createTable);
      await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.createIndex);
    })();
    return this.initPromise;
  }

  async markPending(assetId: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markPending, [assetId]);
  }

  async markPendingEdit(assetId: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markPendingEdit, [assetId]);
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

  async getSyncedEntries(assetIds: string[]): Promise<Map<string, SyncedAssetInfo>> {
    if (assetIds.length === 0) return new Map();

    const chunks: string[][] = [];
    for (let i = 0; i < assetIds.length; i += CHUNK_SIZE) {
      chunks.push(assetIds.slice(i, i + CHUNK_SIZE));
    }

    const results = await Promise.all(
      chunks.map((chunk) => {
        const placeholders = chunk.map(() => '?').join(', ');
        return sqliteService.getAllAsync<{ asset_id: string; modification_time: number | null }>(
          DB_NAME,
          assetSyncTable.statements.getSyncedInList(placeholders),
          chunk,
        );
      }),
    );

    const synced = new Map<string, SyncedAssetInfo>();
    for (const chunk of results) {
      for (const row of chunk) {
        synced.set(row.asset_id, { modificationTime: row.modification_time });
      }
    }
    return synced;
  }

  async getStatus(assetId: string): Promise<AssetSyncEntry | null> {
    const row = await sqliteService.getFirstAsync<AssetSyncRow>(DB_NAME, assetSyncTable.statements.getStatus, [
      assetId,
    ]);
    if (!row) return null;
    return {
      assetId: row.asset_id,
      status: row.status,
      remoteFileId: row.remote_file_id,
      syncedAt: row.synced_at,
      errorMessage: row.error_message,
      attemptCount: row.attempt_count,
      createdAt: row.created_at,
      lastAttemptAt: row.last_attempt_at,
      modificationTime: row.modification_time,
    };
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

  async reset(): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.reset);
  }
}

export const photosLocalDB = new PhotosLocalDB();
