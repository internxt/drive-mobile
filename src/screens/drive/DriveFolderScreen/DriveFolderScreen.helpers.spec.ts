import type { DriveFoldersTreeNode } from '../../../contexts/Drive/Drive.context';
import { DriveItemStatus, DriveListItem } from '../../../types/drive/item';
import { canLoadNextPage, hasSelectedFolder } from './DriveFolderScreen.helpers';

const aFolderNode = (overrides: Partial<DriveFoldersTreeNode> = {}): DriveFoldersTreeNode => ({
  name: 'Invoices',
  parentId: 'parent-folder-uuid',
  uuid: 'folder-uuid',
  updatedAt: '2026-10-22T10:00:00.000Z',
  createdAt: '2026-10-22T10:00:00.000Z',
  loading: false,
  files: [],
  folders: [],
  nextFoldersOffset: null,
  nextFilesOffset: 50,
  ...overrides,
});

describe('Loading the next page of a folder', () => {
  test('when the folder is still loading, then the next page is not requested', () => {
    expect(canLoadNextPage(aFolderNode({ loading: true }))).toBe(false);
  });

  test('when the folder has not been loaded yet, then the next page is not requested', () => {
    expect(canLoadNextPage(undefined)).toBe(false);
  });

  test('when everything in the folder is already loaded, then the next page is not requested', () => {
    expect(canLoadNextPage(aFolderNode({ nextFoldersOffset: null, nextFilesOffset: null }))).toBe(false);
  });

  test('when the folder has finished loading, then the next page can be requested', () => {
    expect(canLoadNextPage(aFolderNode())).toBe(true);
  });
});

describe('Checking whether the selection contains a folder', () => {
  const buildItem = (uuid: string, isFolder: boolean) =>
    ({ id: uuid, status: DriveItemStatus.Idle, data: { uuid, isFolder } }) as DriveListItem;
  const items = [buildItem('folder-uuid', true), buildItem('file-uuid', false)];

  test('when a folder is selected, then the selection counts as containing one', () => {
    expect(hasSelectedFolder(items, new Set(['folder-uuid', 'file-uuid']))).toBe(true);
  });

  test('when only files are selected, then the selection does not count as containing a folder', () => {
    expect(hasSelectedFolder(items, new Set(['file-uuid']))).toBe(false);
  });
});
