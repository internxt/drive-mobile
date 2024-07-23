import { DriveFileData, MoveFolderPayload } from '@internxt/sdk/dist/drive/storage/types';

import { getHeaders } from '../../../helpers/headers';
import {
  DriveFolderMetadataPayload,
  DriveItemStatus,
  DriveListItem,
  FetchFolderContentResponseWithThumbnails,
  GetModifiedFolders,
} from '../../../types/drive';
import { constants } from '../../AppService';
import { SdkManager } from '@internxt-mobile/services/common';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { AsyncStorageKey } from '@internxt-mobile/types/index';

class DriveFolderService {
  private sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public async getFolderFiles(folderId: number, offset: number, limit: number) {
    const [promise] = this.sdk.storageV2.getFolderFiles(folderId, offset, limit, 'plainName', 'ASC');

    return promise;
  }

  public async getFolderFolders(folderId: number, offset: number, limit: number) {
    const [promise] = this.sdk.storageV2.getFolderFolders(folderId, offset, limit, 'plainName', 'ASC');

    return promise;
  }

  public async createFolder(parentFolderId: number, folderName: string) {
    const sdkResult = this.sdk.storage.createFolder({
      parentFolderId,
      folderName,
    });
    return sdkResult ? sdkResult[0] : Promise.reject('createFolder Sdk method did not return a valid result');
  }

  public async moveFolder(payload: MoveFolderPayload) {
    return this.sdk.storage.moveFolder(payload);
  }

  public async updateMetaData(folderId: number, metadata: DriveFolderMetadataPayload): Promise<void> {
    await this.sdk.storage.updateFolder({
      folderId,
      changes: {
        itemName: metadata.itemName,
      },
    });
  }

  /**
   * Gets the folder content by folderID
   *
   * @param {number} folderId The folder ID which content you want to retrieve
   * @returns The content and a request canceler
   */
  public getFolderContent(folderId: number) {
    const [contentPromise] = this.sdk.storage.getFolderContent(folderId);
    return contentPromise;
  }

  public async getModifiedFolders({
    limit = 50,
    offset = 0,
    updatedAt,
    status,
  }: {
    limit?: number;
    offset?: number;
    updatedAt: string;
    status: 'ALL' | 'TRASHED' | 'REMOVED';
  }): Promise<GetModifiedFolders[] | undefined> {
    const updatedAtDate = updatedAt && `&updatedAt=${updatedAt}`;
    const query = `status=${status}&offset=${offset}&limit=${limit}${updatedAtDate}`;
    const newToken = await asyncStorageService.getItem(AsyncStorageKey.PhotosToken);

    if (!newToken) return;

    const headers = await getHeaders(newToken);

    const modifiedItems = await fetch(`${constants.DRIVE_NEW_API_URL}/folders?${query}`, {
      method: 'GET',
      headers,
    });

    const parsedModifiedFolders = await modifiedItems.json();

    return parsedModifiedFolders;
  }
}

export const driveFolderService = new DriveFolderService(SdkManager.getInstance());
