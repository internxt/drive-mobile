import type { DriveFoldersTreeNode } from '../../../contexts/Drive/Drive.context';
import { DriveItemStatus, DriveListItem } from '../../../types/drive/item';
import { SortDirection, SortType } from '../../../types/drive/ui';
import {
  canLoadNextPage,
  getFolderPreviewFiles,
  getPreviewFiles,
  hasSelectedFolder,
  matchesSearchValue,
} from './DriveFolderScreen.helpers';

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

describe('Building the list of files to swipe through in the preview', () => {
  const buildListItem = (uuid: string, isFolder: boolean, status = DriveItemStatus.Idle) =>
    ({ id: uuid, status, data: { uuid, isFolder } }) as DriveListItem;

  test('when the folder shows folders and files, then the list holds only the files', () => {
    const shownItems = [buildListItem('folder-uuid', true), buildListItem('file-uuid', false)];

    expect(getPreviewFiles(shownItems).map((previewFile) => previewFile.uuid)).toEqual(['file-uuid']);
  });

  test('when the folder shows several files, then the list keeps the order shown on screen', () => {
    const shownItems = [buildListItem('file-b', false), buildListItem('file-a', false), buildListItem('file-c', false)];

    expect(getPreviewFiles(shownItems).map((previewFile) => previewFile.uuid)).toEqual(['file-b', 'file-a', 'file-c']);
  });

  test('when a file is still uploading, then it is left out of the list', () => {
    const shownItems = [
      buildListItem('uploading-file', false, DriveItemStatus.Uploading),
      buildListItem('file-uuid', false),
    ];

    expect(getPreviewFiles(shownItems).map((previewFile) => previewFile.uuid)).toEqual(['file-uuid']);
  });
});

describe('Building the preview files of a folder', () => {
  const aTreeFile = (uuid: string, plainName: string, size = 1) =>
    ({
      uuid,
      plainName,
      name: plainName,
      size,
      folderUuid: 'folder-uuid',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      isFolder: false,
      thumbnails: [],
    }) as unknown as DriveFoldersTreeNode['files'][number];
  const byNameAscending = { type: SortType.Name, direction: SortDirection.Asc };

  test('when the folder has several files, then they come sorted with the chosen sort mode', () => {
    const files = [aTreeFile('file-b', 'b.pdf'), aTreeFile('file-c', 'c.pdf'), aTreeFile('file-a', 'a.pdf')];

    const previewFiles = getFolderPreviewFiles(files, byNameAscending, '');

    expect(previewFiles.map((previewFile) => previewFile.uuid)).toEqual(['file-a', 'file-b', 'file-c']);
  });

  test('when a search is active, then only the files matching it are kept', () => {
    const files = [aTreeFile('file-a', 'holiday.pdf'), aTreeFile('file-b', 'invoice.pdf')];

    const previewFiles = getFolderPreviewFiles(files, byNameAscending, 'INVOICE');

    expect(previewFiles.map((previewFile) => previewFile.uuid)).toEqual(['file-b']);
  });

  test('when the search text is in another letter case, then the name still matches', () => {
    const item = { id: 'file-a', status: DriveItemStatus.Idle, data: { uuid: 'file-a', name: 'Holiday.PDF' } };

    expect(matchesSearchValue(item as DriveListItem, 'holiday')).toBe(true);
  });

  test('when the search text is empty, then every name matches', () => {
    const item = { id: 'file-a', status: DriveItemStatus.Idle, data: { uuid: 'file-a', name: 'Holiday.PDF' } };

    expect(matchesSearchValue(item as DriveListItem, '')).toBe(true);
  });
});
