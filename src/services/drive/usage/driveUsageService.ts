import { SdkManager } from '@internxt-mobile/services/common';

class DriveUsageService {
  private readonly sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public async getUsage(): Promise<number> {
    const usage = await this.sdk.storageV2.spaceUsageV2();
    return usage.total;
  }
}

export const driveUsageService = new DriveUsageService(SdkManager.getInstance());
