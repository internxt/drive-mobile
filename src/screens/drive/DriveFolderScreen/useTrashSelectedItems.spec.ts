const mockLoadFolderContent = jest.fn();
const mockRemoveItemFromTree = jest.fn();
const mockReportError = jest.fn();
const mockMoveItemsToTrash = jest.fn();
const mockRestoreDriveItems = jest.fn();

jest.mock('@internxt-mobile/hooks/drive', () => ({
  useDrive: () => ({ loadFolderContent: mockLoadFolderContent, removeItemFromTree: mockRemoveItemFromTree }),
}));

jest.mock('@internxt-mobile/services/native/InternxtSignalingModule', () => ({
  notifyParentChanged: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@internxt-mobile/useCases/drive', () => ({
  moveItemsToTrash: (...args: unknown[]) => mockMoveItemsToTrash(...args),
  restoreDriveItems: (...args: unknown[]) => mockRestoreDriveItems(...args),
}));

jest.mock('@internxt-mobile/services/ErrorService', () => ({
  __esModule: true,
  default: { reportError: (...args: unknown[]) => mockReportError(...args) },
}));

jest.mock('src/helpers/services', () => ({
  SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET: jest
    .fn()
    .mockResolvedValue(undefined),
}));

import { notifyParentChanged } from '@internxt-mobile/services/native/InternxtSignalingModule';
import { DriveItemStatus, DriveListItem } from '@internxt-mobile/types/drive/item';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useTrashSelectedItems } from './useTrashSelectedItems';

const CURRENT_FOLDER_UUID = 'current-folder';

const buildListItem = (data: Partial<DriveListItem['data']>): DriveListItem => ({
  id: data.uuid ?? 'item-1',
  status: DriveItemStatus.Idle,
  data: {
    uuid: 'item-1',
    name: 'item',
    createdAt: '2025-02-16T00:00:00.000Z',
    updatedAt: '2025-02-16T00:00:00.000Z',
    isFolder: false,
    ...data,
  },
});

const SELECTED_FOLDER = buildListItem({ uuid: 'folder-1', isFolder: true, parentUuid: CURRENT_FOLDER_UUID });
const SELECTED_FILE = buildListItem({ uuid: 'file-1', type: 'pdf', folderUuid: CURRENT_FOLDER_UUID });

const renderTrashHook = () => {
  const onTrashed = jest.fn();
  const { result } = renderHook(() => useTrashSelectedItems({ folderUuid: CURRENT_FOLDER_UUID, onTrashed }));
  return { result, onTrashed };
};

