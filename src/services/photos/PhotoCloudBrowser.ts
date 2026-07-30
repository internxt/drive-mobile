import { DriveFileData } from '@internxt-mobile/types/drive/file';
import { FetchPaginatedFolder } from '@internxt/sdk/dist/drive/storage/types';
import { logger } from 'src/services/common';
import { driveFolderService } from 'src/services/drive/folder/driveFolder.service';
import { buildBurstBaseSet, linkBurst } from './burst/BurstCloudLinker';
import { isBurstMemberPlainName } from './burst/burst.constants';
import { BurstRole, CloudAssetEntry, LivePhotoRole, photosLocalDB } from './database/photosLocalDB';
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
  constructor(
    private readonly folderService: typeof driveFolderService,
    private readonly localDB: typeof photosLocalDB,
  ) {}

  async listDeviceFolders(): Promise<{ uuid: string }[]> {
    const devices = await photosDeviceService.listDevices();
    return devices.filter((device) => device.status === 'EXISTS').map((device) => ({ uuid: device.uuid }));
  }

  async fetchMonth(params: {
    deviceId: string;
    deviceFolderUuid: string;
    year: number;
    month: number;
    onMonthFetched?: () => void;
  }): Promise<number> {
    const { deviceId, deviceFolderUuid, year, month, onMonthFetched } = params;
    const cacheAge = await this.localDB.getCloudFetchCacheAge(deviceId, year, month);
    if (cacheAge !== null && Date.now() - cacheAge < CACHE_TTL_MS) return 0;

    const yearFolder = await this.findChildFolder(deviceFolderUuid, String(year));
    if (!yearFolder) return 0;

    const monthStr = String(month).padStart(2, '0');
    const monthFolder = await this.findChildFolder(yearFolder.uuid, monthStr);
    if (!monthFolder) return 0;

    return this.fetchMonthFromFolder({
      deviceId,
      monthFolderUuid: monthFolder.uuid,
      year,
      month,
      onMonthFetched,
      currentDeviceId: undefined,
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
    const devices = await this.listDeviceFolders();
    if (devices.length === 0) {
      logger.info('[CloudBrowser] No device folders found — skipping sync');
      if (currentDeviceId) {
        // Own device folder gone from cloud — every remote reference is stale. Reset synced
        // assets to pending (not cloud_deleted) so the next upload cycle restores the backup.
        await this.purgeDeletedDevices(devices, onMonthFetched);
        await this.localDB.resetSyncedToPending();
      }
      return;
    }

    const currentDeviceMissing = !!currentDeviceId && !devices.some((device) => device.uuid === currentDeviceId);
    if (currentDeviceMissing) {
      logger.info(
        `[CloudBrowser] Current device "${currentDeviceId}" not found among Drive's device folders — resetting synced assets to pending`,
      );
      await this.localDB.resetSyncedToPending();
    }
    logger.info(`[CloudBrowser] Syncing ${devices.length} device(s): ${devices.map((d) => d.uuid).join(', ')}`);

    await this.purgeDeletedDevices(devices, onMonthFetched);

    const months = await this.discoverAvailableMonths(devices);

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
          });
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    }

    await this.reconcileDeletedMonths({ devices, discoveredMonths: months, currentDeviceId });
  }

  private async fetchMonthFromFolder(params: {
    deviceId: string;
    monthFolderUuid: string;
    year: number;
    month: number;
    onMonthFetched?: () => void;
    force?: boolean;
    currentDeviceId: string | undefined;
  }): Promise<number> {
    const { deviceId, monthFolderUuid, year, month, onMonthFetched, force, currentDeviceId } = params;
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

      for (const entry of entries) {
        foundIds.add(entry.remoteFileId);
        count++;
        await this.localDB.upsertCloudAsset(entry);
      }
    }

    await this.reconcileCloudDeletions({ deviceId, year, month, foundIds, currentDeviceId });

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
   */
  private async reconcileCloudDeletions(params: {
    deviceId: string;
    year: number;
    month: number;
    foundIds: Set<string>;
    currentDeviceId: string | undefined;
  }): Promise<void> {
    const { deviceId, year, month, foundIds, currentDeviceId } = params;
    const monthLabel = `${year}/${String(month).padStart(2, '0')}`;
    logger.info(
      `[CloudBrowser] reconcileCloudDeletions — device=${deviceId} ${monthLabel}, foundIds=${[...foundIds].length}, currentDeviceId=${currentDeviceId ?? 'none'}`,
    );
    const isCurrentDevice = !!currentDeviceId && deviceId === currentDeviceId;

    const knownIds = await this.getKnownRemoteIds({ deviceId, year, month, isCurrentDevice });

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
   * @returns The set of known remote file ids.
   */
  private async getKnownRemoteIds(params: {
    deviceId: string;
    year: number;
    month: number;
    isCurrentDevice: boolean;
  }): Promise<Set<string>> {
    const { deviceId, year, month, isCurrentDevice } = params;
    const knownFromCloud = await this.localDB.getCloudAssetRemoteIdsByDeviceAndMonth(deviceId, year, month);
    logger.info(
      `[CloudBrowser] reconcileCloudDeletions — knownFromCloud=${knownFromCloud.size} in local DB for device=${deviceId} ${year}/${String(month).padStart(2, '0')}`,
    );
    const knownIds = new Set(knownFromCloud);

    if (isCurrentDevice) {
      const knownFromSync = await this.localDB.getSyncedRemoteIdsByCreationMonth(year, month);
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
  }): Promise<void> {
    const { devices, discoveredMonths, currentDeviceId } = params;
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
        const syncedMonths = await this.localDB.getSyncedMonths();
        const isRecreatedDeviceFolder = cloudMonths.length === 0 && syncedMonths.length > 0;
        if (isRecreatedDeviceFolder) {
          logger.info(
            `[CloudBrowser] Device "${deviceId}" has no cloud history but local DB has synced months — resetting to pending for re-upload`,
          );
          await this.localDB.resetSyncedToPending();
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
          await this.reconcileCloudDeletions({ deviceId, year, month, foundIds: new Set(), currentDeviceId });
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
      const thumb = file.thumbnails?.[0] ?? null;

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
