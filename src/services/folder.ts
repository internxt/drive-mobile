import axios from 'axios';
import { items } from '@internxt/lib';

import { DriveFolderMetadataPayload } from '../types';
import { fileService } from './file';

class FolderService {
  public async updateMetaData(
    folderId: number,
    metadata: DriveFolderMetadataPayload,
    bucketId: string,
    relativePath: string
  ): Promise<void> {
    await axios.post(`/api/storage/folder/${folderId}/meta`, { metadata })

    // * Renames files on network recursively
    const pendingFolders = [{ relativePath, folderId }];

    while (pendingFolders.length > 0) {
      const currentFolder = pendingFolders[0];
      const [folderContentPromise] = await fileService.getFolderContent(currentFolder.folderId);
      const { files, folders } = await folderContentPromise;

      pendingFolders.shift();

      // * Renames current folder files
      for (const file of files) {
        const relativePath = `${currentFolder.relativePath}/${items.getItemDisplayName(file)}`;

        fileService.renameFileInNetwork(file.fileId, bucketId, relativePath);
      }

      // * Adds current folder folders to pending
      pendingFolders.push(
        ...folders.map((folderData) => ({
          relativePath: `${currentFolder.relativePath}/${folderData.name}`,
          folderId: folderData.id
        }))
      );
    }
  }
}

export default new FolderService();