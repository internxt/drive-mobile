import { AddItemsToTrashPayload, FetchFolderContentResponse } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from '@internxt-mobile/services/common';
import { DeleteItemsPermanentlyPayload } from '@internxt/sdk/dist/drive/trash/types';
import { driveFolderService } from '../folder';
import { driveFileService } from '../file';

class DriveTrashService {
  private sdk: SdkManager;
  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public async getTrashItems(): Promise<FetchFolderContentResponse> {
    return this.sdk.trash.getTrash();
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

  public async restoreFolder({ destinationFolderId, folderId }: { folderId: number; destinationFolderId: number }) {
    return driveFolderService.moveFolder({
      folderId,
      destinationFolderId: destinationFolderId,
    });
  }

  public async restoreFile({ destinationFolderId, fileId }: { fileId: string; destinationFolderId: number }) {
    return driveFileService.moveFile({
      fileId,
      destination: destinationFolderId,
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
