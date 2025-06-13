import { SdkManager } from '@internxt-mobile/services/common';
import { AddItemsToTrashPayload, FetchTrashContentResponse } from '@internxt/sdk/dist/drive/storage/types';
import { DeleteItemsPermanentlyPayload } from '@internxt/sdk/dist/drive/trash/types';
import { driveFileService } from '../file';
import { driveFolderService } from '../folder';

export type TrashItem = FetchTrashContentResponse['result'][number];

export type FetchDriveTrashItemsResponse = {
  hasMore: boolean;
  items: TrashItem[];
};
// Limit the amount of trash items to fetch
const TRASH_ITEMS_LIMIT = 50;
class DriveTrashService {
  private sdk: SdkManager;
  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public async getTrashFiles({ page }: { page: number }): Promise<FetchDriveTrashItemsResponse> {
    const { result } = await this.sdk.trash.getTrashedFilesPaginated(
      TRASH_ITEMS_LIMIT,
      TRASH_ITEMS_LIMIT * (page - 1),
      'files',
      true,
    );

    return {
      items: result.map((file) => ({
        ...file,
        // Use the plainName as file name
        name: file.plainName,
      })),
      hasMore: TRASH_ITEMS_LIMIT === result.length,
    };
  }

  public async getTrashFolders({ page }: { page: number }): Promise<FetchDriveTrashItemsResponse> {
    const { result } = await this.sdk.trash.getTrashedFilesPaginated(
      TRASH_ITEMS_LIMIT,
      TRASH_ITEMS_LIMIT * (page - 1),
      'folders',
      true,
    );

    return {
      items: result,
      hasMore: TRASH_ITEMS_LIMIT === result.length,
    };
  }

  public async deleteItemsPermanently(items: { id: number | string; type: 'folder' | 'file' }[]) {
    const itemsToDelete = items.map((item) => {
      return {
        id: item.id,
        type: item.type,
      };
    });
    return this.sdk.trash.deleteItemsPermanently({ items: itemsToDelete } as DeleteItemsPermanentlyPayload);
  }

  public async restoreFolder({
    destinationFolderUuid,
    folderUuid,
  }: {
    folderUuid: string;
    destinationFolderUuid: string;
  }) {
    return driveFolderService.moveFolder({
      folderUuid,
      destinationFolderUuid,
    });
  }

  public async restoreFile({ destinationFolderUuid, fileUuid }: { fileUuid: string; destinationFolderUuid: string }) {
    return driveFileService.moveFile({
      fileUuid,
      destinationFolderUuid,
    });
  }

  public async clearTrash() {
    return this.sdk.trash.clearTrash();
  }

  public async moveToTrash(items: { id: number | string; type: 'folder' | 'file' }[]) {
    const itemsToMove = items.map((item) => {
      return {
        id: item.id,
        type: item.type,
      };
    });
    return this.sdk.trash.addItemsToTrash({ items: itemsToMove } as AddItemsToTrashPayload);
  }
}

export const driveTrashService = new DriveTrashService(SdkManager.getInstance());
