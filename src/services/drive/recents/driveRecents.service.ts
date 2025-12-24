import { SdkManager } from '@internxt-mobile/services/common';
import { RecentFile } from '@internxt-mobile/types/drive/file';

class DriveRecentsService {
  private sdk: SdkManager;
  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public async getRecents(limit = 25): Promise<RecentFile[]> {
    const files = await this.sdk.storageV2.getRecentFilesV2(limit);
    return files.map((file) => ({
      ...file,
      plainName: file.plainName || file.plain_name || file.name,
      isFolder: false,
    }));
  }
}

export const driveRecentsService = new DriveRecentsService(SdkManager.getInstance());
