import axios from 'axios';
import { REACT_NATIVE_DRIVE_API_URL } from '@env';

import { getHeaders } from '../helpers/headers';
import { DriveFileData, DriveFolderData, DriveFolderMetadataPayload } from '../types';
import fileService from './file';

class FolderService {
  public async updateMetaData(
    folderId: number,
    metadata: DriveFolderMetadataPayload,
    bucketId: string,
    relativePath: string,
  ): Promise<void> {
    const headers = await getHeaders();
    const headersMap: any = {};

    headers.forEach((value: string, key: string) => {
      headersMap[key] = value;
    });

    await axios.post(
      `${REACT_NATIVE_DRIVE_API_URL}/api/storage/folder/${folderId}/meta`,
      { metadata },
      { headers: headersMap },
    );

    // * Renames files on network recursively
    const pendingFolders = [{ relativePath, folderId }];

    while (pendingFolders.length > 0) {
      const currentFolder = pendingFolders[0];
      const folderContentResponse = await fileService.getFolderContent(currentFolder.folderId);
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

        fileService.renameFileInNetwork(file.fileId, bucketId, relativePath);
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

const folderService = new FolderService();
export default folderService;
