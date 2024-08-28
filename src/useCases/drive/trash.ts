import analytics, { DriveAnalyticsEvent } from '@internxt-mobile/services/AnalyticsService';
import drive from '@internxt-mobile/services/drive';
import { driveEvents } from '@internxt-mobile/services/drive/events';
import { FetchDriveTrashItemsResponse } from '@internxt-mobile/services/drive/trash';
import errorService from '@internxt-mobile/services/ErrorService';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import { DriveEventKey, DriveItemStatus, DriveListItem } from '@internxt-mobile/types/drive';
import { NotificationType, UseCaseResult } from '@internxt-mobile/types/index';
import strings from 'assets/lang/strings';

type GetDriveTrashItemsOptions = {
  page: number;
  shouldGetFolders: boolean;
  shouldGetFiles: boolean;
};
/**
 * Gets all the trash items available
 *
 * @returns A list of DriveItems
 */
export const getDriveTrashItems = async ({
  page,
  shouldGetFolders,
  shouldGetFiles,
}: GetDriveTrashItemsOptions): Promise<
  UseCaseResult<{ items: DriveListItem[]; hasMoreFiles: boolean; hasMoreFolders: boolean }>
> => {
  try {
    const [trashFolders, trashFiles] = await Promise.all([
      shouldGetFolders
        ? drive.trash.getTrashFolders({ page })
        : Promise.resolve<FetchDriveTrashItemsResponse>({ items: [], hasMore: false }),
      shouldGetFiles
        ? drive.trash.getTrashFiles({ page })
        : Promise.resolve<FetchDriveTrashItemsResponse>({ items: [], hasMore: false }),
    ]);

    const trashItems = trashFolders.items.concat(trashFiles.items).map<DriveListItem>((trashItem) => {
      const isFolder = !trashItem.fileId ? true : false;

      return {
        status: DriveItemStatus.Idle,
        data: {
          ...trashItem,
          id: trashItem.id,
          folderId: trashItem.folderId,
          name: trashItem.plainName ?? trashItem.name,
          updatedAt: new Date(trashItem.updatedAt).toISOString(),
          createdAt: new Date(trashItem.createdAt).toISOString(),
          isFolder,
          currentThumbnail: null,
          type: isFolder ? undefined : trashItem.type,
          thumbnails: [],
        },
        id: trashItem.id.toString(),
      };
    });

    return {
      success: true,
      data: {
        items: trashItems,
        hasMoreFolders: trashFolders.hasMore,
        hasMoreFiles: trashFiles.hasMore,
      },
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
    const operations = items.map(async (item) => {
      if (item.fileId) {
        await drive.trash.restoreFile({ fileId: item.fileId, destinationFolderId: item.destinationFolderId });
      }

      if (item.folderId) {
        await drive.trash.restoreFolder({ folderId: item.folderId, destinationFolderId: item.destinationFolderId });
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
    items.map((item) => {
      analytics.track(DriveAnalyticsEvent.FileDeleted, {
        size: item.data.size,
        type: item.data.type,
        file_id: item.data.fileId,
        parent_folder_id: item.data.parentId,
      });
    });
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
  items: { id: string; type: 'file' | 'folder'; dbItemId: number }[],
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
        // Not sure why to delete the trash item we don't use the id, we use the fileId,
        // that doesn't match the database ID
        drive.database.deleteItem({ id: item.dbItemId }).catch((error) => errorService.reportError(error));
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
