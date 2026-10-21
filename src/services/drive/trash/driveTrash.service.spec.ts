import { driveTrashService } from './driveTrash.service';

const mockDeleteItemsPermanentlyByUUID = jest.fn();
const mockAddItemsToTrash = jest.fn();

jest.mock('@internxt-mobile/services/common', () => ({
  SdkManager: {
    getInstance: () => ({
      trash: {
        deleteItemsPermanentlyByUUID: (...args: unknown[]) => mockDeleteItemsPermanentlyByUUID(...args),
        addItemsToTrash: (...args: unknown[]) => mockAddItemsToTrash(...args),
      },
    }),
  },
}));

jest.mock('../file', () => ({ driveFileService: {} }));
jest.mock('../folder', () => ({ driveFolderService: {} }));

describe('Deleting and trashing drive items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when items are deleted from the trash for good, then they are identified by their uuid', async () => {
    await driveTrashService.deleteItemsPermanently([
      { uuid: 'file-uuid', type: 'file' },
      { uuid: 'folder-uuid', type: 'folder' },
    ]);

    expect(mockDeleteItemsPermanentlyByUUID).toHaveBeenCalledWith({
      items: [
        { uuid: 'file-uuid', type: 'file' },
        { uuid: 'folder-uuid', type: 'folder' },
      ],
    });
  });

  test('when items are moved to the trash, then they are identified by their uuid', async () => {
    await driveTrashService.moveToTrash([{ uuid: 'file-uuid', type: 'file' }]);

    expect(mockAddItemsToTrash).toHaveBeenCalledWith({ items: [{ uuid: 'file-uuid', type: 'file' }] });
  });
});
