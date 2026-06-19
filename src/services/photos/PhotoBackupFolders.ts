import { logger } from 'src/services/common';
import { createFolderWithMerge } from 'src/services/drive/folder/folderOrchestration.service';

class PhotoBackupFolderService {
  private readonly yearFolderUuid = new Map<string, string>();
  private readonly monthFolderUuid = new Map<string, string>();
  private readonly dayFolderUuid = new Map<string, string>();

  /**
   * Returns the uuid of the day folder under the given device folder, creating
   * the year / month / day sub-folders if needed.
   *
   * @param deviceFolderUuid - uuid of the device folder returned by /photos/devices
   * @param date - date of the asset being backed up
   */
  async getOrCreateFolderForDate(deviceFolderUuid: string, date: Date): Promise<string> {
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const dayKey = `${deviceFolderUuid}/${year}/${month}/${day}`;
    const localDayFolderUuid = this.dayFolderUuid.get(dayKey);
    if (localDayFolderUuid) return localDayFolderUuid;

    const yearUuid = await this.getOrCreateYearFolder(deviceFolderUuid, year);
    const monthUuid = await this.getOrCreateMonthFolder(deviceFolderUuid, year, month, yearUuid);

    logger.info(`[PhotoBackupFolders] Creating day folder ${dayKey}`);
    const dayUuid = await createFolderWithMerge(monthUuid, day);
    this.dayFolderUuid.set(dayKey, dayUuid);
    return dayUuid;
  }

  clearCache(): void {
    this.yearFolderUuid.clear();
    this.monthFolderUuid.clear();
    this.dayFolderUuid.clear();
  }

  private async getOrCreateFolder(
    cache: Map<string, string>,
    key: string,
    parentUuid: string,
    name: string,
  ): Promise<string> {
    const cached = cache.get(key);
    if (cached) return cached;
    const uuid = await createFolderWithMerge(parentUuid, name);
    cache.set(key, uuid);
    return uuid;
  }

  private getOrCreateYearFolder(deviceFolderUuid: string, year: string): Promise<string> {
    return this.getOrCreateFolder(this.yearFolderUuid, `${deviceFolderUuid}/${year}`, deviceFolderUuid, year);
  }

  private getOrCreateMonthFolder(
    deviceFolderUuid: string,
    year: string,
    month: string,
    yearUuid: string,
  ): Promise<string> {
    return this.getOrCreateFolder(this.monthFolderUuid, `${deviceFolderUuid}/${year}/${month}`, yearUuid, month);
  }
}

export const photoBackupFolders = new PhotoBackupFolderService();
