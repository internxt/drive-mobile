import analytics from '@internxt-mobile/services/AnalyticsService';
import { DriveItemStatus, DriveListItem } from '@internxt-mobile/types/drive/item';
import drive from '@internxt-mobile/services/drive';
import { deleteDriveItemsPermanently, moveItemsToTrash, restoreDriveItems } from './trash';

jest.mock('@internxt-mobile/services/AnalyticsService', () => ({
  __esModule: true,
  default: { track: jest.fn() },
  DriveAnalyticsEvent: { FileDeleted: 'File Deleted' },
}));

jest.mock('@internxt-mobile/services/drive', () => ({
  __esModule: true,
  default: {
    trash: {
      deleteItemsPermanently: jest.fn().mockResolvedValue(undefined),
      moveToTrash: jest.fn().mockResolvedValue(undefined),
      restoreFile: jest.fn().mockResolvedValue(undefined),
      restoreFolder: jest.fn().mockResolvedValue(undefined),
    },
    database: {
      deleteItem: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('@internxt-mobile/services/drive/events', () => ({ driveEvents: { emit: jest.fn() } }));
jest.mock('@internxt-mobile/services/ErrorService', () => ({ __esModule: true, default: { reportError: jest.fn() } }));
jest.mock('@internxt-mobile/services/NotificationsService', () => ({
  notifications: { success: jest.fn(), error: jest.fn(), show: jest.fn() },
}));
jest.mock('../../helpers', () => ({ checkIsFolder: jest.requireActual('../../helpers/driveItems').checkIsFolder }));

const buildListItem = (data: Partial<DriveListItem['data']>): DriveListItem => ({
  id: data.uuid ?? 'item-1',
  status: DriveItemStatus.Idle,
  data: {
    uuid: 'item-1',
    name: 'item',
    createdAt: '2025-02-16T00:00:00.000Z',
    updatedAt: '2025-02-16T00:00:00.000Z',
    isFolder: false,
    ...data,
  },
});

describe('Deleting items from the trash for good', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when a file is deleted for good, then the event names the folder that held it', async () => {
    await deleteDriveItemsPermanently([
      buildListItem({ uuid: 'file-1', type: 'pdf', folderUuid: 'folder-1', fileId: 'file-id-1' }),
    ]);

    expect(analytics.track).toHaveBeenCalledWith(
      'File Deleted',
      expect.objectContaining({ parent_folder_uuid: 'folder-1' }),
    );
  });

  test('when a folder is deleted for good, then the event names the folder that held it', async () => {
    await deleteDriveItemsPermanently([buildListItem({ uuid: 'folder-2', isFolder: true, parentUuid: 'folder-1' })]);

    expect(analytics.track).toHaveBeenCalledWith(
      'File Deleted',
      expect.objectContaining({ parent_folder_uuid: 'folder-1' }),
    );
  });
});

describe('Moving items to the trash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('when a few items are moved to the trash, then they are all sent in one request with their type', async () => {
    await moveItemsToTrash(
      [
        { uuid: 'folder-1', type: 'folder' },
        { uuid: 'file-1', type: 'file' },
      ],
      jest.fn(),
    );

    expect(drive.trash.moveToTrash).toHaveBeenCalledTimes(1);
    expect(drive.trash.moveToTrash).toHaveBeenCalledWith([
      { uuid: 'folder-1', type: 'folder' },
      { uuid: 'file-1', type: 'file' },
    ]);
  });

  test('when more items than the server accepts at once are moved, then they are sent in several requests', async () => {
    const items = Array.from({ length: 120 }, (_, index) => ({ uuid: `file-${index}`, type: 'file' as const }));

    await moveItemsToTrash(items, jest.fn());

    const sentBatches = jest.mocked(drive.trash.moveToTrash).mock.calls.map(([batch]) => batch);
    expect(sentBatches.map((batch) => batch.length)).toStrictEqual([50, 50, 20]);
    expect(sentBatches.flat()).toStrictEqual(items);
  });

  test('when the server rejects the items, then the move fails', async () => {
    jest.mocked(drive.trash.moveToTrash).mockRejectedValueOnce(new Error('network'));

    const result = await moveItemsToTrash([{ uuid: 'file-1', type: 'file' }], jest.fn());

    expect(result.success).toBe(false);
  });
});

describe('Restoring items from the trash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when several items are restored, then each one goes back to its own folder', async () => {
    await restoreDriveItems([
      { fileId: 'file-1', destinationFolderId: 'folder-a' },
      { folderId: 'folder-2', destinationFolderId: 'folder-b' },
    ]);

    expect(drive.trash.restoreFile).toHaveBeenCalledWith({ fileUuid: 'file-1', destinationFolderUuid: 'folder-a' });
    expect(drive.trash.restoreFolder).toHaveBeenCalledWith({
      folderUuid: 'folder-2',
      destinationFolderUuid: 'folder-b',
    });
  });
});
