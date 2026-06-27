import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { SharedFiles, SharedFolders } from '@internxt-mobile/types/drive/shared';
import { buildSharedItemOnPress, mapSharedLinkToDriveItemData } from './sharedNavigation';

type SharedLink = SharedFolders & SharedFiles;

const arrangeItem = (overrides: Partial<DriveItemData>): DriveItemData =>
  ({
    id: 1,
    uuid: 'item-uuid',
    name: 'My item',
    isFolder: false,
    updatedAt: '2025-01-01',
    createdAt: '2025-01-01',
    ...overrides,
  }) as DriveItemData;

const arrangeSharedFile = (overrides: Partial<SharedLink> = {}): SharedLink =>
  ({
    id: 42,
    uuid: 'file-uuid',
    plainName: 'invoice',
    type: 'pdf',
    folderId: 7,
    folderUuid: 'folder-uuid',
    bucket: 'bucket-id',
    size: '2048',
    fileId: '6a30bb2dca570b793e3c0735',
    token: null,
    updatedAt: '2025-01-01',
    createdAt: '2025-01-01',
    ...overrides,
  }) as unknown as SharedLink;

describe('buildSharedItemOnPress', () => {
  test('when a shared folder is tapped, then it opens that folder', () => {
    const navigateToSharedFolder = jest.fn();
    const folder = arrangeItem({ isFolder: true, uuid: 'folder-uuid', name: 'Reports' });

    const onPress = buildSharedItemOnPress(folder, navigateToSharedFolder, 'Shared');
    onPress?.();

    expect(navigateToSharedFolder).toHaveBeenCalledWith({
      folderUuid: 'folder-uuid',
      folderName: 'Reports',
      parentFolderName: 'Shared',
    });
  });

  test('when a shared file is tapped, then it opens the file preview instead of the folder view', () => {
    const navigateToSharedFolder = jest.fn();
    const file = arrangeItem({ isFolder: false });

    const onPress = buildSharedItemOnPress(file, navigateToSharedFolder);

    expect(onPress).toBeUndefined();
  });

  test('when a shared folder is tapped, then it does not redirect to the Drive tab', () => {
    const navigateToSharedFolder = jest.fn();
    const folder = arrangeItem({ isFolder: true });

    buildSharedItemOnPress(folder, navigateToSharedFolder)?.();

    expect(navigateToSharedFolder).toHaveBeenCalledTimes(1);
  });
});

describe('mapSharedLinkToDriveItemData', () => {
  test('when a shared file is tapped, then it can be downloaded and previewed', () => {
    const data = mapSharedLinkToDriveItemData(arrangeSharedFile());

    expect(data).toMatchObject({
      isFolder: false,
      fileId: '6a30bb2dca570b793e3c0735',
      bucket: 'bucket-id',
      type: 'pdf',
    });
  });

  test('when a shared file is tapped, then it does not open a folder view', () => {
    const navigateToSharedFolder = jest.fn();
    const data = mapSharedLinkToDriveItemData(arrangeSharedFile());

    const onPress = buildSharedItemOnPress(data, navigateToSharedFolder);

    expect(onPress).toBeUndefined();
    expect(navigateToSharedFolder).not.toHaveBeenCalled();
  });

  test('when a shared folder is tapped, then it is treated as a folder, not a file', () => {
    const folder = arrangeSharedFile({ type: 'folder', plainName: 'Reports' });

    const data = mapSharedLinkToDriveItemData(folder);

    expect(data.isFolder).toBe(true);
    expect(data.fileId).toBeUndefined();
  });

  test('when a shared file is missing its storage location, then it can still be downloaded', () => {
    const file = arrangeSharedFile({ bucket: null });

    const data = mapSharedLinkToDriveItemData(file, 'user-bucket');

    expect(data.bucket).toBe('user-bucket');
  });

  test('when a shared file already has its storage location, then that location is used', () => {
    const file = arrangeSharedFile({ bucket: 'item-bucket' });

    const data = mapSharedLinkToDriveItemData(file, 'user-bucket');

    expect(data.bucket).toBe('item-bucket');
  });
});
