import analytics, { DriveAnalyticsEvent } from '@internxt-mobile/services/AnalyticsService';
import drive from '@internxt-mobile/services/drive';
import { driveEvents } from '@internxt-mobile/services/drive/events';
import { FetchDriveTrashItemsResponse } from '@internxt-mobile/services/drive/trash';
import errorService from '@internxt-mobile/services/ErrorService';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import { DriveItemStatus, DriveListItem } from '@internxt-mobile/types/drive/item';
import { DriveEventKey } from '@internxt-mobile/types/drive/events';
import { NotificationType, UseCaseResult } from '@internxt-mobile/types/index';
import strings from 'assets/lang/strings';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import { checkIsFolder } from '../../helpers';

export const MAX_ITEMS_PER_TRASH_REQUEST = 50;
const MAX_CONCURRENT_RESTORES = 5;

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
      const isFolder = checkIsFolder(trashItem);

      return {
        status: DriveItemStatus.Idle,
        data: {
          ...trashItem,
          name: trashItem.plainName,
          updatedAt: new Date(trashItem.updatedAt).toISOString(),
          createdAt: new Date(trashItem.createdAt).toISOString(),
          isFolder,
          currentThumbnail: null,
          type: isFolder ? undefined : trashItem.type,
          thumbnails: [],
        },
        id: trashItem.uuid,
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
  items: { fileId?: string; folderId?: string; destinationFolderId: string }[],
  config?: { displayNotification: boolean },
): Promise<UseCaseResult<{ restoredCount: number }>> => {
  let restoredCount = 0;
  try {
    const restoreLimit = pLimit(MAX_CONCURRENT_RESTORES);
    const operations = items.map((item) =>
      restoreLimit(async () => {
        if (item.fileId) {
          await drive.trash.restoreFile({ fileUuid: item.fileId, destinationFolderUuid: item.destinationFolderId });
        }

        if (item.folderId) {
          await drive.trash.restoreFolder({
            folderUuid: item.folderId,
            destinationFolderUuid: item.destinationFolderId,
          });
        }
      }),
    );

    const results = await Promise.allSettled(operations);
    restoredCount = results.filter((result) => result.status === 'fulfilled').length;
    const failedResult = results.find((result) => result.status === 'rejected');
    if (failedResult?.status === 'rejected') {
      throw failedResult.reason;
    }

    const isPlural = items.length > 1;
    if (config?.displayNotification !== false) {
      notifications.success(isPlural ? strings.messages.itemsRestored : strings.messages.itemRestored);
    }

    driveEvents.emit({
      event: DriveEventKey.DriveItemRestored,
    });

    return {
      success: true,
      data: { restoredCount },
    };
  } catch (error) {
    errorService.reportError(error);
    notifications.error(strings.errors.generic.title);
    return {
      success: false,
      error: error as Error,
      data: { restoredCount },
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
          uuid: item.data.uuid,
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
        parent_folder_uuid: item.data.isFolder ? item.data.parentUuid : item.data.folderUuid,
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
  items: { type: 'file' | 'folder'; uuid: string }[],
  onUndo: () => void,
): Promise<UseCaseResult<{ trashedUuids: string[] }>> => {
  const trashedUuids: string[] = [];
  try {
    await chunk(items, MAX_ITEMS_PER_TRASH_REQUEST).reduce(
      (previousBatches, batch) =>
        previousBatches.then(async () => {
          await drive.trash.moveToTrash(batch);
          trashedUuids.push(...batch.map((item) => item.uuid));
        }),
      Promise.resolve(),
    );

    const isPlural = items.length > 1;
    notifications.show({
      text1: isPlural
        ? strings.formatString(strings.messages.itemsMovedToTrash, items.length).toString()
        : strings.messages.itemMovedToTrash,
      type: NotificationType.Success,
      action: {
        text: strings.buttons.undo,
        onActionPress: onUndo,
      },
    });
    // Remove the items from the db
    await Promise.all(
      items.map((item) => {
        drive.database.deleteItem({ uuid: item.uuid }).catch((error) => errorService.reportError(error));
      }),
    );

    setTimeout(() => {
      driveEvents.emit({
        event: DriveEventKey.DriveItemTrashed,
      });
    }, 1500);

    return {
      success: true,
      data: { trashedUuids },
    };
  } catch (error) {
    errorService.reportError(error);
    notifications.error(strings.errors.generic.title);
    return {
      success: false,
      error: error as Error,
      data: { trashedUuids },
    };
  }
};
