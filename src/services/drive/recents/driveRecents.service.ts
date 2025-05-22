import { SdkManager } from '@internxt-mobile/services/common';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

class DriveRecentsService {
  private sdk: SdkManager;
  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public async getRecents(limit = 25): Promise<DriveFileData[]> {
    return this.sdk.storageV2.getRecentFilesV2(limit);
  }
}

export const driveRecentsService = new DriveRecentsService(SdkManager.getInstance());
