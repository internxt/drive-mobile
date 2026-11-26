const mockLoadFolderContent = jest.fn();
const mockUseDrive = jest.fn();

jest.mock('@internxt-mobile/hooks/drive', () => ({
  useDrive: () => mockUseDrive(),
}));

import { act, renderHook } from '@testing-library/react-native';
import { useLoadNextFolderPage } from './useLoadNextFolderPage';

const FOLDER_UUID = 'folder-uuid';

const arrangeHook = (folderNode: Record<string, unknown> | undefined) => {
  mockUseDrive.mockReturnValue({
    loadFolderContent: mockLoadFolderContent,
    driveFoldersTree: folderNode ? { [FOLDER_UUID]: folderNode } : {},
  });
  return renderHook(() => useLoadNextFolderPage(FOLDER_UUID));
};

describe('Loading the next page of a folder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadFolderContent.mockResolvedValue(undefined);
  });

  test('when the folder has more pages, then the next page is loaded without resetting the pagination', async () => {
    const { result } = arrangeHook({ loading: false, nextFoldersOffset: null, nextFilesOffset: 50 });

    await act(async () => {
      await result.current.loadNextPage();
    });

    expect(mockLoadFolderContent).toHaveBeenCalledWith(FOLDER_UUID, { pullFrom: ['network'], resetPagination: false });
    expect(result.current.isLoadingNextPage).toBe(false);
  });

  test('when a next page load is already running, then another one is not started', async () => {
    let finishLoad: () => void = () => undefined;
    mockLoadFolderContent.mockReturnValue(new Promise<void>((resolve) => (finishLoad = resolve)));
    const { result } = arrangeHook({ loading: false, nextFoldersOffset: null, nextFilesOffset: 50 });

    let firstLoad: Promise<void> = Promise.resolve();
    act(() => {
      firstLoad = result.current.loadNextPage();
    });
    await act(async () => {
      await result.current.loadNextPage();
    });

    expect(mockLoadFolderContent).toHaveBeenCalledTimes(1);
    expect(result.current.isLoadingNextPage).toBe(true);

    await act(async () => {
      finishLoad();
      await firstLoad;
    });
    expect(result.current.isLoadingNextPage).toBe(false);
  });

  test('when no pages are left, then nothing is loaded', async () => {
    const { result } = arrangeHook({ loading: false, nextFoldersOffset: null, nextFilesOffset: null });

    await act(async () => {
      await result.current.loadNextPage();
    });

    expect(mockLoadFolderContent).not.toHaveBeenCalled();
  });
});
