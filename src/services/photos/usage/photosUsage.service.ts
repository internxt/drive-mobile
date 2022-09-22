import { constants } from '@internxt-mobile/services/AppService';
import { SdkManager } from '@internxt-mobile/services/common';
import Axios from 'axios';

export class PhotosUsageService {
  constructor(private sdk: SdkManager) {}
  public async getUsage(): Promise<number> {
    const response = await Axios.get<{ usage: number }>(`${constants.PHOTOS_API_URL}/photos/usage`, {
      headers: {
        Authorization: `Bearer ${this.sdk.getApiSecurity().photosToken}`,
      },
    });

    return response.data.usage;
  }
}

export const photosUsage = new PhotosUsageService(SdkManager.getInstance());
