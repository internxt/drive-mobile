import prettysize from 'prettysize';
import { SdkManager } from './common';

export const FREE_STORAGE = 1073741824; // 1GB

class StorageService {
  private readonly sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public toString(bytes: number) {
    return prettysize(bytes, true);
  }

  public async loadLimit(): Promise<number> {
    const limit = await this.sdk.storageV2.spaceLimitV2();
    return limit.maxSpaceBytes;
  }
}

const storageService = new StorageService(SdkManager.getInstance());
export default storageService;
