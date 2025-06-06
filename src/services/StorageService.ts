import { FileMeta, FolderMeta, SearchResultData } from '@internxt/sdk/dist/drive/storage/types';
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

  public async searchItems(search: string, offset: number): Promise<SearchResultData> {
    const [searchData] = await this.sdk.storageV2.getGlobalSearchItems(search, undefined, offset);
    return searchData;
  }

  public async getFileMetadata(fileUuid: string): Promise<FileMeta> {
    const [fileMetaPromise] = this.sdk.storageV2.getFile(fileUuid);
    return fileMetaPromise;
  }

  public async getFolderMetadata(folderUuid: string): Promise<FolderMeta> {
    return this.sdk.storageV2.getFolderMeta(folderUuid);
  }

  public async getFolderAncestors(folderUuid: string) {
    return this.sdk.storageV2.getFolderAncestors(folderUuid);
  }
}

const storageService = new StorageService(SdkManager.getInstance());
export default storageService;
