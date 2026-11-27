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
});
