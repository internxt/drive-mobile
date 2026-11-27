import { startFilePreview } from '@internxt-mobile/hooks/drive/useOpenFilePreview';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { act, renderHook } from '@testing-library/react-native';
import { useAppDispatch } from 'src/store/hooks';
import { useActivePreviewFile } from './useActivePreviewFile';

jest.mock('@internxt-mobile/hooks/drive/useOpenFilePreview', () => ({
  startFilePreview: jest.fn(),
}));

jest.mock('src/store/hooks', () => ({
  useAppDispatch: jest.fn(),
}));

const startFilePreviewMock = startFilePreview as jest.Mock;
const useAppDispatchMock = useAppDispatch as jest.Mock;

const startedPreviewAction = { type: 'startFilePreview' };

const aDriveFile = (uuid: string): DriveItemData => ({
  uuid,
  name: uuid,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  isFolder: false,
});

const previewFiles = [aDriveFile('first-file'), aDriveFile('second-file'), aDriveFile('third-file')];

const arrangeHook = (initialIndex = 0) => {
  const dispatch = jest.fn();
  startFilePreviewMock.mockReturnValue(startedPreviewAction);
  useAppDispatchMock.mockReturnValue(dispatch);
  const rendered = renderHook(() => useActivePreviewFile(previewFiles, initialIndex));

  return { ...rendered, dispatch };
};

describe('Changing the file shown in the preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when the preview opens, then the opened file is the shown one', () => {
    const { result } = arrangeHook(1);

    expect(result.current.activeIndex).toBe(1);
    expect(result.current.activeFile.uuid).toBe('second-file');
  });

  test('when the user lands on another file, then that file starts', () => {
    const { result, dispatch } = arrangeHook(0);

    act(() => {
      result.current.changeActiveIndex(2);
    });

    expect(result.current.activeFile.uuid).toBe('third-file');
    expect(startFilePreviewMock).toHaveBeenCalledWith(previewFiles[2]);
    expect(dispatch).toHaveBeenCalledWith(startedPreviewAction);
  });

  test('when the list reports landing on the same file twice in a row, then that file starts once', () => {
    const { result } = arrangeHook(0);

    act(() => {
      result.current.changeActiveIndex(1);
      result.current.changeActiveIndex(1);
    });

    expect(startFilePreviewMock).toHaveBeenCalledTimes(1);
  });

  test('when the user stays on the same file, then nothing starts', () => {
    const { result } = arrangeHook(1);

    act(() => {
      result.current.changeActiveIndex(1);
    });

    expect(startFilePreviewMock).not.toHaveBeenCalled();
  });

  test('when the position is outside the list, then it is ignored', () => {
    const { result } = arrangeHook(0);

    act(() => {
      result.current.changeActiveIndex(previewFiles.length);
    });

    expect(result.current.activeIndex).toBe(0);
    expect(startFilePreviewMock).not.toHaveBeenCalled();
  });

  test('when the shown file is removed, then the next file is shown and starts', () => {
    const { result, dispatch } = arrangeHook(1);

    act(() => {
      result.current.removeFiles(['second-file']);
    });

    expect(result.current.previewFiles).toHaveLength(2);
    expect(result.current.activeFile.uuid).toBe('third-file');
    expect(result.current.activeIndex).toBe(1);
    expect(startFilePreviewMock).toHaveBeenCalledWith(previewFiles[2]);
    expect(dispatch).toHaveBeenCalledWith(startedPreviewAction);
  });

  test('when a file is removed, then the removal count goes up, and it stays when the file is not in the list', () => {
    const { result } = arrangeHook(1);

    act(() => {
      result.current.removeFiles(['unknown-file']);
    });
    expect(result.current.removalCount).toBe(0);

    act(() => {
      result.current.removeFiles(['second-file']);
    });
    expect(result.current.removalCount).toBe(1);
  });

  test('when a file that is not in the preview is removed, then it is still remembered as removed', () => {
    const { result } = arrangeHook(1);

    act(() => {
      result.current.removeFiles(['unknown-file']);
    });

    expect(result.current.removedFileUuids.has('unknown-file')).toBe(true);
  });

  test('when the shown last file is removed, then the previous file is shown and starts', () => {
    const { result, dispatch } = arrangeHook(2);

    act(() => {
      result.current.removeFiles(['third-file']);
    });

    expect(result.current.activeFile.uuid).toBe('second-file');
    expect(result.current.activeIndex).toBe(1);
    expect(startFilePreviewMock).toHaveBeenCalledWith(previewFiles[1]);
    expect(dispatch).toHaveBeenCalledWith(startedPreviewAction);
  });

  test('when several files are removed at once, including the shown one, then the closest remaining file before them is shown and starts', () => {
    const { result, dispatch } = arrangeHook(1);

    act(() => {
      result.current.removeFiles(['second-file', 'third-file']);
    });

    expect(result.current.previewFiles).toHaveLength(1);
    expect(result.current.activeIndex).toBe(0);
    expect(result.current.activeFile.uuid).toBe('first-file');
    expect(startFilePreviewMock).toHaveBeenCalledWith(previewFiles[0]);
    expect(dispatch).toHaveBeenCalledWith(startedPreviewAction);
  });

  test('when the only file is removed, then the list is empty', () => {
    const dispatch = jest.fn();
    useAppDispatchMock.mockReturnValue(dispatch);
    const { result } = renderHook(() => useActivePreviewFile([aDriveFile('only-file')], 0));

    act(() => {
      result.current.removeFiles(['only-file']);
    });

    expect(result.current.previewFiles).toHaveLength(0);
    expect(startFilePreviewMock).not.toHaveBeenCalled();
  });

  test('when a file before the shown one is removed, then the same file stays shown without starting again', () => {
    const { result } = arrangeHook(2);

    act(() => {
      result.current.removeFiles(['first-file']);
    });

    expect(result.current.activeFile.uuid).toBe('third-file');
    expect(result.current.activeIndex).toBe(1);
    expect(startFilePreviewMock).not.toHaveBeenCalled();
  });

  test('when a file is renamed, then the list shows the new name', () => {
    const { result } = arrangeHook(0);

    act(() => {
      result.current.updateFileName('second-file', 'renamed');
    });

    expect(result.current.previewFiles[1].name).toBe('renamed');
    expect(result.current.previewFiles[0].name).toBe('first-file');
  });

  test('when new files are appended, then they go at the end and the shown file stays', () => {
    const { result } = arrangeHook(1);

    act(() => {
      result.current.appendFiles([aDriveFile('fourth-file'), aDriveFile('fifth-file')]);
    });

    expect(result.current.previewFiles.map((previewFile) => previewFile.uuid)).toEqual([
      'first-file',
      'second-file',
      'third-file',
      'fourth-file',
      'fifth-file',
    ]);
    expect(result.current.activeFile.uuid).toBe('second-file');
    expect(result.current.removalCount).toBe(0);
  });

  test('when appended files are already in the list, then they are ignored', () => {
    const { result } = arrangeHook(0);

    act(() => {
      result.current.appendFiles([aDriveFile('second-file'), aDriveFile('fourth-file')]);
    });

    expect(result.current.previewFiles.map((previewFile) => previewFile.uuid)).toEqual([
      'first-file',
      'second-file',
      'third-file',
      'fourth-file',
    ]);
  });
});
