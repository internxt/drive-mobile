import analytics from '@internxt-mobile/services/AnalyticsService';
import { DriveItemStatus, DriveListItem } from '@internxt-mobile/types/drive/item';
import { deleteDriveItemsPermanently } from './trash';

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
    },
  },
}));

jest.mock('@internxt-mobile/services/drive/events', () => ({ driveEvents: { emit: jest.fn() } }));
jest.mock('@internxt-mobile/services/ErrorService', () => ({ __esModule: true, default: { reportError: jest.fn() } }));
jest.mock('@internxt-mobile/services/NotificationsService', () => ({
  notifications: { success: jest.fn(), error: jest.fn() },
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
