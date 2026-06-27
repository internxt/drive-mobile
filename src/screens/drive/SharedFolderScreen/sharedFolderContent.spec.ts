import errorService from '@internxt-mobile/services/ErrorService';
import notificationsService from '@internxt-mobile/services/NotificationsService';
import { NotificationType } from '@internxt-mobile/types/index';
import { DriveFileForTree } from '@internxt-mobile/types/drive/file';
import { DriveFolderForTree } from '@internxt-mobile/types/drive/folder';
import { NativeScrollEvent } from 'react-native';
import { buildSharedFolderItems, isCloseToScrollEnd, loadSharedFolderContent } from './sharedFolderContent';

jest.mock('@internxt-mobile/services/ErrorService', () => ({
  __esModule: true,
  default: {
    reportError: jest.fn(),
    castError: jest.fn(() => new Error('content failed')),
  },
}));

jest.mock('@internxt-mobile/services/NotificationsService', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

const arrangeFolder = (overrides: Partial<DriveFolderForTree> = {}): DriveFolderForTree =>
  ({
    id: 10,
    uuid: 'folder-uuid',
    name: 'encrypted',
    plainName: 'Reports',
    parentId: 1,
    parentUuid: 'parent-uuid',
    updatedAt: '2025-01-01',
    createdAt: '2025-01-01',
    isFolder: true,
    ...overrides,
  }) as DriveFolderForTree;

const arrangeFile = (overrides: Partial<DriveFileForTree> = {}): DriveFileForTree =>
  ({
    id: 20,
    uuid: 'file-uuid',
    fileId: 'network-file-id',
    name: 'encrypted',
    plainName: 'invoice',
    type: 'pdf',
    size: 1024,
    bucket: 'bucket-id',
    folderId: 10,
    folderUuid: 'folder-uuid',
    updatedAt: '2025-01-01',
    createdAt: '2025-01-01',
    isFolder: false,
    thumbnails: [],
    ...overrides,
  }) as DriveFileForTree;

describe('buildSharedFolderItems', () => {
  test('when a shared folder is opened, then its subfolders are listed before its files', () => {
    const items = buildSharedFolderItems({ folders: [arrangeFolder()], files: [arrangeFile()] });

    expect(items.map((item) => item.isFolder)).toEqual([true, false]);
  });

  test('when a shared folder is opened, then its subfolders show their name and can be opened', () => {
    const [folderItem] = buildSharedFolderItems({ folders: [arrangeFolder()], files: [] });

    expect(folderItem).toMatchObject({ uuid: 'folder-uuid', name: 'Reports', isFolder: true });
  });

  test('when a shared folder is opened, then its files can be downloaded', () => {
    const [fileItem] = buildSharedFolderItems({ folders: [], files: [arrangeFile()] });

    expect(fileItem).toMatchObject({
      uuid: 'file-uuid',
      fileId: 'network-file-id',
      bucket: 'bucket-id',
      type: 'pdf',
      isFolder: false,
    });
  });

  test('when a file in a shared folder has no storage location, then it can still be downloaded', () => {
    const [fileItem] = buildSharedFolderItems({ folders: [], files: [arrangeFile({ bucket: '' })] }, 'user-bucket');

    expect(fileItem.bucket).toBe('user-bucket');
  });

  test('when a file in a shared folder has its storage location, then that location is used', () => {
    const [fileItem] = buildSharedFolderItems({ folders: [], files: [arrangeFile()] }, 'user-bucket');

    expect(fileItem.bucket).toBe('bucket-id');
  });

  test('when a shared folder has no contents, then nothing is listed', () => {
    expect(buildSharedFolderItems(undefined)).toEqual([]);
  });
});

describe('loadSharedFolderContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when a shared folder loads successfully, then no error is shown', async () => {
    const loadFolderContent = jest.fn().mockResolvedValue(undefined);

    await loadSharedFolderContent({ loadFolderContent }, 'folder-uuid');

    expect(loadFolderContent).toHaveBeenCalledWith('folder-uuid', { resetPagination: true, focusFolder: false });
    expect(notificationsService.show).not.toHaveBeenCalled();
  });

  test('when scrolling to the end of a shared folder, then the next items are appended to the list', async () => {
    const loadFolderContent = jest.fn().mockResolvedValue(undefined);

    await loadSharedFolderContent({ loadFolderContent }, 'folder-uuid', { resetPagination: false });

    expect(loadFolderContent).toHaveBeenCalledWith('folder-uuid', { resetPagination: false, focusFolder: false });
  });

  test('when a shared folder fails to load, then an error is shown and the app does not crash', async () => {
    const loadFolderContent = jest.fn().mockRejectedValue(new Error('offline'));

    await loadSharedFolderContent({ loadFolderContent }, 'folder-uuid');

    expect(errorService.reportError).toHaveBeenCalled();
    expect(notificationsService.show).toHaveBeenCalledWith({
      type: NotificationType.Error,
      text1: 'content failed',
    });
  });
});

describe('isCloseToScrollEnd', () => {
  const arrangeScroll = (offsetY: number): NativeScrollEvent =>
    ({
      layoutMeasurement: { height: 600, width: 0 },
      contentOffset: { y: offsetY, x: 0 },
      contentSize: { height: 1200, width: 0 },
    }) as NativeScrollEvent;

  test('when the list is scrolled near the bottom, then more content should load', () => {
    expect(isCloseToScrollEnd(arrangeScroll(560))).toBe(true);
  });

  test('when the list is scrolled away from the bottom, then more content should not load', () => {
    expect(isCloseToScrollEnd(arrangeScroll(100))).toBe(false);
  });
});
