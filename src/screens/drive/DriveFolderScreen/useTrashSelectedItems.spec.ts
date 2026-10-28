const mockLoadFolderContent = jest.fn();
const mockMoveItemsToTrash = jest.fn();
const mockRestoreDriveItems = jest.fn();

jest.mock('@internxt-mobile/hooks/drive', () => ({
  useDrive: () => ({ loadFolderContent: mockLoadFolderContent }),
}));

jest.mock('@internxt-mobile/services/native/InternxtSignalingModule', () => ({
  notifyParentChanged: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@internxt-mobile/useCases/drive', () => ({
  moveItemsToTrash: (...args: unknown[]) => mockMoveItemsToTrash(...args),
  restoreDriveItems: (...args: unknown[]) => mockRestoreDriveItems(...args),
}));

jest.mock('src/helpers/services', () => ({
  SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET: jest
    .fn()
    .mockResolvedValue(undefined),
}));

import { notifyParentChanged } from '@internxt-mobile/services/native/InternxtSignalingModule';
import { DriveItemStatus, DriveListItem } from '@internxt-mobile/types/drive/item';
import { act, renderHook } from '@testing-library/react-native';
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
    mockMoveItemsToTrash.mockResolvedValue({ success: true, data: null });
    mockRestoreDriveItems.mockResolvedValue({ success: true, data: {} });
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

  test('when the items reach the trash, then the selection closes and the folder is reloaded', async () => {
    const { result, onTrashed } = renderTrashHook();

    await act(() => result.current.trashItems([SELECTED_FOLDER, SELECTED_FILE]));

    expect(onTrashed).toHaveBeenCalledTimes(1);
    expect(notifyParentChanged).toHaveBeenCalledTimes(1);
    expect(notifyParentChanged).toHaveBeenCalledWith(CURRENT_FOLDER_UUID);
    expect(mockLoadFolderContent).toHaveBeenCalledWith(CURRENT_FOLDER_UUID, {
      pullFrom: ['network'],
      resetPagination: true,
    });
  });

  test('when the items cannot be moved to the trash, then the selection stays as it was', async () => {
    mockMoveItemsToTrash.mockResolvedValue({ success: false, error: new Error('network') });
    const { result, onTrashed } = renderTrashHook();

    await act(() => result.current.trashItems([SELECTED_FOLDER, SELECTED_FILE]));

    expect(onTrashed).not.toHaveBeenCalled();
    expect(result.current.isTrashing).toBe(false);
  });

  test('when the move is undone, then each item goes back to the folder it came from', async () => {
    const { result } = renderTrashHook();
    await act(() => result.current.trashItems([SELECTED_FOLDER, SELECTED_FILE]));
    const undo = mockMoveItemsToTrash.mock.calls[0][1];

    await act(() => undo());

    expect(mockRestoreDriveItems).toHaveBeenCalledWith(
      [
        { fileId: undefined, folderId: 'folder-1', destinationFolderId: CURRENT_FOLDER_UUID },
        { fileId: 'file-1', folderId: undefined, destinationFolderId: CURRENT_FOLDER_UUID },
      ],
      { displayNotification: false },
    );
  });
});
