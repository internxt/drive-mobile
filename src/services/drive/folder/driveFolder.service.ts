import { MoveFolderUuidPayload } from '@internxt/sdk/dist/drive/storage/types';

import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { SdkManager } from '@internxt-mobile/services/common';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import { getHeaders } from '../../../helpers/headers';
import { GetModifiedFolders } from '../../../types/drive';
import { constants } from '../../AppService';

class DriveFolderService {
  private sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public async getFolderFiles(folderId: string, offset: number, limit: number) {
    const [promise] = this.sdk.storageV2.getFolderFilesByUuid(folderId, offset, limit, 'plainName', 'ASC');

    return promise;
  }

  public async getFolderFolders(folderId: string, offset: number, limit: number) {
    const [promise] = this.sdk.storageV2.getFolderFoldersByUuid(folderId, offset, limit, 'plainName', 'ASC');

    return promise;
  }

  public async createFolder(parentFolderId: string, folderName: string) {
    const sdkResult = this.sdk.storageV2.createFolderByUuid({
      parentFolderUuid: parentFolderId,
      plainName: folderName,
    });
    return sdkResult ? sdkResult[0] : Promise.reject('createFolder Sdk method did not return a valid result');
  }

  public async moveFolder(payload: MoveFolderUuidPayload) {
    return this.sdk.storageV2.moveFolderByUuid(payload);
  }

  public async updateMetaData(folderUuid: string, newName: string): Promise<void> {
    await this.sdk.storageV2.updateFolderNameWithUUID({
      folderUuid,
      name: newName,
    });
  }

  public getFolderContentByUuid(folderUuid: string) {
    const [contentPromise] = this.sdk.storageV2.getFolderContentByUuid({ folderUuid });
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
