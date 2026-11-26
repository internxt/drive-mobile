const mockLoadNextPage = jest.fn();
const mockUseDrive = jest.fn();

jest.mock('@internxt-mobile/hooks/drive', () => ({
  useDrive: () => mockUseDrive(),
}));

jest.mock('../../DriveFolderScreen/useLoadNextFolderPage', () => ({
  useLoadNextFolderPage: () => ({ loadNextPage: mockLoadNextPage, isLoadingNextPage: false }),
}));

jest.mock('@internxt-mobile/services/ErrorService', () => ({
  __esModule: true,
  default: { reportError: jest.fn() },
}));

import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { SortDirection, SortType } from '@internxt-mobile/types/drive/ui';
import { act, renderHook } from '@testing-library/react-native';
import { useLoadMorePreviewFiles } from './useLoadMorePreviewFiles';

const FOLDER_UUID = 'folder-uuid';
const SOURCE_FOLDER = { folderUuid: FOLDER_UUID, searchValue: '' };

const aTreeFile = (uuid: string) => ({
  uuid,
  plainName: `${uuid}.pdf`,
  name: `${uuid}.pdf`,
  size: 1,
  folderUuid: FOLDER_UUID,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  isFolder: false,
  thumbnails: [],
});

const aNode = (fileUuids: string[], overrides: Record<string, unknown> = {}) => ({
  loading: false,
  files: fileUuids.map(aTreeFile),
  folders: [],
  nextFoldersOffset: null,
  nextFilesOffset: 50,
  ...overrides,
});

const mockTree = (node: Record<string, unknown>) => {
  mockUseDrive.mockReturnValue({
    sortMode: { type: SortType.Name, direction: SortDirection.Asc },
    driveFoldersTree: { [FOLDER_UUID]: node },
  });
};

type HookProps = {
  sourceFolder?: typeof SOURCE_FOLDER;
  activeIndex: number;
  previewFileUuids: string[];
  removedFileUuids?: string[];
};

const aPreviewFile = (uuid: string) => ({ ...aTreeFile(uuid), name: uuid });

const arrangeHook = (node: Record<string, unknown>, initialProps: HookProps) => {
  const appendFiles = jest.fn();
  mockTree(node);
  const rendered = renderHook(
    ({ sourceFolder, activeIndex, previewFileUuids, removedFileUuids = [] }: HookProps) =>
      useLoadMorePreviewFiles({
        sourceFolder,
        activeIndex,
        previewFiles: previewFileUuids.map(aPreviewFile) as unknown as DriveItemData[],
        removedFileUuids: new Set(removedFileUuids),
        appendFiles,
      }),
    { initialProps },
  );
  return { ...rendered, appendFiles };
};

const appendedUuids = (appendFiles: jest.Mock) =>
  appendFiles.mock.calls.flatMap((call) => call[0].map((file: { uuid: string }) => file.uuid));

