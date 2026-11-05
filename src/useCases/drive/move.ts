import drive from '@internxt-mobile/services/drive';
import { driveEvents } from '@internxt-mobile/services/drive/events';
import errorService from '@internxt-mobile/services/ErrorService';
import { notifyParentChanged } from '@internxt-mobile/services/native/InternxtSignalingModule';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import { DriveEventKey } from '@internxt-mobile/types/drive/events';
import { NotificationType } from '@internxt-mobile/types/index';
import strings from 'assets/lang/strings';
import pLimit from 'p-limit';

const MAX_CONCURRENT_MOVES = 5;

export interface MovableItem {
  uuid: string;
  name: string;
  type?: string;
  isFolder: boolean;
  newName?: string;
}

export interface MoveDriveItemsResult {
  movedUuids: string[];
  failedUuids: string[];
}

const moveDriveItem = async (item: MovableItem, destinationFolderUuid: string) => {
  await drive.database.deleteItem({ uuid: item.uuid });
  if (item.isFolder) {
    await drive.folder.moveFolder({ folderUuid: item.uuid, destinationFolderUuid, name: item.newName });
  } else {
    await drive.file.moveFile({ fileUuid: item.uuid, destinationFolderUuid, name: item.newName });
  }
};

const getMoveFailureText = (movedCount: number, failedItems: MovableItem[]) => {
  const [firstFailedItem] = failedItems;
  if (failedItems.length === 1) {
    return strings.formatString(strings.messages.itemCouldNotBeMoved, firstFailedItem.name).toString();
  }
  if (movedCount === 0) {
    return strings.formatString(strings.messages.itemsCouldNotBeMoved, failedItems.length).toString();
  }
  return strings.formatString(strings.messages.itemsPartiallyMoved, movedCount, failedItems.length).toString();
};

const showMoveResultNotification = (movedCount: number, failedItems: MovableItem[], onViewFolderPress: () => void) => {
  if (failedItems.length === 0) {
    notifications.show({
      text1:
        movedCount === 1
          ? strings.messages.itemMoved
          : strings.formatString(strings.messages.itemsMoved, movedCount).toString(),
      type: NotificationType.Success,
      action: { text: strings.generic.view_folder, onActionPress: onViewFolderPress },
    });
    return;
  }

  notifications.show({
    text1: getMoveFailureText(movedCount, failedItems),
    type: NotificationType.Error,
  });
};

/**
 * Moves the items to the destination folder, at most `MAX_CONCURRENT_MOVES` at a time, under `newName` when it is set.
 * A failed item does not stop the others. Shows one notification with the result, unless `items` is empty, and emits
 * `DriveItemMoved` with the result.
 */
export const moveDriveItems = async ({
  items,
  originFolderUuid,
  destinationFolderUuid,
  onViewFolderPress,
}: {
  items: MovableItem[];
  originFolderUuid: string;
  destinationFolderUuid: string;
  onViewFolderPress: () => void;
}): Promise<MoveDriveItemsResult> => {
  const moveLimit = pLimit(MAX_CONCURRENT_MOVES);
  const moveOutcomes = await Promise.allSettled(
    items.map((item) => moveLimit(() => moveDriveItem(item, destinationFolderUuid))),
  );

  const movedUuids: string[] = [];
  const failedItems: MovableItem[] = [];
  moveOutcomes.forEach((moveOutcome, index) => {
    if (moveOutcome.status === 'fulfilled') {
      movedUuids.push(items[index].uuid);
    } else {
      errorService.reportError(moveOutcome.reason);
      failedItems.push(items[index]);
    }
  });

  if (movedUuids.length > 0) {
    void notifyParentChanged(originFolderUuid);
  }
  if (items.length > 0) {
    showMoveResultNotification(movedUuids.length, failedItems, onViewFolderPress);
  }

  const moveResult: MoveDriveItemsResult = { movedUuids, failedUuids: failedItems.map((item) => item.uuid) };
  driveEvents.emit({ event: DriveEventKey.DriveItemMoved }, moveResult);
  return moveResult;
};
