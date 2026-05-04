import sqliteService from '../../SqliteService';
import assetSyncTable from './tables/asset_sync';

const DB_NAME = 'photos_sync.db';

export type AssetSyncStatus = 'pending' | 'synced' | 'error';

export interface AssetSyncEntry {
  assetId: string;
  status: AssetSyncStatus;
  remoteFileId: string | null;
  syncedAt: number | null;
  errorMessage: string | null;
  attemptCount: number;
  createdAt: number;
  lastAttemptAt: number | null;
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

  async markSynced(assetId: string, remoteFileId: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markSynced, [assetId, remoteFileId]);
  }

  async markError(assetId: string, errorMessage?: string): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.markError, [assetId, errorMessage ?? null]);
  }

  async getSyncedIds(assetIds: string[]): Promise<Set<string>> {
    if (assetIds.length === 0) return new Set();

    const chunks: string[][] = [];
    for (let i = 0; i < assetIds.length; i += CHUNK_SIZE) {
      chunks.push(assetIds.slice(i, i + CHUNK_SIZE));
    }

    const results = await Promise.all(
      chunks.map((chunk) => {
        const placeholders = chunk.map(() => '?').join(', ');
        return sqliteService.getAllAsync<{ asset_id: string }>(
          DB_NAME,
          assetSyncTable.statements.getSyncedInList(placeholders),
          chunk,
        );
      }),
    );

    const synced = new Set<string>();
    results.flat().forEach((row) => synced.add(row.asset_id));
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
    };
  }

  async reset(): Promise<void> {
    await sqliteService.executeSql(DB_NAME, assetSyncTable.statements.reset);
  }
}

export const photosLocalDB = new PhotosLocalDB();