describe('Loading more files in the preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadNextPage.mockResolvedValue(undefined);
  });

  test('when the shown file is near the end and the folder has more pages, then the next page is loaded', () => {
    arrangeHook(aNode(['file-a', 'file-b', 'file-c']), {
      sourceFolder: SOURCE_FOLDER,
      activeIndex: 1,
      previewFileUuids: ['file-a', 'file-b', 'file-c'],
    });

    expect(mockLoadNextPage).toHaveBeenCalledTimes(1);
  });

  test('when the shown file is far from the end, then nothing is loaded', () => {
    const fileUuids = ['a', 'b', 'c', 'd', 'e', 'f'];
    arrangeHook(aNode(fileUuids), { sourceFolder: SOURCE_FOLDER, activeIndex: 0, previewFileUuids: fileUuids });

    expect(mockLoadNextPage).not.toHaveBeenCalled();
  });

  test('when the preview has no source folder, then nothing is loaded', () => {
    const { appendFiles } = arrangeHook(aNode(['file-a']), { activeIndex: 0, previewFileUuids: ['file-a'] });

    expect(mockLoadNextPage).not.toHaveBeenCalled();
    expect(appendFiles).not.toHaveBeenCalled();
  });

  test('when the next page arrives with files, then only the new files are appended', () => {
    const { rerender, appendFiles } = arrangeHook(aNode(['file-a', 'file-b']), {
      sourceFolder: SOURCE_FOLDER,
      activeIndex: 1,
      previewFileUuids: ['file-a', 'file-b'],
    });

    mockTree(aNode(['file-a', 'file-b', 'file-c', 'file-d'], { nextFilesOffset: null }));
    rerender({ sourceFolder: SOURCE_FOLDER, activeIndex: 1, previewFileUuids: ['file-a', 'file-b'] });

    expect(appendedUuids(appendFiles)).toEqual(['file-c', 'file-d']);
  });

  test('when a page landed before the preview opened, then its files are appended without loading', () => {
    const { appendFiles } = arrangeHook(aNode(['a', 'b', 'c', 'd', 'e', 'f', 'g'], { nextFilesOffset: null }), {
      sourceFolder: SOURCE_FOLDER,
      activeIndex: 0,
      previewFileUuids: ['a', 'b', 'c', 'd', 'e'],
    });

    expect(appendedUuids(appendFiles)).toEqual(['f', 'g']);
    expect(mockLoadNextPage).not.toHaveBeenCalled();
  });

  test('when the next page brings only folders, then the following page is requested', () => {
    const { rerender, appendFiles } = arrangeHook(aNode(['file-a', 'file-b']), {
      sourceFolder: SOURCE_FOLDER,
      activeIndex: 1,
      previewFileUuids: ['file-a', 'file-b'],
    });

    mockTree(aNode(['file-a', 'file-b'], { folders: [{ uuid: 'new-folder' }] }));
    rerender({ sourceFolder: SOURCE_FOLDER, activeIndex: 1, previewFileUuids: ['file-a', 'file-b'] });

    expect(appendFiles).not.toHaveBeenCalled();
    expect(mockLoadNextPage).toHaveBeenCalledTimes(2);
  });

  test('when the folder goes back to its first page, then pages are requested again without repeating files', () => {
    const shownUuids = ['a', 'b', 'c', 'd'];
    const { rerender, appendFiles } = arrangeHook(aNode(shownUuids), {
      sourceFolder: SOURCE_FOLDER,
      activeIndex: 3,
      previewFileUuids: shownUuids,
    });

    mockTree(aNode(['a', 'b'], { nextFilesOffset: 2 }));
    rerender({ sourceFolder: SOURCE_FOLDER, activeIndex: 3, previewFileUuids: shownUuids });

    expect(appendFiles).not.toHaveBeenCalled();
    expect(mockLoadNextPage).toHaveBeenCalledTimes(2);
  });

  test('when a file was removed from the preview, then it is not added back', () => {
    const { appendFiles } = arrangeHook(aNode(['a', 'b', 'c', 'd', 'e', 'f'], { nextFilesOffset: null }), {
      sourceFolder: SOURCE_FOLDER,
      activeIndex: 0,
      previewFileUuids: ['a', 'c', 'd', 'e', 'f'],
      removedFileUuids: ['b'],
    });

    expect(appendFiles).not.toHaveBeenCalled();
  });

  test('when loading the next page fails, then a later swipe near the end requests it again', async () => {
    mockLoadNextPage.mockRejectedValueOnce(new Error('network down'));
    const previewFileUuids = ['file-a', 'file-b', 'file-c'];
    const { rerender } = arrangeHook(aNode(previewFileUuids), {
      sourceFolder: SOURCE_FOLDER,
      activeIndex: 1,
      previewFileUuids,
    });
    await act(async () => {
      await Promise.resolve();
    });

    rerender({ sourceFolder: SOURCE_FOLDER, activeIndex: 2, previewFileUuids });

    expect(mockLoadNextPage).toHaveBeenCalledTimes(2);
  });
});
