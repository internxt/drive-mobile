import { SdkManager } from '@internxt-mobile/services/common';

export class PhotosUsageService {
  constructor(private sdk: SdkManager) {}
  public async getUsage(): Promise<number> {
    const { usage } = await this.sdk.photos.photos.getUsage();
    return usage;
  }

  // Get total count of photos
  public async getCount() {
    return this.sdk.photos.photos.getCount();
  }
}

export const photosUsage = new PhotosUsageService(SdkManager.getInstance());
