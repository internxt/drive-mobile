import Axios from 'axios';

import { SdkManager } from '@internxt-mobile/services/common';
import appService from '@internxt-mobile/services/AppService';

class DriveUsageService {
  private readonly sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  /**
   * NO SDK - Should be replaced by the SDK corresponding method
   * @returns
   */
  public async getUsage(): Promise<number> {
    const response = await Axios.get<{ total: number }>(
      `${appService.constants.REACT_NATIVE_DRIVE_API_URL}/api/usage`,
      {
        headers: {
          Authorization: `Bearer ${this.sdk.getApiSecurity().token}`,
        },
      },
    );

    return response.data.total;
  }
}

export const driveUsageService = new DriveUsageService(SdkManager.getInstance());
