import drive from '@internxt-mobile/services/drive';
import { driveEvents } from '@internxt-mobile/services/drive/events';
import errorService from '@internxt-mobile/services/ErrorService';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import { DriveEventKey, DriveListItem } from '@internxt-mobile/types/drive';
import { NotificationType, UseCaseResult } from '@internxt-mobile/types/index';
import strings from 'assets/lang/strings';

/**
 * Gets all the trash items available
 *
 * @returns A list of DriveItems
 */
export const getTrashItems = async (): Promise<UseCaseResult<DriveListItem[]>> => {
  try {
    const folderContentResponse = await drive.trash.getTrashItems();
    const trashItems = drive.folder.folderContentToDriveListItems(folderContentResponse);
    return {
      success: true,
      data: trashItems,
    };
  } catch (error) {
    errorService.reportError(error);

    return {
      success: false,
      error: error as Error,
    };
  }
};

/**
 * Restores a drive item currently in trash
 */
export const restoreDriveItems = async (
  items: { fileId?: string; folderId?: number; destinationFolderId: number }[],
  config?: { displayNotification: boolean },
): Promise<UseCaseResult<unknown>> => {
  try {
    const operations = items.map((item) => {
      if (item.fileId) {
        drive.trash
          .restoreFile({ fileId: item.fileId, destinationFolderId: item.destinationFolderId })
          .catch((err) => errorService.reportError(err));
      }

      if (item.folderId) {
        drive.trash
          .restoreFolder({ folderId: item.folderId, destinationFolderId: item.destinationFolderId })
          .catch((err) => errorService.reportError(err));
      }
    });

    await Promise.all(operations);

    const isPlural = items.length > 1;
    if (config?.displayNotification !== false) {
      notifications.success(isPlural ? strings.messages.itemsRestored : strings.messages.itemRestored);
    }

    driveEvents.emit({
      event: DriveEventKey.DriveItemRestored,
    });

    return {
      success: true,
      data: {},
    };
  } catch (error) {
    errorService.reportError(error);
    notifications.error(strings.errors.generic.title);
    return {
      success: false,
      error: error as Error,
    };
  }
};

/**
 * Deletes permanently a drive item cureently in trash
 */
export const deleteDriveItemsPermanently = async (items: DriveListItem[]): Promise<UseCaseResult<null>> => {
  try {
    await drive.trash.deleteItemsPermanently(
      items.map((item) => {
        return {
          type: item.data.type ? 'file' : 'folder',
          id: item.id,
        };
      }),
    );

    const isPlural = items.length > 1;
    notifications.success(isPlural ? strings.messages.itemsDeleted : strings.messages.itemDeleted);
    return {
      success: true,
      data: null,
    };
  } catch (error) {
    errorService.reportError(error);
    notifications.error(strings.errors.generic.title);
    return {
      success: false,
      error: error as Error,
    };
  }
};

/**
 * Clears the trash
 */
export const clearTrash = async (): Promise<UseCaseResult<null>> => {
  try {
    await drive.trash.clearTrash();
    notifications.success(strings.messages.trashEmpty);

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    errorService.reportError(error);
    notifications.error(strings.errors.generic.title);
    return {
      success: false,
      error: error as Error,
    };
  }
};

/**
 * Moves items to trash
 */
export const moveItemsToTrash = async (
  items: { id: string; type: 'file' | 'folder' }[],
  onUndo: () => void,
): Promise<UseCaseResult<null>> => {
  try {
    await drive.trash.moveToTrash(items);

    const isPlural = items.length > 1;
    notifications.show({
      text1: isPlural ? strings.messages.itemsMovedToTrash : strings.messages.itemMovedToTrash,
      type: NotificationType.Success,
      action: {
        text: strings.buttons.undo,
        onActionPress: onUndo,
      },
    });

    // Remove the items from the db
    await Promise.all(
      items.map((item) => {
        drive.database
          .deleteItem({ id: parseInt(item.id), isFolder: item.type === 'folder' })
          .catch((error) => errorService.reportError(error));
      }),
    );

    setTimeout(() => {
      driveEvents.emit({
        event: DriveEventKey.DriveItemTrashed,
      });
    }, 1500);

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    errorService.reportError(error);
    notifications.error(strings.errors.generic.title);
    return {
      success: false,
      error: error as Error,
    };
  }
};
