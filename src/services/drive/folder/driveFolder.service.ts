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
import errorService from '@internxt-mobile/services/ErrorService';

class DriveFolderService {
  private sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
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

  public folderContentToDriveListItems(folderContent: FetchFolderContentResponseWithThumbnails): DriveListItem[] {
    const filesAsDriveListItems = folderContent.files
      .filter((file) => file.status === 'EXISTS')
      .map<DriveListItem>((child) => {
        return {
          id: child.id.toString(),
          status: DriveItemStatus.Idle,
          data: {
            isFolder: false,
            folderId: folderContent.parentId,
            thumbnails: (child as DriveFileData).thumbnails || [],
            currentThumbnail: null,
            createdAt: child.createdAt,
            updatedAt: child.updatedAt,
            name: child.name,
            id: child.id,
            parentId: child.folderId,
            size: child.size,
            type: child.type,
            fileId: child.fileId,
            thumbnail: child.thumbnail,
            uuid: child.uuid,
          },
        };
      });

    const childsAsDriveListItems = folderContent.children
      .filter((folder) => !(folder.deleted && folder.removed))
      .map<DriveListItem>((child) => {
        return {
          id: child.id.toString(),
          status: DriveItemStatus.Idle,
          data: {
            thumbnails: [],
            currentThumbnail: null,
            createdAt: child.createdAt,
            updatedAt: child.updatedAt,
            name: child.name,
            id: child.id,
            isFolder: true,
            parentId: child.parentId,
            folderId: child.id,
            size: undefined,
            type: undefined,
            fileId: undefined,
            uuid: child.uuid,
          },
        };
      });

    return childsAsDriveListItems.concat(filesAsDriveListItems);
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
    const query = `status=${status}&offset=${offset}&limit=${limit}${updatedAt && `&updatedAt=${updatedAt}`}`;
    const newToken = await asyncStorageService.getItem(AsyncStorageKey.PhotosToken);

    if (!newToken) return;

    const headers = await getHeaders(newToken);

    try {
      const modifiedItems = await fetch(`${constants.DRIVE_NEW_API_URL}/folders?${query}`, {
        method: 'GET',
        headers,
      });

      const parsedModifiedFolders = await modifiedItems.json();

      return parsedModifiedFolders;
    } catch (error) {
      errorService.reportError(error);
    }
  }
}

export const driveFolderService = new DriveFolderService(SdkManager.getInstance());
