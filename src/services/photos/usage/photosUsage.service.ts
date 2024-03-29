import { SdkManager } from '@internxt-mobile/services/common';

export class PhotosUsageService {
  constructor(private sdk: SdkManager) {}
  public async getUsage(): Promise<number> {
    const { usage } = await this.sdk.photos.photos.getUsage();
    return usage;
  }

  /**
   * Gets the amount of photos in the cloud for the user
   * and the different status
   * @returns The total photos count, deleted, trashed and existent
   */
  public getCount() {
    return this.sdk.photos.photos.getCount();
  }
}

export const photosUsage = new PhotosUsageService(SdkManager.getInstance());
