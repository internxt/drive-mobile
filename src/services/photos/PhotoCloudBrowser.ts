import { DriveFileData } from '@internxt-mobile/types/drive/file';
import { FetchPaginatedFolder } from '@internxt/sdk/dist/drive/storage/types';
import { driveFolderService } from 'src/services/drive/folder/driveFolder.service';
import { photosLocalDB } from './database/photosLocalDB';
import { photoBackupFolders } from './PhotoBackupFolders';

const HOUR_MS = 60 * 60 * 1000;
const CACHE_TTL_MS = 24 * HOUR_MS;
const PAGE_SIZE = 50;

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
    private backupFolders: typeof photoBackupFolders,
    private folderService: typeof driveFolderService,
    private localDB: typeof photosLocalDB,
  ) {}

  async listDeviceFolders(): Promise<{ uuid: string; name: string }[]> {
    const rootUuid = await this.backupFolders.getRootFolderUuid();
    if (!rootUuid) return [];

    const folders = await fetchAllPages((offset) =>
      this.folderService.getFolderFolders(rootUuid, offset, PAGE_SIZE).then((r) => r.folders),
    );
    return folders.map((f) => ({ uuid: f.uuid, name: f.plainName ?? '' }));
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

  async syncAllHistory(options: { onMonthFetched?: () => void; isCancelled?: () => boolean }): Promise<void> {
    const { onMonthFetched, isCancelled } = options;
    const devices = await this.listDeviceFolders();
    if (devices.length === 0) return;

    const months = await this.discoverAvailableMonths(devices);
    if (months.length === 0) return;

    const CONCURRENCY = 3;
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < months.length) {
        if (isCancelled?.()) return;
        const target = months[cursor++];
        await this.fetchMonthFromFolder({
          deviceId: target.deviceId,
          monthFolderUuid: target.monthFolderUuid,
          year: target.year,
          month: target.month,
          onMonthFetched,
        });
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  }

  private async fetchMonthFromFolder(params: {
    deviceId: string;
    monthFolderUuid: string;
    year: number;
    month: number;
    onMonthFetched?: () => void;
  }): Promise<number> {
    const { deviceId, monthFolderUuid, year, month, onMonthFetched } = params;
    const cacheAge = await this.localDB.getCloudFetchCacheAge(deviceId, year, month);
    if (cacheAge !== null && Date.now() - cacheAge < CACHE_TTL_MS) return 0;

    const dayFolders = await this.listAllFolders(monthFolderUuid);
    const now = Date.now();
    let count = 0;

    for (const dayFolder of dayFolders) {
      const day = parseInt(dayFolder.plainName ?? '', 10);
      const folderDate = new Date(year, month - 1, isNaN(day) ? 1 : day).getTime();

      const files = await this.listFilesWithThumbnails(dayFolder.uuid);
      for (const file of files) {
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
          thumbnailPath: null,
          thumbnailBucketId: thumb?.bucket_id ?? null,
          thumbnailBucketFile: thumb?.bucket_file ?? null,
          thumbnailType: thumb?.type ?? null,
          discoveredAt: now,
        });
        count++;
      }
    }

    if (count > 0) {
      onMonthFetched?.();
    }
    return count;
  }

  private async discoverAvailableMonths(
    devices: { uuid: string; name: string }[],
  ): Promise<{ deviceId: string; year: number; month: number; monthFolderUuid: string }[]> {
    const result: { deviceId: string; year: number; month: number; monthFolderUuid: string }[] = [];
    for (const device of devices) {
      const yearFolders = await this.listAllFolders(device.uuid);
      for (const yearFolder of yearFolders) {
        const year = parseInt(yearFolder.plainName ?? '', 10);
        if (isNaN(year)) continue;

        const monthFolders = await this.listAllFolders(yearFolder.uuid);
        for (const monthFolder of monthFolders) {
          const month = parseInt(monthFolder.plainName ?? '', 10);
          if (isNaN(month) || month < 1 || month > 12) continue;
          result.push({ deviceId: device.name, year, month, monthFolderUuid: monthFolder.uuid });
        }
      }
    }
    result.sort((a, b) => b.year - a.year || b.month - a.month);
    return result;
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

export const photoCloudBrowser = new PhotoCloudBrowserService(photoBackupFolders, driveFolderService, photosLocalDB);
