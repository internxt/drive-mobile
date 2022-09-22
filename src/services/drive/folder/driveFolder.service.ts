import axios from 'axios';
import { DriveFileData, DriveFolderData, MoveFolderPayload } from '@internxt/sdk/dist/drive/storage/types';

import { getHeaders } from '../../../helpers/headers';
import { DriveFolderMetadataPayload } from '../../../types/drive';
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

  public async updateMetaData(
    folderId: number,
    metadata: DriveFolderMetadataPayload,
    bucketId: string,
    relativePath: string,
  ): Promise<void> {
    const headers = await getHeaders();
    const headersMap: Record<string, string> = {};

    headers.forEach((value: string, key: string) => {
      headersMap[key] = value;
    });

    await axios.post(
      `${constants.DRIVE_API_URL}/storage/folder/${folderId}/meta`,
      { metadata },
      { headers: headersMap },
    );

    // * Renames files on network recursively
    const pendingFolders = [{ relativePath, folderId }];

    while (pendingFolders.length > 0) {
      const currentFolder = pendingFolders[0];
      const folderContentResponse = await driveFileService.getFolderContent(currentFolder.folderId);
      const folderContent: { folders: DriveFolderData[]; files: DriveFileData[] } = {
        folders: [],
        files: [],
      };

      if (folderContentResponse) {
        folderContent.folders = folderContentResponse.children.map((folder: any) => ({ ...folder, isFolder: true }));
        folderContent.files = folderContentResponse.files;
      }

      pendingFolders.shift();

      // * Renames current folder files
      for (const file of folderContent.files) {
        const fileFullName = `${file.name}${file.type ? '.' + file.type : ''}`;
        const relativePath = `${currentFolder.relativePath}/${fileFullName}`;

        driveFileService.renameFileInNetwork(file.fileId, bucketId, relativePath);
      }

      // * Adds current folder folders to pending
      pendingFolders.push(
        ...folderContent.folders.map((folderData) => ({
          relativePath: `${currentFolder.relativePath}/${folderData.name}`,
          folderId: folderData.id,
        })),
      );
    }
  }
}

export const driveFolderService = new DriveFolderService(SdkManager.getInstance());
