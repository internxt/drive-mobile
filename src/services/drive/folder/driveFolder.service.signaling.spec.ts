const mockNotifyParentChanged = jest.fn().mockResolvedValue(undefined);
const mockCreateFolderByUuid = jest.fn();

jest.mock('../../native/InternxtSignalingModule', () => ({
  notifyParentChanged: (...args: unknown[]) => mockNotifyParentChanged(...args),
}));

jest.mock('@internxt-mobile/services/common', () => ({
  SdkManager: {
    getInstance: () => ({
      storageV2: {
        createFolderByUuid: (...args: unknown[]) => mockCreateFolderByUuid(...args),
      },
    }),
  },
}));

import { driveFolderService } from './driveFolder.service';

describe('driveFolderService.createFolder — picker signaling', () => {
  beforeEach(() => {
    mockNotifyParentChanged.mockClear();
    mockCreateFolderByUuid.mockReset();
  });

  it('when a folder is created, then it signals the parent folder uuid', async () => {
    mockCreateFolderByUuid.mockReturnValue([Promise.resolve({ uuid: 'new-folder', name: 'docs' })]);

    await driveFolderService.createFolder('parent-folder-uuid', 'docs');

    expect(mockNotifyParentChanged).toHaveBeenCalledWith('parent-folder-uuid');
  });

  it('when the SDK returns no result, then it rejects and does not signal', async () => {
    mockCreateFolderByUuid.mockReturnValue(undefined);

    await expect(driveFolderService.createFolder('parent-folder-uuid', 'docs')).rejects.toBeDefined();
    expect(mockNotifyParentChanged).not.toHaveBeenCalled();
  });
});
