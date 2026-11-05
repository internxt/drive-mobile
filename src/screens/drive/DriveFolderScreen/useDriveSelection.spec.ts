import { act, renderHook } from '@testing-library/react-native';
import { getSelectionCheckState, useDriveSelection } from './useDriveSelection';

const FOLDER_ITEM_UUIDS = ['folder-1', 'file-1', 'file-2'];

type HookProps = {
  folderItemUuids: string[];
  visibleItemUuids: string[];
  hasUnloadedItems: boolean;
  loadRemainingItems: () => Promise<void>;
};

const renderSelection = (overrides: Partial<HookProps> = {}) => {
  const initialProps: HookProps = {
    folderItemUuids: FOLDER_ITEM_UUIDS,
    visibleItemUuids: FOLDER_ITEM_UUIDS,
    hasUnloadedItems: false,
    loadRemainingItems: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return renderHook((props: HookProps) => useDriveSelection(props), { initialProps });
};

describe('Selecting items in a Drive folder', () => {
  test('when an item is long pressed, then selection starts with only that item selected', () => {
    const { result } = renderSelection();

    act(() => result.current.enterSelectionMode('file-1'));

    expect(result.current.isSelectionMode).toBe(true);
    expect([...result.current.selectedUuids]).toStrictEqual(['file-1']);
  });

  test('when selection starts from the select button, then it opens with nothing selected', () => {
    const { result } = renderSelection();

    act(() => result.current.enterSelectionMode());

    expect(result.current.isSelectionMode).toBe(true);
    expect(result.current.selectedUuids.size).toBe(0);
  });

  test('when a selected item is tapped again, then it is deselected and selection stays open', () => {
    const { result } = renderSelection();
    act(() => result.current.enterSelectionMode('file-1'));

    act(() => result.current.toggleSelection('file-1'));

    expect(result.current.selectedUuids.size).toBe(0);
    expect(result.current.isSelectionMode).toBe(true);
  });

  test('when selection is cancelled, then nothing stays selected', () => {
    const { result } = renderSelection();
    act(() => result.current.enterSelectionMode('file-1'));

    act(() => result.current.exitSelectionMode());

    expect(result.current.isSelectionMode).toBe(false);
    expect(result.current.selectedUuids.size).toBe(0);
  });

  test('when everything is loaded and select all is pressed, then every item is selected', async () => {
    const { result } = renderSelection();
    act(() => result.current.enterSelectionMode('file-1'));

    await act(() => result.current.toggleSelectAll());

    expect([...result.current.selectedUuids].sort()).toStrictEqual([...FOLDER_ITEM_UUIDS].sort());
    expect(result.current.selectionCheckState).toBe('all');
  });

  test('when everything is selected and select all is pressed, then everything is deselected', async () => {
    const { result } = renderSelection();
    act(() => result.current.enterSelectionMode('file-1'));
    await act(() => result.current.toggleSelectAll());

    await act(() => result.current.toggleSelectAll());

    expect(result.current.selectedUuids.size).toBe(0);
  });

  test('when a search is active and select all is pressed, then only the matching items are selected', async () => {
    const { result } = renderSelection({ visibleItemUuids: ['file-2'] });
    act(() => result.current.enterSelectionMode('file-2'));
    act(() => result.current.toggleSelection('file-2'));

    await act(() => result.current.toggleSelectAll());

    expect([...result.current.selectedUuids]).toStrictEqual(['file-2']);
  });

  test('when the folder has pages not loaded yet, then select all loads them and selects every item afterwards', async () => {
    const allFolderItemUuids = [...FOLDER_ITEM_UUIDS, 'file-3'];
    const loadRemainingItems = jest.fn();
    const { result, rerender } = renderSelection({ hasUnloadedItems: true, loadRemainingItems });
    loadRemainingItems.mockImplementation(async () => {
      rerender({
        folderItemUuids: allFolderItemUuids,
        visibleItemUuids: allFolderItemUuids,
        hasUnloadedItems: false,
        loadRemainingItems,
      });
    });
    act(() => result.current.enterSelectionMode('file-1'));

    await act(() => result.current.toggleSelectAll());

    expect(loadRemainingItems).toHaveBeenCalledTimes(1);
    expect([...result.current.selectedUuids].sort()).toStrictEqual([...allFolderItemUuids].sort());
    expect(result.current.isSelectingAll).toBe(false);
  });

  test('when loading the remaining pages is interrupted, then the loading stops and the selection is unchanged', async () => {
    const { result } = renderSelection({ hasUnloadedItems: true });
    act(() => result.current.enterSelectionMode('file-1'));

    await act(() => result.current.toggleSelectAll());

    expect(result.current.isSelectingAll).toBe(false);
    expect([...result.current.selectedUuids]).toStrictEqual(['file-1']);
  });

  test('when loading the remaining pages fails, then the error reaches the caller and the selection is unchanged', async () => {
    const loadError = new Error('Network error');
    const { result } = renderSelection({
      hasUnloadedItems: true,
      loadRemainingItems: jest.fn().mockRejectedValue(loadError),
    });
    act(() => result.current.enterSelectionMode('file-1'));

    await act(async () => {
      await expect(result.current.toggleSelectAll()).rejects.toBe(loadError);
    });

    expect(result.current.isSelectingAll).toBe(false);
    expect([...result.current.selectedUuids]).toStrictEqual(['file-1']);
  });

  test('when a selected item leaves the folder, then it is no longer selected', () => {
    const { result, rerender } = renderSelection();
    act(() => result.current.enterSelectionMode('file-1'));
    act(() => result.current.toggleSelection('file-2'));

    rerender({
      folderItemUuids: ['folder-1', 'file-2'],
      visibleItemUuids: ['folder-1', 'file-2'],
      hasUnloadedItems: false,
      loadRemainingItems: jest.fn(),
    });

    expect([...result.current.selectedUuids]).toStrictEqual(['file-2']);
  });

  test('when a search hides a selected item, then it stays selected', () => {
    const { result, rerender } = renderSelection();
    act(() => result.current.enterSelectionMode('file-1'));

    rerender({
      folderItemUuids: FOLDER_ITEM_UUIDS,
      visibleItemUuids: ['file-2'],
      hasUnloadedItems: false,
      loadRemainingItems: jest.fn(),
    });

    expect([...result.current.selectedUuids]).toStrictEqual(['file-1']);
  });
});

describe('State of the select all checkbox', () => {
  test('when no visible item is selected, then it is empty', () => {
    expect(getSelectionCheckState(new Set(['file-1']), ['file-2'], false)).toBe('none');
  });

  test('when some visible items are selected, then it is partial', () => {
    expect(getSelectionCheckState(new Set(['file-1']), ['file-1', 'file-2'], false)).toBe('some');
  });

  test('when every visible item is selected, then it is checked', () => {
    expect(getSelectionCheckState(new Set(['file-1', 'file-2']), ['file-1', 'file-2'], false)).toBe('all');
  });

  test('when every loaded item is selected but the folder has more pages, then it is partial', () => {
    expect(getSelectionCheckState(new Set(['file-1', 'file-2']), ['file-1', 'file-2'], true)).toBe('some');
  });
});
