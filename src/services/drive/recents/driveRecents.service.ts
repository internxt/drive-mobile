import { SdkManager } from '@internxt-mobile/services/common';
import { DriveFileData, RecentFile } from '@internxt-mobile/types/drive/file';

class DriveRecentsService {
  private sdk: SdkManager;
  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public async getRecents(limit = 25): Promise<RecentFile[]> {
    const files = (await this.sdk.storageV2.getRecentFilesV2(limit)) as DriveFileData[];
    return files.map((file) => ({
      ...file,
      isFolder: false,
    }));
  }
}

export const driveRecentsService = new DriveRecentsService(SdkManager.getInstance());
