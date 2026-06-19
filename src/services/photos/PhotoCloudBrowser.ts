import { DriveFileData } from '@internxt-mobile/types/drive/file';
import { FetchPaginatedFolder } from '@internxt/sdk/dist/drive/storage/types';
import { logger } from 'src/services/common';
import { driveFolderService } from 'src/services/drive/folder/driveFolder.service';
import { photosLocalDB } from './database/photosLocalDB';
import { photosDeviceService } from './photosDeviceService';

const HOUR_MS = 60 * 60 * 1000;
const CACHE_TTL_MS = 24 * HOUR_MS;
const PAGE_SIZE = 50;
const MIN_MONTH_NUMBER = 1;
const MAX_MONTH_NUMBER = 12;

const fetchAllPages = async <T>(fetcher: (offset: number) => Promise<T[]>): Promise<T[]> => {
  const all: T[] = [];
  let offset = 0;
  let batch: T[];
  do {
    batch = await fetcher(offset);
    all.push(...batch);
    offset += PAGE_SIZE;
  } while (batch.length === PAGE_SIZE);
  return all;
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
    });
  }

  async syncAllHistory(options: {
    onMonthFetched?: () => void;
    isCancelled?: () => boolean;
    force?: boolean;
    currentDeviceId?: string;
  }): Promise<void> {
    const { onMonthFetched, isCancelled, force, currentDeviceId } = options;
    logger.info(
      `[CloudBrowser] syncAllHistory — currentDeviceId=${currentDeviceId ?? 'none'}, force=${force ?? false}`,
    );
    const devices = await this.listDeviceFolders();
    if (devices.length === 0) {
      logger.info('[CloudBrowser] No device folders found — skipping sync');
      return;
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
    currentDeviceId?: string;
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
      for (const file of files) {
        if (file.status && file.status.toLowerCase() !== 'exists') continue;
        const baseName = file.plainName ?? file.name;
        const fileName = file.type ? `${baseName}.${file.type}` : baseName;
        const createdAt = folderDate;
        const thumb = file.thumbnails?.[0] ?? null;

        await this.localDB.upsertCloudAsset({
          remoteFileId: file.uuid,
          deviceId,
          createdAt,
          fileName,
          fileSize: file.size ? Number(file.size) : null,
          fileId: file.fileId ?? null,
          thumbnailPath: null,
          thumbnailBucketId: thumb?.bucket_id ?? null,
          thumbnailBucketFile: thumb?.bucket_file ?? null,
          thumbnailType: thumb?.type ?? null,
          discoveredAt: now,
          plainName: file.plainName ?? null,
          extension: file.type ?? null,
          bucket: file.bucket ?? null,
          folderUuid: file.folderUuid ?? null,
          creationTimeApi: file.creationTime ? new Date(file.creationTime).getTime() : null,
          modificationTime: file.modificationTime ? new Date(file.modificationTime).getTime() : null,
          updatedAt: file.updatedAt ? new Date(file.updatedAt).getTime() : null,
          status: file.status ?? null,
          encryptVersion: file.encrypt_version ?? null,
        });
        foundIds.add(file.uuid);
        count++;
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

  private async reconcileCloudDeletions(params: {
    deviceId: string;
    year: number;
    month: number;
    foundIds: Set<string>;
    currentDeviceId?: string;
  }): Promise<void> {
    const { deviceId, year, month, foundIds, currentDeviceId } = params;
    logger.info(
      `[CloudBrowser] reconcileCloudDeletions — device=${deviceId} ${year}/${String(month).padStart(2, '0')}, foundIds=${[...foundIds].length}, currentDeviceId=${currentDeviceId ?? 'none'}`,
    );
    const knownFromCloud = await this.localDB.getCloudAssetRemoteIdsByDeviceAndMonth(deviceId, year, month);
    logger.info(
      `[CloudBrowser] reconcileCloudDeletions — knownFromCloud=${knownFromCloud.size} in local DB for device=${deviceId} ${year}/${String(month).padStart(2, '0')}`,
    );
    const knownIds = new Set(knownFromCloud);

    if (currentDeviceId && deviceId === currentDeviceId) {
      const knownFromSync = await this.localDB.getSyncedRemoteIdsByCreationMonth(year, month);
      for (const id of knownFromSync) knownIds.add(id);
    }

    let removedCount = 0;
    for (const knownId of knownIds) {
      if (!foundIds.has(knownId)) {
        await this.localDB.markCloudDeleted(knownId);
        await this.localDB.deleteCloudAsset(knownId);
        removedCount++;
      }
    }
    if (removedCount > 0) {
      logger.info(
        `[CloudBrowser] Device "${deviceId}" ${year}/${String(month).padStart(2, '0')} — ${removedCount} file(s) cloud_deleted`,
      );
    }
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
    currentDeviceId?: string;
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
    const content = await this.folderService.getFolderContentByUuid(folderUuid);
    return content.files;
  }
}

export const photoCloudBrowser = new PhotoCloudBrowserService(driveFolderService, photosLocalDB);