describe('Moving the selected Drive items to the trash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMoveItemsToTrash.mockResolvedValue({ success: true, data: { trashedUuids: ['folder-1', 'file-1'] } });
    mockRestoreDriveItems.mockResolvedValue({ success: true, data: { restoredCount: 2 } });
  });

  test('when the selected items are moved to the trash, then every one is sent with its type', async () => {
    const { result } = renderTrashHook();

    await act(() => result.current.trashItems([SELECTED_FOLDER, SELECTED_FILE]));

    expect(mockMoveItemsToTrash).toHaveBeenCalledWith(
      [
        { uuid: 'folder-1', type: 'folder' },
        { uuid: 'file-1', type: 'file' },
      ],
      expect.any(Function),
    );
  });

  test('when the items reach the trash, then they leave the folder and the selection closes', async () => {
    const { result, onTrashed } = renderTrashHook();

    await act(() => result.current.trashItems([SELECTED_FOLDER, SELECTED_FILE]));

    expect(onTrashed).toHaveBeenCalledTimes(1);
    expect(mockRemoveItemFromTree).toHaveBeenCalledWith(CURRENT_FOLDER_UUID, 'folder-1');
    expect(mockRemoveItemFromTree).toHaveBeenCalledWith(CURRENT_FOLDER_UUID, 'file-1');
    expect(notifyParentChanged).toHaveBeenCalledTimes(1);
    expect(notifyParentChanged).toHaveBeenCalledWith(CURRENT_FOLDER_UUID);
    expect(mockLoadFolderContent).not.toHaveBeenCalled();
  });

  test('when the items cannot be moved to the trash, then the folder and the selection stay as they were', async () => {
    mockMoveItemsToTrash.mockResolvedValue({ success: false, error: new Error('network'), data: { trashedUuids: [] } });
    const { result, onTrashed } = renderTrashHook();

    await act(() => result.current.trashItems([SELECTED_FOLDER, SELECTED_FILE]));

    expect(onTrashed).not.toHaveBeenCalled();
    expect(mockRemoveItemFromTree).not.toHaveBeenCalled();
    expect(mockLoadFolderContent).not.toHaveBeenCalled();
    expect(result.current.isTrashing).toBe(false);
  });

  test('when only some of the items reach the trash, then only those leave the folder and the rest stay selected', async () => {
    mockMoveItemsToTrash.mockResolvedValue({
      success: false,
      error: new Error('network'),
      data: { trashedUuids: ['folder-1'] },
    });
    const { result, onTrashed } = renderTrashHook();

    await act(() => result.current.trashItems([SELECTED_FOLDER, SELECTED_FILE]));

    expect(mockRemoveItemFromTree).toHaveBeenCalledTimes(1);
    expect(mockRemoveItemFromTree).toHaveBeenCalledWith(CURRENT_FOLDER_UUID, 'folder-1');
    expect(onTrashed).not.toHaveBeenCalled();
  });

  test('when the move is undone, then each item goes back to the folder it came from', async () => {
    const { result } = renderTrashHook();
    await act(() => result.current.trashItems([SELECTED_FOLDER, SELECTED_FILE]));
    const undo = mockMoveItemsToTrash.mock.calls[0][1];

    act(() => undo());

    await waitFor(() => expect(mockLoadFolderContent).toHaveBeenCalledTimes(1));
    expect(mockRestoreDriveItems).toHaveBeenCalledWith(
      [
        { fileId: undefined, folderId: 'folder-1', destinationFolderId: CURRENT_FOLDER_UUID },
        { fileId: 'file-1', folderId: undefined, destinationFolderId: CURRENT_FOLDER_UUID },
      ],
      { displayNotification: false },
    );
  });

  test('when undoing brings back only some of the items, then the folder is reloaded to show them', async () => {
    mockRestoreDriveItems.mockResolvedValue({ success: false, error: new Error('network'), data: { restoredCount: 1 } });
    const { result } = renderTrashHook();
    await act(() => result.current.trashItems([SELECTED_FOLDER, SELECTED_FILE]));
    const undo = mockMoveItemsToTrash.mock.calls[0][1];

    act(() => undo());

    await waitFor(() => expect(mockLoadFolderContent).toHaveBeenCalledTimes(1));
  });

  test('when undoing brings back none of the items, then the folder is left as it is', async () => {
    mockRestoreDriveItems.mockResolvedValue({ success: false, error: new Error('network'), data: { restoredCount: 0 } });
    const { result } = renderTrashHook();
    await act(() => result.current.trashItems([SELECTED_FOLDER, SELECTED_FILE]));
    const undo = mockMoveItemsToTrash.mock.calls[0][1];

    act(() => undo());

    await waitFor(() => expect(mockRestoreDriveItems).toHaveBeenCalledTimes(1));
    expect(mockLoadFolderContent).not.toHaveBeenCalled();
  });

  test('when the folder cannot be reloaded after undoing, then the error is reported', async () => {
    const reloadError = new Error('network');
    mockLoadFolderContent.mockRejectedValueOnce(reloadError);
    const { result } = renderTrashHook();
    await act(() => result.current.trashItems([SELECTED_FOLDER, SELECTED_FILE]));
    const undo = mockMoveItemsToTrash.mock.calls[0][1];

    act(() => undo());

    await waitFor(() => expect(mockReportError).toHaveBeenCalledWith(reloadError));
  });
});
