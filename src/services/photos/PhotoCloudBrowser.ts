import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { DriveFileData } from '@internxt-mobile/types/drive/file';
import { FetchPaginatedFolder, Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { logger } from 'src/services/common';
import { driveFolderService } from 'src/services/drive/folder/driveFolder.service';
import { buildBurstBaseSet, linkBurst } from './burst/BurstCloudLinker';
import { isBurstMemberPlainName } from './burst/burst.constants';
import { AssetSyncEntry, BurstRole, CloudAssetEntry, LivePhotoRole, photosLocalDB } from './database/photosLocalDB';
import {
  getPairedVideoPlainNameFromPhoto,
  getPhotoPlainNameFromPairedVideo,
  isPairedVideoPlainName,
} from './livePhoto.constants';
import { photosDeviceService } from './photosDeviceService';

const HOUR_MS = 60 * 60 * 1000;
const CACHE_TTL_MS = 24 * HOUR_MS;
const PAGE_SIZE = 50;
const MIN_MONTH_NUMBER = 1;
const MAX_MONTH_NUMBER = 12;

// The SDK's Thumbnail type omits `createdAt`, need to add it
type ThumbnailWithCreatedAt = Thumbnail & { createdAt?: string };

/**
 * Picks the most recently created thumbnail. A file can have several thumbnail entries (e.g.
 * after an edited photo is re-uploaded and a new thumbnail is generated), and `id` is an
 * autoincrement fallback for when `createdAt` isn't present on either candidate.
 */
const pickLatestThumbnail = (thumbnails: ThumbnailWithCreatedAt[] | undefined): ThumbnailWithCreatedAt | null => {
  if (!thumbnails?.length) {
    return null;
  }
  return thumbnails.reduce((newest, candidate) => {
    if (candidate.createdAt && newest.createdAt) {
      return new Date(candidate.createdAt).getTime() > new Date(newest.createdAt).getTime() ? candidate : newest;
    }
    return candidate.id > newest.id ? candidate : newest;
  }, thumbnails[0]);
};

const resolveBurstFields = (
  baseName: string | null,
  fileUuid: string,
  plainNameIndex: Map<string, string>,
  burstBaseSet: Set<string>,
): { burstRole?: BurstRole; burstGroupId?: string } => {
  const burstLink = linkBurst(baseName, fileUuid, plainNameIndex, burstBaseSet);
  if (!burstLink && baseName && isBurstMemberPlainName(baseName)) {
    logger.warn(
      `[CloudBrowser] .burst member ${baseName} has no representative in the same day-folder — cross-day burst detected`,
    );
  }
  return burstLink ? { burstRole: burstLink.burstRole, burstGroupId: burstLink.burstGroupId } : {};
};

const fetchAllPages = async <T>(fetcher: (offset: number) => Promise<T[]>): Promise<T[]> => {
  const alltItems: T[] = [];
  let offset = 0;
  let batch: T[];
  do {
    batch = await fetcher(offset);
    alltItems.push(...batch);
    offset += PAGE_SIZE;
  } while (batch.length === PAGE_SIZE);
  return alltItems;
};

class PhotoCloudBrowserService {
  private readonly cloudIndexUpdateSubscribers = new Set<() => void>();

  private readonly inFlightMonthBackfills = new Map<string, Promise<number>>();
  private readonly pendingMonthBackfillReruns = new Set<string>();

  constructor(
    private readonly folderService: typeof driveFolderService,
    private readonly localDB: typeof photosLocalDB,
  ) {}

  subscribeToCloudIndexUpdates(callback: () => void): () => void {
    this.cloudIndexUpdateSubscribers.add(callback);
    return () => {
      this.cloudIndexUpdateSubscribers.delete(callback);
    };
  }

  /** Resolves once every queued month backfill (see `queueMonthBackfill`), including trailing re-runs, has settled. */
  async waitForPendingCloudIndexUpdates(): Promise<void> {
    while (this.inFlightMonthBackfills.size > 0) {
      await Promise.all(this.inFlightMonthBackfills.values());
    }
  }

  private notifyCloudIndexUpdated(): void {
    this.cloudIndexUpdateSubscribers.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        logger.error('[CloudBrowser] Cloud index update subscriber failed', { error });
      }
    });
  }

  async listDeviceFolders(): Promise<{ uuid: string }[]> {
    const devices = await photosDeviceService.listDevices();
    return devices.filter((device) => device.status === 'EXISTS').map((device) => ({ uuid: device.uuid }));
  }

  /**
   * Writes a `cloud_asset` row for a just-synced asset directly, without fetching Drive. Always
   * called after `asset_sync` is marked synced, regardless of which upload/replace path produced
   * it. Maps whatever `asset_sync` already knows (thumbnail, content refs, burst/Live Photo
   * pairing); fields it doesn't have preserve the value already in `cloud_asset`, if any. Queues
   * a background backfill whenever the thumbnail or content refs (`contentFileId`/`bucket`) are
   * still missing, so the row converges without waiting for the month's TTL. No-op if there's no
   * fresh thumbnail data and a complete row already exists for this asset.
   *
   * @param assetId - Local asset id whose `asset_sync` row was just marked synced.
   * @param deviceId - This device's folder uuid, or null if unknown (no-op in that case).
   */
  async recordSyncedAsset(assetId: string, deviceId: string | null): Promise<void> {
    if (!deviceId) {
      logger.info(`[CloudBrowser] recordSyncedAsset skipped — assetId=${assetId}, no deviceId`);
      return;
    }
    const assetEntry = await this.localDB.getStatus(assetId);
    if (!assetEntry?.remoteFileId) {
      logger.info(`[CloudBrowser] recordSyncedAsset skipped — assetId=${assetId}, no remoteFileId in asset_sync`);
      return;
    }

    const existing = await this.localDB.getCloudAssetById(assetEntry.remoteFileId);

    if (!assetEntry.thumbnailBucketId && existing?.thumbnailBucketId) {
      logger.info(
        `[CloudBrowser] recordSyncedAsset skipped — remoteFileId=${assetEntry.remoteFileId} already complete in cloud index`,
      );
      return;
    }

    const entry = this.buildCloudAssetEntry(assetEntry, deviceId, existing);
    if (assetEntry.thumbnailBucketId) {
      // Must run before the upsert — it reads the thumbnail_bucket_file still in cloud_asset.
      await this.evictStaleThumbnailCacheFiles([entry]);
    }
    await this.localDB.upsertCloudAsset(entry);

    const hasFullContentRefs = !!(assetEntry.contentFileId && assetEntry.bucket);
    if (assetEntry.thumbnailBucketId && hasFullContentRefs) {
      logger.info(
        `[CloudBrowser] Recorded synced asset in cloud index (complete, no fetch) — remoteFileId=${assetEntry.remoteFileId}`,
      );
      return;
    }

    logger.info(
      `[CloudBrowser] Recorded synced asset in cloud index (${assetEntry.thumbnailBucketId ? 'content refs pending' : 'thumbnail pending'}) — remoteFileId=${assetEntry.remoteFileId}`,
    );
    this.queueMonthBackfill(deviceId, assetEntry.creationTime, 'after upload');
  }

  /**
   * Fires a `fetchMonth({force: true})` in the background for the month containing
   * `creationTimeMs`. Coalesces with any backfill already in flight for the same device/month
   * (see `inFlightMonthBackfills`) instead of starting a redundant one.
   *
   * @param deviceId - Device folder uuid whose month should be re-fetched.
   * @param creationTimeMs - Creation time (ms) of the asset that triggered this backfill; used
   *   only to resolve which year/month to fetch. No-op if null.
   * @param context - Short label included in log lines to distinguish callers (e.g. "after upload").
   */
  private queueMonthBackfill(deviceId: string, creationTimeMs: number | null, context: string): void {
    if (!creationTimeMs) {
      return;
    }
    const date = new Date(creationTimeMs);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${deviceId}:${year}:${month}`;

    if (this.inFlightMonthBackfills.has(key)) {
      this.pendingMonthBackfillReruns.add(key);
      logger.info(
        `[CloudBrowser] Backfill ${context} — device=${deviceId} ${year}/${month} already in flight, scheduled a re-run after it`,
      );
      return;
    }

    const backfill = this.fetchMonth({
      deviceId,
      deviceFolderUuid: deviceId,
      year,
      month,
      force: true,
      currentDeviceId: deviceId,
    })
      .then((count) => {
        logger.info(
          `[CloudBrowser] Backfill ${context} — device=${deviceId} ${year}/${month}, ${count} file(s) upserted`,
        );
        if (count > 0) {
          this.notifyCloudIndexUpdated();
        }
        return count;
      })
      .catch((err: unknown) => {
        logger.warn(`[CloudBrowser] Backfill ${context} failed for ${deviceId} ${year}/${month}: ${err}`);
        return 0;
      })
      .finally(() => {
        this.inFlightMonthBackfills.delete(key);
        if (this.pendingMonthBackfillReruns.delete(key)) {
          this.queueMonthBackfill(deviceId, creationTimeMs, context);
        }
      });

    this.inFlightMonthBackfills.set(key, backfill);
  }

  /**
   * Builds a `cloud_asset` row from an `asset_sync` entry, mapping over whatever this call
   * already knows (thumbnail/content refs, burst/Live Photo pairing) and leaving the rest null.
   * Safe to write partially — `upsertCloudAsset`'s COALESCE semantics preserve any field a
   * previous real fetch already populated instead of overwriting it with null.
   *
   * @param entry - The `asset_sync` row to build from.
   * @param deviceId - This device's folder uuid.
   * @param existing - The current `cloud_asset` row for this remoteFileId, if any — used to carry
   *   over fields this call can't determine (currently `isFavorite`).
   * @returns The corresponding `cloud_asset` row, ready to upsert.
   */
  private buildCloudAssetEntry(
    entry: AssetSyncEntry,
    deviceId: string,
    existing?: CloudAssetEntry | null,
  ): CloudAssetEntry {
    const folderDate = entry.creationTime
      ? (() => {
          const d = new Date(entry.creationTime as number);
          return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        })()
      : 0;
    return {
      remoteFileId: entry.remoteFileId as string,
      deviceId,
      folderDate,
      fileName: entry.fileName ?? entry.assetId,
      fileSize: entry.fileSize,
      fileId: entry.contentFileId,
      bucket: entry.bucket,
      thumbnailPath: null,
      thumbnailBucketId: entry.thumbnailBucketId,
      thumbnailBucketFile: entry.thumbnailBucketFile,
      thumbnailType: entry.thumbnailType,
      // Local capture time, used as a proxy until a real fetch overwrites it with Drive's own value.
      creationTimeApi: entry.creationTime,
      ...this.buildLivePhotoAndBurstFields(entry),
      discoveredAt: 0,
      uploadedAt: entry.syncedAt ?? Date.now(),
      isFavorite: existing?.isFavorite ?? false,
    };
  }

  /**
   * Derives the Live Photo/burst pairing fields shared by both direct-write `cloud_asset`
   * builders. `entry.isLivePhoto`/`entry.isBurst` and their pairing ids are known from
   * `asset_sync` regardless of whether the thumbnail/content refs are present.
   *
   * @param entry - The `asset_sync` row to derive pairing from.
   * @returns `isLivePhoto`, `livePhotoRole`, `pairedRemoteFileId`, `burstRole`, `burstGroupId`.
   */
  private buildLivePhotoAndBurstFields(
    entry: AssetSyncEntry,
  ): Pick<CloudAssetEntry, 'isLivePhoto' | 'livePhotoRole' | 'pairedRemoteFileId' | 'burstRole' | 'burstGroupId'> {
    return {
      isLivePhoto: entry.isLivePhoto,
      livePhotoRole: entry.isLivePhoto ? 'photo' : undefined,
      pairedRemoteFileId: entry.isLivePhoto ? entry.pairedVideoRemoteFileId : undefined,
      burstRole: entry.isBurst ? 'representative' : undefined,
      // entry.remoteFileId, not entry.burstId (a different, local id) — see BurstCloudLinker.linkBurst.
      burstGroupId: entry.isBurst ? (entry.remoteFileId ?? undefined) : undefined,
    };
  }

  private async preserveCloudVisibilityForOrphans(entries: AssetSyncEntry[], deviceId: string): Promise<void> {
    const monthsToBackfill = new Map<string, number>();
    for (const entry of entries) {
      if (!entry.remoteFileId) {
        logger.info(
          `[CloudBrowser] deleteAssetSyncPreservingCloudVisibility — assetId=${entry.assetId} skipped, never had a remote backup`,
        );
        continue;
      }
      const existing = await this.localDB.getCloudAssetById(entry.remoteFileId);
      logger.info(
        `[CloudBrowser] deleteAssetSyncPreservingCloudVisibility — assetId=${entry.assetId}, remoteFileId=${entry.remoteFileId}, hasExistingCloudRow=${!!existing}`,
      );
      if (!existing) {
        await this.localDB.upsertCloudAsset(this.buildCloudAssetEntry(entry, deviceId));
        logger.info(
          `[CloudBrowser] Synthesized cloud entry before local delete — remoteFileId=${entry.remoteFileId}, fileName=${entry.fileName ?? 'unknown'}`,
        );
      }
      if (entry.creationTime) {
        const date = new Date(entry.creationTime);
        monthsToBackfill.set(`${date.getFullYear()}:${date.getMonth() + 1}`, entry.creationTime);
      }
    }
    for (const creationTimeMs of monthsToBackfill.values()) {
      this.queueMonthBackfill(deviceId, creationTimeMs, 'after local delete');
    }
  }

  /**
   * Removes `asset_sync` rows for locally-deleted assets that had a remote backup but no
   * `cloud_asset` row yet (upload happened inside the cloud-sync TTL window, or on a build
   * predating this fix) — without this, the asset would vanish from the timeline entirely
   * instead of surfacing as cloud-only. Inserts a minimal `cloud_asset` row synchronously
   * (from data already in `asset_sync`, so it works offline) and kicks off a best-effort
   * background refresh of the asset's day-folder to fill in real thumbnails/pairing.
   *
   * @param assetIds - Ids of the local assets to remove from `asset_sync`.
   * @param deviceId - This device's folder uuid, or null if unknown (skips the cloud-visibility
   *   preservation — the rows are still deleted).
   */
  async deleteAssetSyncPreservingCloudVisibility(assetIds: string[], deviceId: string | null): Promise<void> {
    if (assetIds.length === 0) {
      return;
    }
    if (deviceId) {
      const entries = (await Promise.all(assetIds.map((id) => this.localDB.getStatus(id)))).filter(
        (e): e is AssetSyncEntry => e !== null,
      );
      await this.preserveCloudVisibilityForOrphans(entries, deviceId);
    }
    await this.localDB.deleteAssetSyncBulk(assetIds);
  }

  /**
   * Removes `asset_sync` rows for assets no longer present on the device, preserving cloud
   * visibility for any that had a remote backup (see `deleteAssetSyncPreservingCloudVisibility`).
   *
   * @param localAssetIds - Ids of the assets currently on the device.
   * @param deviceId - This device's folder uuid, or null if unknown.
   * @returns The number of `asset_sync` rows removed.
   */
  async cleanupOrphanedAssetSync(localAssetIds: Set<string>, deviceId: string | null): Promise<number> {
    const orphanAssetsIds = await this.localDB.getOrphanedAssetSyncIds(localAssetIds);
    if (orphanAssetsIds.length === 0) {
      return 0;
    }
    await this.deleteAssetSyncPreservingCloudVisibility(orphanAssetsIds, deviceId);
    return orphanAssetsIds.length;
  }

  async fetchMonth(params: {
    deviceId: string;
    deviceFolderUuid: string;
    year: number;
    month: number;
    onMonthFetched?: () => void;
    force?: boolean;
    currentDeviceId?: string;
  }): Promise<number> {
    const { deviceId, deviceFolderUuid, year, month, onMonthFetched, force, currentDeviceId } = params;
    if (!force) {
      const cacheAge = await this.localDB.getCloudFetchCacheAge(deviceId, year, month);
      if (cacheAge !== null && Date.now() - cacheAge < CACHE_TTL_MS) {
        return 0;
      }
    }

    const yearFolder = await this.findChildFolder(deviceFolderUuid, String(year));
    if (!yearFolder) {
      return 0;
    }

    const monthStr = String(month).padStart(2, '0');
    const monthFolder = await this.findChildFolder(yearFolder.uuid, monthStr);
    if (!monthFolder) {
      return 0;
    }

    return this.fetchMonthFromFolder({
      deviceId,
      monthFolderUuid: monthFolder.uuid,
      year,
      month,
      onMonthFetched,
      force,
      currentDeviceId,
      cycleStartedAt: Date.now(),
    });
  }

  async syncAllHistory(options: {
    onMonthFetched?: () => void;
    isCancelled?: () => boolean;
    force?: boolean;
    currentDeviceId: string | undefined;
  }): Promise<void> {
    const { onMonthFetched, isCancelled, force, currentDeviceId } = options;
    logger.info(
      `[CloudBrowser] syncAllHistory — currentDeviceId=${currentDeviceId ?? 'none'}, force=${force ?? false}`,
    );
    const cycleStartedAt = Date.now();
    const devices = await this.listDeviceFolders();
    if (devices.length === 0) {
      logger.info('[CloudBrowser] No device folders found — skipping sync');
      if (currentDeviceId) {
        // Own device folder gone from cloud — every remote reference is stale. Reset synced
        // assets to pending (not cloud_deleted) so the next upload cycle restores the backup.
        await this.purgeDeletedDevices(devices, onMonthFetched);
        await this.localDB.resetSyncedToPending(cycleStartedAt);
      }
      return;
    }

    const currentDeviceMissing = !!currentDeviceId && !devices.some((device) => device.uuid === currentDeviceId);
    if (currentDeviceMissing) {
      logger.info(
        `[CloudBrowser] Current device "${currentDeviceId}" not found among Drive's device folders — resetting synced assets to pending`,
      );
      await this.localDB.resetSyncedToPending(cycleStartedAt);
    }
    logger.info(`[CloudBrowser] Syncing ${devices.length} device(s): ${devices.map((d) => d.uuid).join(', ')}`);

    await this.purgeDeletedDevices(devices, onMonthFetched);

    const months = await this.discoverAvailableMonths(devices);

    // Own device's most recent months first: workers pull from the front of this array, so a
    // manual refresh surfaces the user's own recent changes without waiting behind other devices.
    months.sort((a, b) => {
      const aOwn = a.deviceId === currentDeviceId ? 0 : 1;
      const bOwn = b.deviceId === currentDeviceId ? 0 : 1;
      if (aOwn !== bOwn) return aOwn - bOwn;
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    if (months.length === 0) {
      logger.info('[CloudBrowser] Discovery found no months in cloud');
    } else {
      logger.info(
        `[CloudBrowser] Discovered ${months.length} months across ${devices.length} device(s)${force ? ' — TTL bypassed (force refresh)' : ''}`,
      );
      const CONCURRENCY = 3;
      let cursor = 0;
      const worker = async (): Promise<void> => {
        while (cursor < months.length) {
          if (isCancelled?.()) {
            return;
          }
          const target = months[cursor++];
          await this.fetchMonthFromFolder({
            deviceId: target.deviceId,
            monthFolderUuid: target.monthFolderUuid,
            year: target.year,
            month: target.month,
            onMonthFetched,
            force,
            currentDeviceId,
            cycleStartedAt,
          });
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    }

    if (isCancelled?.()) {
      logger.info('[CloudBrowser] Sync cancelled — skipping deleted-months reconciliation');
      return;
    }

    await this.reconcileDeletedMonths({ devices, discoveredMonths: months, currentDeviceId, cycleStartedAt });
  }

  private async fetchMonthFromFolder(params: {
    deviceId: string;
    monthFolderUuid: string;
    year: number;
    month: number;
    onMonthFetched?: () => void;
    force?: boolean;
    currentDeviceId: string | undefined;
    cycleStartedAt: number;
  }): Promise<number> {
    const { deviceId, monthFolderUuid, year, month, onMonthFetched, force, currentDeviceId, cycleStartedAt } = params;
    if (!force) {
      const cacheAge = await this.localDB.getCloudFetchCacheAge(deviceId, year, month);
      if (cacheAge !== null && Date.now() - cacheAge < CACHE_TTL_MS) return 0;
    }

    const dayFolders = await this.listAllFolders(monthFolderUuid);
    const now = Date.now();
    let count = 0;
    const foundIds = new Set<string>();

    for (const dayFolder of dayFolders) {
      const day = Number.parseInt(dayFolder.plainName ?? '', 10);
      const folderDate = new Date(year, month - 1, Number.isNaN(day) ? 1 : day).getTime();

      const files = await this.listFilesWithThumbnails(dayFolder.uuid);
      const existingFiles = files.filter((f) => !f.status || f.status.toLowerCase() === 'exists');

      const plainNameIndex = this.buildPlainNameIndex(existingFiles);
      const entries = this.buildCloudAssetEntries({ files: existingFiles, plainNameIndex, deviceId, folderDate, now });

      await this.evictStaleThumbnailCacheFiles(entries);

      for (const entry of entries) {
        foundIds.add(entry.remoteFileId);
        count++;
        await this.localDB.upsertCloudAsset(entry);
      }
    }

    await this.reconcileCloudDeletions({ deviceId, year, month, foundIds, currentDeviceId, cycleStartedAt });

    if (count > 0) {
      logger.info(
        `[CloudBrowser] Device "${deviceId}" ${year}/${String(month).padStart(2, '0')} — ${count} file(s) upserted`,
      );
      onMonthFetched?.();
    } else {
      logger.info(`[CloudBrowser] Device "${deviceId}" ${year}/${String(month).padStart(2, '0')} — empty`);
    }
    return count;
  }

  /**
   * Reconciles what the local DB believes is backed up for this device/month against what was
   * found in Drive. Marks ids no longer found as `cloud_deleted`, and reverts
   * previously `cloud_deleted` ids that are found again back to `synced`.
   *
   * @param params.deviceId - Device folder uuid being reconciled.
   * @param params.year - Year of the month being reconciled.
   * @param params.month - Month being reconciled (1-12).
   * @param params.foundIds - Remote file ids found in Drive for this device/month in this pass.
   * @param params.currentDeviceId - This device's own folder uuid, or undefined if unknown.
   * @param params.cycleStartedAt - Timestamp (ms) captured before this sync cycle started
   * observing the cloud
   */
  private async reconcileCloudDeletions(params: {
    deviceId: string;
    year: number;
    month: number;
    foundIds: Set<string>;
    currentDeviceId: string | undefined;
    cycleStartedAt: number;
  }): Promise<void> {
    const { deviceId, year, month, foundIds, currentDeviceId, cycleStartedAt } = params;
    const monthLabel = `${year}/${String(month).padStart(2, '0')}`;
    logger.info(
      `[CloudBrowser] reconcileCloudDeletions — device=${deviceId} ${monthLabel}, foundIds=${[...foundIds].length}, currentDeviceId=${currentDeviceId ?? 'none'}`,
    );
    const isCurrentDevice = !!currentDeviceId && deviceId === currentDeviceId;

    const knownIds = await this.getKnownRemoteIds({ deviceId, year, month, isCurrentDevice, cycleStartedAt });

    const removedCount = await this.markMissingAsCloudDeleted({ knownIds, foundIds });
    if (removedCount > 0) {
      logger.info(`[CloudBrowser] Device "${deviceId}" ${monthLabel} — ${removedCount} file(s) cloud_deleted`);
    }

    const revertedIds = await this.revertReappearedCloudDeleted({ year, month, foundIds, isCurrentDevice });
    if (revertedIds.length > 0) {
      logger.info(
        `[CloudBrowser] Device "${deviceId}" ${monthLabel} — ${revertedIds.length} file(s) reverted to synced (found in cloud again): ${revertedIds.join(', ')}`,
      );
    }
  }

  /**
   * Returns the remote ids the local DB believes are backed up for this device/month: cached
   * `cloud_asset` entries, plus — when `params.isCurrentDevice` is true — ids already `synced`
   * in `asset_sync` with a matching creation month.
   *
   * @param params.deviceId - Device folder uuid being reconciled.
   * @param params.year - Year of the month being reconciled.
   * @param params.month - Month being reconciled (1-12).
   * @param params.isCurrentDevice - Whether `params.deviceId` is this device's own folder uuid;
   *   when true, `asset_sync` is also consulted.
   * @param params.cycleStartedAt - Timestamp (ms) captured before this sync cycle started
   * observing the cloud
   * @returns The set of known remote file ids.
   */
  private async getKnownRemoteIds(params: {
    deviceId: string;
    year: number;
    month: number;
    isCurrentDevice: boolean;
    cycleStartedAt: number;
  }): Promise<Set<string>> {
    const { deviceId, year, month, isCurrentDevice, cycleStartedAt } = params;
    const knownFromCloud = await this.localDB.getCloudAssetRemoteIdsByDeviceAndMonth(deviceId, year, month);
    logger.info(
      `[CloudBrowser] reconcileCloudDeletions — knownFromCloud=${knownFromCloud.size} in local DB for device=${deviceId} ${year}/${String(month).padStart(2, '0')}`,
    );
    const knownIds = new Set(knownFromCloud);

    if (isCurrentDevice) {
      const knownFromSync = await this.localDB.getSyncedRemoteIdsByCreationMonth(year, month, cycleStartedAt);
      for (const id of knownFromSync) {
        knownIds.add(id);
      }
    }
    return knownIds;
  }

  /**
   * Marks ids present in `params.knownIds` but absent from `params.foundIds` as `cloud_deleted`.
   *
   * @param params.knownIds - Remote file ids the local DB believes are backed up.
   * @param params.foundIds - Remote file ids found in Drive for this device/month in this pass.
   * @returns The number of ids marked `cloud_deleted`.
   */
  private async markMissingAsCloudDeleted(params: { knownIds: Set<string>; foundIds: Set<string> }): Promise<number> {
    const { knownIds, foundIds } = params;
    let removedCount = 0;
    for (const knownId of knownIds) {
      if (!foundIds.has(knownId)) {
        await this.localDB.markCloudDeleted(knownId);
        await this.localDB.deleteCloudAsset(knownId);
        removedCount++;
      }
    }
    return removedCount;
  }

  /**
   * Reverts ids already marked `cloud_deleted` back to `synced` if they appear in
   * `params.foundIds` this pass. No-op unless `params.isCurrentDevice` is true — `asset_sync` is
   * only meaningful locally, so other devices have nothing to revert.
   *
   * @param params.year - Year of the month being reconciled.
   * @param params.month - Month being reconciled (1-12).
   * @param params.foundIds - Remote file ids found in Drive for this device/month in this pass.
   * @param params.isCurrentDevice - Whether the device being reconciled is this device's own
   *   folder uuid.
   * @returns The remote file ids that were reverted back to `synced`.
   */
  private async revertReappearedCloudDeleted(params: {
    year: number;
    month: number;
    foundIds: Set<string>;
    isCurrentDevice: boolean;
  }): Promise<string[]> {
    const { year, month, foundIds, isCurrentDevice } = params;
    if (!isCurrentDevice) {
      return [];
    }

    const cloudDeletedIds = await this.localDB.getCloudDeletedRemoteIdsByCreationMonth(year, month);
    const revertedIds = [...cloudDeletedIds].filter((id) => foundIds.has(id));
    if (revertedIds.length > 0) {
      await this.localDB.revertCloudDeleted(revertedIds);
    }
    return revertedIds;
  }

  private async purgeDeletedDevices(activeDevices: { uuid: string }[], onPurged?: () => void): Promise<void> {
    const activeDevicesIds = new Set(activeDevices.map((device) => device.uuid));
    const localIds = await this.localDB.getDistinctCloudAssetDeviceIds();
    const orphanedDeviceIds = localIds.filter((id) => !activeDevicesIds.has(id));
    if (orphanedDeviceIds.length === 0) {
      return;
    }

    logger.info(
      `[CloudBrowser] Purging ${orphanedDeviceIds.length} deleted device(s) from local DB: ${orphanedDeviceIds.join(', ')}`,
    );
    for (const deviceId of orphanedDeviceIds) {
      await this.localDB.deleteCloudAssetsByDevice(deviceId);
      logger.info(`[CloudBrowser] Purged all cloud_asset rows for deleted device=${deviceId}`);
    }
    onPurged?.();
  }

  private async reconcileDeletedMonths(params: {
    devices: { uuid: string }[];
    discoveredMonths: { deviceId: string; year: number; month: number; monthFolderUuid: string }[];
    currentDeviceId: string | undefined;
    cycleStartedAt: number;
  }): Promise<void> {
    const { devices, discoveredMonths, currentDeviceId, cycleStartedAt } = params;
    const discoveredSet = new Set(discoveredMonths.map((m) => `${m.deviceId}:${m.year}:${m.month}`));
    logger.info(
      `[CloudBrowser] reconcileDeletedMonths — ${devices.length} device(s) to reconcile: ${devices.map((d) => d.uuid).join(', ')}`,
    );

    for (const device of devices) {
      const deviceId = device.uuid;
      const cloudMonths = await this.localDB.getCloudAssetMonthsByDevice(deviceId);
      logger.info(
        `[CloudBrowser] reconcileDeletedMonths — device=${deviceId}: ${cloudMonths.length} month(s) in local DB: ${JSON.stringify(cloudMonths)}`,
      );
      const monthSet = new Set(cloudMonths.map((m) => `${m.year}:${m.month}`));

      if (currentDeviceId && deviceId === currentDeviceId) {
        const syncedMonths = await this.localDB.getSyncedMonths(cycleStartedAt);
        const isRecreatedDeviceFolder = cloudMonths.length === 0 && syncedMonths.length > 0;
        if (isRecreatedDeviceFolder) {
          logger.info(
            `[CloudBrowser] Device "${deviceId}" has no cloud history but local DB has synced months — resetting to pending for re-upload`,
          );
          await this.localDB.resetSyncedToPending(cycleStartedAt);
          continue;
        }
        for (const m of syncedMonths) monthSet.add(`${m.year}:${m.month}`);
      }

      for (const key of monthSet) {
        const [year, month] = key.split(':').map(Number);
        if (!discoveredSet.has(`${deviceId}:${year}:${month}`)) {
          logger.info(
            `[CloudBrowser] Device "${deviceId}" ${year}/${String(month).padStart(2, '0')} — month no longer in cloud`,
          );
          await this.reconcileCloudDeletions({
            deviceId,
            year,
            month,
            foundIds: new Set(),
            currentDeviceId,
            cycleStartedAt,
          });
        }
      }
    }
  }

  private async discoverMonthsForDevice(device: {
    uuid: string;
  }): Promise<{ deviceId: string; year: number; month: number; monthFolderUuid: string }[]> {
    const monthsForDevice: { deviceId: string; year: number; month: number; monthFolderUuid: string }[] = [];
    const yearFolders = await this.listAllFolders(device.uuid);
    for (const yearFolder of yearFolders) {
      const year = Number.parseInt(yearFolder.plainName ?? '', 10);
      if (Number.isNaN(year)) continue;
      const monthFolders = await this.listAllFolders(yearFolder.uuid);
      for (const monthFolder of monthFolders) {
        const month = Number.parseInt(monthFolder.plainName ?? '', 10);
        if (Number.isNaN(month) || month < MIN_MONTH_NUMBER || month > MAX_MONTH_NUMBER) continue;
        monthsForDevice.push({ deviceId: device.uuid, year, month, monthFolderUuid: monthFolder.uuid });
      }
    }
    return monthsForDevice;
  }

  private async discoverAvailableMonths(
    devices: { uuid: string }[],
  ): Promise<{ deviceId: string; year: number; month: number; monthFolderUuid: string }[]> {
    const monthsPerDevice = await Promise.all(devices.map((device) => this.discoverMonthsForDevice(device)));
    const allMonths = monthsPerDevice.flat();
    allMonths.sort((a, b) => b.year - a.year || b.month - a.month);
    return allMonths;
  }

  private buildPlainNameIndex(files: DriveFileData[]): Map<string, string> {
    const index = new Map<string, string>();
    for (const file of files) {
      const baseName = file.plainName ?? file.name;
      index.set(baseName.toLowerCase(), file.uuid);
    }
    return index;
  }

  private buildCloudAssetEntries({
    files,
    plainNameIndex,
    deviceId,
    folderDate,
    now,
  }: {
    files: DriveFileData[];
    plainNameIndex: Map<string, string>;
    deviceId: string;
    folderDate: number;
    now: number;
  }): CloudAssetEntry[] {
    const entries: CloudAssetEntry[] = [];
    const burstBaseSet = buildBurstBaseSet(files.map((f) => f.plainName ?? f.name ?? null));

    for (const file of files) {
      const baseName = file.plainName ?? file.name;
      const type = file.type ?? '';
      const fileName = type ? `${baseName}.${type}` : baseName;
      const thumb = pickLatestThumbnail(file.thumbnails);

      let livePhotoRole: LivePhotoRole | null = null;
      let isLivePhoto = false;
      let pairedRemoteFileId: string | null = null;

      if (isPairedVideoPlainName(baseName, type)) {
        const photoPlainName = getPhotoPlainNameFromPairedVideo(baseName).toLowerCase();
        const photoUuid = plainNameIndex.get(photoPlainName);
        if (photoUuid) {
          livePhotoRole = 'paired_video';
          pairedRemoteFileId = photoUuid;
        }
      } else {
        const pairedVideoPlainName = getPairedVideoPlainNameFromPhoto(baseName).toLowerCase();
        const pairedVideoUuid = plainNameIndex.get(pairedVideoPlainName);
        if (pairedVideoUuid) {
          isLivePhoto = true;
          livePhotoRole = 'photo';
          pairedRemoteFileId = pairedVideoUuid;
        }
      }

      entries.push({
        remoteFileId: file.uuid,
        deviceId,
        folderDate,
        fileName,
        fileSize: file.size ? Number(file.size) : null,
        fileId: file.fileId ?? null,
        thumbnailPath: null,
        thumbnailBucketId: thumb?.bucket_id ?? null,
        thumbnailBucketFile: thumb?.bucket_file ?? null,
        thumbnailType: thumb?.type ?? null,
        discoveredAt: now,
        plainName: file.plainName ?? null,
        extension: type || null,
        bucket: file.bucket ?? null,
        folderUuid: file.folderUuid ?? null,
        creationTimeApi: file.creationTime ? new Date(file.creationTime).getTime() : null,
        modificationTime: file.modificationTime ? new Date(file.modificationTime).getTime() : null,
        updatedAt: file.updatedAt ? new Date(file.updatedAt).getTime() : null,
        status: file.status ?? null,
        encryptVersion: file.encrypt_version ?? null,
        isLivePhoto,
        livePhotoRole,
        pairedRemoteFileId,
        uploadedAt: new Date(file.createdAt).getTime(),
        isFavorite: file.isFavorite ?? false,
        ...resolveBurstFields(baseName, file.uuid, plainNameIndex, burstBaseSet),
      });
    }

    return entries;
  }

  /**
   * Deletes cached thumbnail files that no longer match the file's current thumbnail bucket file
   * (e.g. after an edited photo replaced its thumbnail on the server). The DB row itself is
   * invalidated by the `upsertCloudAsset` upsert; this only reclaims the orphaned disk file.
   */
  private async evictStaleThumbnailCacheFiles(entries: CloudAssetEntry[]): Promise<void> {
    const entriesWithThumbnail = entries.filter((entry) => entry.thumbnailBucketFile);
    if (entriesWithThumbnail.length === 0) {
      return;
    }

    const cachedRefs = await this.localDB.getCachedThumbnailRefs(
      entriesWithThumbnail.map((entry) => entry.remoteFileId),
    );
    const stalePaths = entriesWithThumbnail
      .map((entry) => {
        const cached = cachedRefs.get(entry.remoteFileId);
        if (
          !cached?.thumbnailPath ||
          !cached.thumbnailBucketFile ||
          cached.thumbnailBucketFile === entry.thumbnailBucketFile
        ) {
          return null;
        }
        return cached.thumbnailPath;
      })
      .filter((path): path is string => path !== null);

    await Promise.all(stalePaths.map((path) => fileSystemService.unlinkIfExists(path)));
  }

  private async findChildFolder(parentUuid: string, name: string): Promise<FetchPaginatedFolder | null> {
    const folders = await fetchAllPages((offset) =>
      this.folderService.getFolderFolders(parentUuid, offset, PAGE_SIZE).then((r) => r.folders),
    );
    return folders.find((f) => (f.plainName ?? '') === name) ?? null;
  }

  private async listAllFolders(parentUuid: string): Promise<FetchPaginatedFolder[]> {
    return fetchAllPages((offset) =>
      this.folderService.getFolderFolders(parentUuid, offset, PAGE_SIZE).then((r) => r.folders),
    );
  }

  private async listFilesWithThumbnails(folderUuid: string): Promise<DriveFileData[]> {
    return fetchAllPages((offset) =>
      this.folderService.getFolderContentByUuid(folderUuid, offset, PAGE_SIZE).then((content) => content.files),
    );
  }
}

export const photoCloudBrowser = new PhotoCloudBrowserService(driveFolderService, photosLocalDB);
