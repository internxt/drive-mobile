import axios from 'axios';
import {
  DriveFileData,
  DriveFolderData,
  FetchFolderContentResponse,
  MoveFolderPayload,
} from '@internxt/sdk/dist/drive/storage/types';

import { getHeaders } from '../../../helpers/headers';
import {
  DriveFolderMetadataPayload,
  DriveItemStatus,
  DriveListItem,
  FetchFolderContentResponseWithThumbnails,
} from '../../../types/drive';
import { constants } from '../../AppService';
import { driveFileService } from '../file';
import { SdkManager } from '@internxt-mobile/services/common';

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
    const filesAsDriveListItems = folderContent.files.map<DriveListItem>((child) => {
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
        },
      };
    });

    const childsAsDriveListItems = folderContent.children.map<DriveListItem>((child) => {
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
        },
      };
    });

    return childsAsDriveListItems.concat(filesAsDriveListItems);
  }
}

export const driveFolderService = new DriveFolderService(SdkManager.getInstance());
