const mockLoadFolderContent = jest.fn();
const mockUseDrive = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock('@internxt-mobile/hooks/drive', () => ({
  useDrive: () => mockUseDrive(),
}));

jest.mock('@internxt-mobile/services/ErrorService', () => ({
  __esModule: true,
  default: { reportError: jest.fn(), castError: jest.fn(() => ({ message: 'error' })) },
}));

jest.mock('@internxt-mobile/services/NotificationsService', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

import { SortDirection, SortMode, SortType } from '@internxt-mobile/types/drive/ui';
import { renderHook } from '@testing-library/react-native';
import { useReloadFolderInChosenSort } from './useReloadFolderInChosenSort';

const FOLDER_UUID = 'folder-uuid';
const BY_NAME: SortMode = { type: SortType.Name, direction: SortDirection.Asc };
const NEWER_FIRST: SortMode = { type: SortType.UpdatedAt, direction: SortDirection.Asc };

const mockDriveContext = ({
  chosenSortMode,
  loadedSortMode,
  isLoading = false,
  loadError,
}: {
  chosenSortMode: SortMode;
  loadedSortMode?: SortMode;
  isLoading?: boolean;
  loadError?: Error;
}) => {
  mockUseDrive.mockReturnValue({
    sortMode: chosenSortMode,
    loadFolderContent: mockLoadFolderContent,
    driveFoldersTree: { [FOLDER_UUID]: { sortMode: loadedSortMode, loading: isLoading, error: loadError } },
  });
};

describe('Reloading a Drive folder in the chosen order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadFolderContent.mockResolvedValue(undefined);
  });

  test('when the folder was loaded in another order, then it is loaded again from the first page', () => {
    mockDriveContext({ chosenSortMode: NEWER_FIRST, loadedSortMode: BY_NAME });

    renderHook(() => useReloadFolderInChosenSort(FOLDER_UUID));

    expect(mockLoadFolderContent).toHaveBeenCalledWith(FOLDER_UUID, {
      pullFrom: ['network'],
      resetPagination: true,
    });
  });

  test('when the folder was loaded in the chosen order, then it is not loaded again', () => {
    mockDriveContext({ chosenSortMode: NEWER_FIRST, loadedSortMode: NEWER_FIRST });

    renderHook(() => useReloadFolderInChosenSort(FOLDER_UUID));

    expect(mockLoadFolderContent).not.toHaveBeenCalled();
  });

  test('when the folder has not been loaded yet, then it is not loaded from here', () => {
    mockDriveContext({ chosenSortMode: NEWER_FIRST });

    renderHook(() => useReloadFolderInChosenSort(FOLDER_UUID));

    expect(mockLoadFolderContent).not.toHaveBeenCalled();
  });

  test('when a load in another order is still in progress, then the folder is loaded again once it ends', () => {
    mockDriveContext({ chosenSortMode: NEWER_FIRST, loadedSortMode: BY_NAME, isLoading: true });
    const { rerender } = renderHook(() => useReloadFolderInChosenSort(FOLDER_UUID));

    expect(mockLoadFolderContent).not.toHaveBeenCalled();

    mockDriveContext({ chosenSortMode: NEWER_FIRST, loadedSortMode: BY_NAME, isLoading: false });
    rerender({});

    expect(mockLoadFolderContent).toHaveBeenCalledTimes(1);
  });

  test('when the folder failed to load in another order, then it is not loaded again on its own', () => {
    mockDriveContext({ chosenSortMode: NEWER_FIRST, loadedSortMode: BY_NAME, loadError: new Error('Network error') });

    renderHook(() => useReloadFolderInChosenSort(FOLDER_UUID));

    expect(mockLoadFolderContent).not.toHaveBeenCalled();
  });

  test('when reloading in the chosen order fails, then it is not tried again', () => {
    mockDriveContext({ chosenSortMode: NEWER_FIRST, loadedSortMode: BY_NAME });
    const { rerender } = renderHook(() => useReloadFolderInChosenSort(FOLDER_UUID));

    mockDriveContext({ chosenSortMode: NEWER_FIRST, loadedSortMode: BY_NAME, isLoading: true });
    rerender({});
    mockDriveContext({ chosenSortMode: NEWER_FIRST, loadedSortMode: BY_NAME, loadError: new Error('Network error') });
    rerender({});

    expect(mockLoadFolderContent).toHaveBeenCalledTimes(1);
  });
});
