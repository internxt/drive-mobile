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
    private readonly backupFolders: typeof photoBackupFolders,
    private readonly folderService: typeof driveFolderService,
    private readonly localDB: typeof photosLocalDB,
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
  }): Promise<void> {
    const { deviceId, deviceFolderUuid, year, month, onMonthFetched } = params;
    const cacheAge = await this.localDB.getCloudFetchCacheAge(deviceId, year, month);
    if (cacheAge !== null && Date.now() - cacheAge < CACHE_TTL_MS) return;

    const yearFolder = await this.findChildFolder(deviceFolderUuid, String(year));
    if (!yearFolder) return;

    const monthStr = String(month).padStart(2, '0');
    const monthFolder = await this.findChildFolder(yearFolder.uuid, monthStr);
    if (!monthFolder) return;

    const dayFolders = await this.listAllFolders(monthFolder.uuid);
    const now = Date.now();

    for (const dayFolder of dayFolders) {
      const day = Number.parseInt(dayFolder.plainName ?? '', 10);
      const folderDate = new Date(year, month - 1, Number.isNaN(day) ? 1 : day).getTime();

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
      }
    }

    onMonthFetched?.();
  }

  async syncAllDevicesFromMonth(params: {
    devices: { uuid: string; name: string }[];
    fromYear: number;
    fromMonth: number;
    monthsBack?: number;
    onMonthFetched?: () => void;
  }): Promise<void> {
    const { devices, fromYear, fromMonth, monthsBack = 12, onMonthFetched } = params;
    for (let i = 0; i < monthsBack; i++) {
      let year = fromYear;
      let month = fromMonth - i;
      while (month <= 0) {
        month += 12;
        year -= 1;
      }
      for (const device of devices) {
        await this.fetchMonth({ deviceId: device.name, deviceFolderUuid: device.uuid, year, month, onMonthFetched });
      }
    }
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
