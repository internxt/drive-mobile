import { SdkManager } from '@internxt-mobile/services/common';

export class PhotosUsageService {
  constructor(private sdk: SdkManager) {}
  public async getUsage(): Promise<number> {
    const { usage } = await this.sdk.photos.photos.getUsage();
    return usage;
  }
}

export const photosUsage = new PhotosUsageService(SdkManager.getInstance());
