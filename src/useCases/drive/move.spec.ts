import drive from '@internxt-mobile/services/drive';
import { driveEvents } from '@internxt-mobile/services/drive/events';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import { DriveEventKey } from '@internxt-mobile/types/drive/events';
import { NotificationType } from '@internxt-mobile/types/index';
import { moveDriveItems } from './move';

jest.mock('@internxt-mobile/services/drive', () => ({
  __esModule: true,
  default: {
    database: { deleteItem: jest.fn().mockResolvedValue(undefined) },
    file: { moveFile: jest.fn().mockResolvedValue(undefined) },
    folder: { moveFolder: jest.fn().mockResolvedValue(undefined) },
  },
}));
jest.mock('@internxt-mobile/services/drive/events', () => ({ driveEvents: { emit: jest.fn() } }));
jest.mock('@internxt-mobile/services/ErrorService', () => ({ __esModule: true, default: { reportError: jest.fn() } }));
jest.mock('@internxt-mobile/services/native/InternxtSignalingModule', () => ({ notifyParentChanged: jest.fn() }));
jest.mock('@internxt-mobile/services/NotificationsService', () => ({ notifications: { show: jest.fn() } }));

const { notifyParentChanged } = jest.requireMock('@internxt-mobile/services/native/InternxtSignalingModule');

const ORIGIN_FOLDER_UUID = 'origin-folder';
const DESTINATION_FOLDER_UUID = 'destination-folder';

const folderToMove = { uuid: 'folder-1', name: 'Invoices', isFolder: true };
const firstFileToMove = { uuid: 'file-1', name: 'report.pdf', isFolder: false };
const secondFileToMove = { uuid: 'file-2', name: 'notes.txt', isFolder: false };

const moveToDestination = (items: (typeof folderToMove)[], onViewFolderPress = jest.fn()) =>
  moveDriveItems({
    items,
    originFolderUuid: ORIGIN_FOLDER_UUID,
    destinationFolderUuid: DESTINATION_FOLDER_UUID,
    onViewFolderPress,
  });

const getShownNotification = () => jest.mocked(notifications.show).mock.calls[0][0];

describe('Moving several items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when folders and files are moved, then each one goes to the destination with the right request', async () => {
    const moveResult = await moveToDestination([folderToMove, firstFileToMove]);

    expect(drive.folder.moveFolder).toHaveBeenCalledWith({
      folderUuid: 'folder-1',
      destinationFolderUuid: DESTINATION_FOLDER_UUID,
    });
    expect(drive.file.moveFile).toHaveBeenCalledWith({
      fileUuid: 'file-1',
      destinationFolderUuid: DESTINATION_FOLDER_UUID,
    });
    expect(moveResult).toStrictEqual({ movedUuids: ['folder-1', 'file-1'], failedUuids: [] });
  });

  test('when every item is moved, then one notification counts them and lets the user open the folder', async () => {
    const onViewFolderPress = jest.fn();

    await moveToDestination([folderToMove, firstFileToMove], onViewFolderPress);
    getShownNotification().action?.onActionPress();

    expect(notifications.show).toHaveBeenCalledTimes(1);
    expect(getShownNotification().type).toBe(NotificationType.Success);
    expect(getShownNotification().text1).toBe('2 items moved');
    expect(onViewFolderPress).toHaveBeenCalled();
  });

  test('when a single item is moved, then the notification names it in singular', async () => {
    await moveToDestination([firstFileToMove]);

    expect(getShownNotification().type).toBe(NotificationType.Success);
    expect(getShownNotification().text1).toBe('Item moved');
  });

  test('when one item cannot be moved, then the others are still moved and the notification names it', async () => {
    jest.mocked(drive.file.moveFile).mockRejectedValueOnce(new Error('network'));

    const moveResult = await moveToDestination([firstFileToMove, folderToMove, secondFileToMove]);

    expect(moveResult).toStrictEqual({ movedUuids: ['folder-1', 'file-2'], failedUuids: ['file-1'] });
    expect(notifications.show).toHaveBeenCalledTimes(1);
    expect(getShownNotification().type).toBe(NotificationType.Error);
    expect(getShownNotification().text1).toContain('report.pdf');
  });

  test('when several items cannot be moved, then the notification counts the moved and the failed ones', async () => {
    jest
      .mocked(drive.file.moveFile)
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'));

    await moveToDestination([firstFileToMove, folderToMove, secondFileToMove]);

    expect(getShownNotification().type).toBe(NotificationType.Error);
    expect(getShownNotification().text1).toBe('1 moved, 2 could not be moved. They are still selected.');
  });

  test('when none of several items can be moved, then the notification counts the failed ones', async () => {
    jest
      .mocked(drive.file.moveFile)
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'));

    await moveToDestination([firstFileToMove, secondFileToMove]);

    expect(getShownNotification().type).toBe(NotificationType.Error);
    expect(getShownNotification().text1).toBe('2 items could not be moved');
  });

  test('when the move finishes, then the folder screens are told which items failed', async () => {
    jest.mocked(drive.folder.moveFolder).mockRejectedValueOnce(new Error('network'));

    await moveToDestination([folderToMove, firstFileToMove]);

    expect(driveEvents.emit).toHaveBeenCalledWith(
      { event: DriveEventKey.DriveItemMoved },
      { movedUuids: ['file-1'], failedUuids: ['folder-1'] },
    );
  });

  test('when some items are moved, then the origin folder is refreshed once', async () => {
    await moveToDestination([folderToMove, firstFileToMove, secondFileToMove]);

    expect(notifyParentChanged).toHaveBeenCalledTimes(1);
    expect(notifyParentChanged).toHaveBeenCalledWith(ORIGIN_FOLDER_UUID);
  });

  test('when no item can be moved, then the origin folder is not refreshed', async () => {
    jest.mocked(drive.file.moveFile).mockRejectedValueOnce(new Error('network'));

    await moveToDestination([firstFileToMove]);

    expect(notifyParentChanged).not.toHaveBeenCalled();
  });
});
