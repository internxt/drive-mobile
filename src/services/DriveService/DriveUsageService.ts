import Axios from 'axios';

import { constants } from '../AppService';
import { SdkManager } from '../common/SdkManager';

export default class DriveUsageService {
  private readonly sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  /**
   * NO SDK - Should be replaced by the SDK corresponding method
   * @returns
   */
  public async getUsage(): Promise<number> {
    const response = await Axios.get<{ total: number }>(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/usage`, {
      headers: {
        Authorization: `Bearer ${this.sdk.getApiSecurity().token}`,
      },
    });

    return response.data.total;
  }
}
