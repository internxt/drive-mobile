import asyncStorageService from 'src/services/AsyncStorageService';
import { logger } from 'src/services/common';
import { createFolderWithMerge } from 'src/services/drive/folder/folderOrchestration.service';

const PHOTOS_BACKUP_ROOT_NAME = 'Photos Backup';

class PhotoBackupFolderService {
  private photosRootUuid: string | null = null;
  private readonly deviceFolderUuid = new Map<string, string>();
  private readonly yearFolderUuid = new Map<string, string>();
  private readonly monthFolderUuid = new Map<string, string>();
  private readonly dayFolderUuid = new Map<string, string>();

  async getOrCreateFolderForDate(deviceId: string, date: Date): Promise<string> {
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const dayKey = `${deviceId}/${year}/${month}/${day}`;
    const localDayFolderUuid = this.dayFolderUuid.get(dayKey);
    if (localDayFolderUuid) return localDayFolderUuid;

    const photosRootUuid = await this.getOrCreatePhotosRoot();
    const deviceUuid = await this.getOrCreateDeviceFolder(deviceId, photosRootUuid);
    const yearUuid = await this.getOrCreateYearFolder(deviceId, year, deviceUuid);
    const monthUuid = await this.getOrCreateMonthFolder(deviceId, year, month, yearUuid);

    logger.info(`[PhotoBackupFolders] Creating day folder ${dayKey}`);
    const dayUuid = await createFolderWithMerge(monthUuid, day);
    this.dayFolderUuid.set(dayKey, dayUuid);
    return dayUuid;
  }

  clearCache(): void {
    this.photosRootUuid = null;
    this.deviceFolderUuid.clear();
    this.yearFolderUuid.clear();
    this.monthFolderUuid.clear();
    this.dayFolderUuid.clear();
  }

  private async getOrCreatePhotosRoot(): Promise<string> {
    if (this.photosRootUuid) return this.photosRootUuid;

    const user = await asyncStorageService.getUser();
    this.photosRootUuid = await createFolderWithMerge(user.rootFolderId, PHOTOS_BACKUP_ROOT_NAME);
    return this.photosRootUuid;
  }

  private async getOrCreateFolder(
    cache: Map<string, string>,
    key: string,
    parentUuid: string,
    name: string,
  ): Promise<string> {
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
    const uuid = await createFolderWithMerge(parentUuid, name);
    cache.set(key, uuid);
    return uuid;
  }

  private getOrCreateDeviceFolder(deviceId: string, photosRootUuid: string): Promise<string> {
    return this.getOrCreateFolder(this.deviceFolderUuid, deviceId, photosRootUuid, deviceId);
  }

  private getOrCreateYearFolder(deviceId: string, year: string, deviceUuid: string): Promise<string> {
    return this.getOrCreateFolder(this.yearFolderUuid, `${deviceId}/${year}`, deviceUuid, year);
  }

  private getOrCreateMonthFolder(deviceId: string, year: string, month: string, yearUuid: string): Promise<string> {
    return this.getOrCreateFolder(this.monthFolderUuid, `${deviceId}/${year}/${month}`, yearUuid, month);
  }
}

export const photoBackupFolders = new PhotoBackupFolderService();
