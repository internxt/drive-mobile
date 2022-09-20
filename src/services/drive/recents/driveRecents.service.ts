import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from '@internxt-mobile/services/common';

class DriveRecentsService {
  private sdk: SdkManager;
  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public async getRecents(limit = 25): Promise<DriveFileData[]> {
    return this.sdk.storage.getRecentFiles(limit);
  }
}

export const driveRecentsService = new DriveRecentsService(SdkManager.getInstance());
