import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { renderHook } from '@testing-library/react-native';
import { useAppSelector } from 'src/store/hooks';
import { onDriveItemMoved } from 'src/useCases/drive/onDriveItemMoved';
import { onDriveItemsTrashed } from 'src/useCases/drive/onDriveItemsTrashed';
import { useSyncPreviewFilesWithDrive } from './useSyncPreviewFilesWithDrive';

jest.mock('src/store/hooks', () => ({
  useAppSelector: jest.fn(),
}));

jest.mock('src/useCases/drive/onDriveItemMoved', () => ({
  onDriveItemMoved: jest.fn(),
}));

jest.mock('src/useCases/drive/onDriveItemsTrashed', () => ({
  onDriveItemsTrashed: jest.fn(),
}));

const useAppSelectorMock = useAppSelector as jest.Mock;
const onDriveItemMovedMock = onDriveItemMoved as jest.Mock;
const onDriveItemsTrashedMock = onDriveItemsTrashed as jest.Mock;

const aDriveFile = (uuid: string, name = uuid): DriveItemData => ({
  uuid,
  name,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  isFolder: false,
});

const arrangeHook = (focusedItem?: DriveItemData) => {
  const removeFiles = jest.fn();
  const updateFileName = jest.fn();
  const unsubscribeMoved = jest.fn();
  const unsubscribeTrashed = jest.fn();
  let movedListener: (result: { movedUuids: string[] }) => void = () => undefined;
  let trashedListener: (result: { trashedUuids: string[] }) => void = () => undefined;
  useAppSelectorMock.mockImplementation((selector) => selector({ drive: { focusedItem } }));
  onDriveItemMovedMock.mockImplementation((listener) => {
    movedListener = listener;
    return unsubscribeMoved;
  });
  onDriveItemsTrashedMock.mockImplementation((listener) => {
    trashedListener = listener;
    return unsubscribeTrashed;
  });
  const rendered = renderHook(() =>
    useSyncPreviewFilesWithDrive({ activeFile: aDriveFile('active-file', 'old name'), removeFiles, updateFileName }),
  );

  return {
    ...rendered,
    removeFiles,
    updateFileName,
    unsubscribeMoved,
    unsubscribeTrashed,
    emitMoved: (movedUuids: string[]) => movedListener({ movedUuids }),
    emitTrashed: (trashedUuids: string[]) => trashedListener({ trashedUuids }),
  };
};

describe('Keeping the preview files in sync with the drive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when a file is moved out of the folder, then it is removed from the preview list', () => {
    const { emitMoved, removeFiles } = arrangeHook();

    emitMoved(['moved-file']);

    expect(removeFiles).toHaveBeenCalledWith(['moved-file']);
  });

  test('when files are sent to the trash, then they are removed from the preview list', () => {
    const { emitTrashed, removeFiles } = arrangeHook();

    emitTrashed(['first-file', 'second-file']);

    expect(removeFiles).toHaveBeenCalledWith(['first-file', 'second-file']);
  });

  test('when the active file is renamed, then the preview list gets the new name', () => {
    const { updateFileName } = arrangeHook(aDriveFile('active-file', 'new name'));

    expect(updateFileName).toHaveBeenCalledWith('active-file', 'new name');
  });

  test('when another file is renamed, then the preview list is not changed', () => {
    const { updateFileName } = arrangeHook(aDriveFile('other-file', 'new name'));

    expect(updateFileName).not.toHaveBeenCalled();
  });

  test('when the shown file is renamed while the preview is open, then its new name is applied', () => {
    let focusedItem: DriveItemData | undefined = aDriveFile('active-file', 'old name');
    const removeFiles = jest.fn();
    const updateFileName = jest.fn();
    useAppSelectorMock.mockImplementation((selector) => selector({ drive: { focusedItem } }));
    const { rerender } = renderHook(() =>
      useSyncPreviewFilesWithDrive({ activeFile: aDriveFile('active-file', 'old name'), removeFiles, updateFileName }),
    );

    expect(updateFileName).not.toHaveBeenCalled();

    focusedItem = aDriveFile('active-file', 'new name');
    rerender({});

    expect(updateFileName).toHaveBeenCalledWith('active-file', 'new name');
  });

  test('when the user moves to another file and that file is renamed, then the new name goes to that file', () => {
    let focusedItem: DriveItemData | undefined = aDriveFile('active-file', 'old name');
    let activeFile = aDriveFile('active-file', 'old name');
    const removeFiles = jest.fn();
    const updateFileName = jest.fn();
    useAppSelectorMock.mockImplementation((selector) => selector({ drive: { focusedItem } }));
    const { rerender } = renderHook(() => useSyncPreviewFilesWithDrive({ activeFile, removeFiles, updateFileName }));

    activeFile = aDriveFile('other-file', 'other name');
    rerender({});

    expect(updateFileName).not.toHaveBeenCalled();

    focusedItem = aDriveFile('other-file', 'new name');
    rerender({});

    expect(updateFileName).toHaveBeenCalledTimes(1);
    expect(updateFileName).toHaveBeenCalledWith('other-file', 'new name');
  });

  test('when the preview unmounts, then it stops listening for moved and trashed files', () => {
    const { unmount, unsubscribeMoved, unsubscribeTrashed } = arrangeHook();

    unmount();

    expect(unsubscribeMoved).toHaveBeenCalledTimes(1);
    expect(unsubscribeTrashed).toHaveBeenCalledTimes(1);
  });
});
