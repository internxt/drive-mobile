import { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FlatList, StyleSheet } from 'react-native';
import strings from '../../../../assets/lang/strings';
import { DriveList, DriveListItem } from './DriveList';

jest.mock('tailwind-rn', () => ({
  useTailwind: () => () => ({}),
}));

jest.mock('src/components/DriveItemSkinSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <View testID="drive-item-skeleton" /> };
});

jest.mock('../FileListItem', () => {
  const { Text } = jest.requireActual('react-native');
  return { FileListItem: ({ item }: { item: { plainName: string } }) => <Text>{item.plainName}</Text> };
});

const SKELETON_TEST_ID = 'drive-item-skeleton';
const BOTTOM_INSET = 130;
const LOADED_FOLDER: DriveListItem = {
  type: 'folder',
  data: { uuid: 'folder-uuid', plainName: 'Invoices', updatedAt: '' },
};
const NEXT_PAGE_FAILED = { listData: [LOADED_FOLDER], hasLoadMoreError: true };

const renderDriveList = (overrides: Partial<ComponentProps<typeof DriveList>> = {}) => {
  const onRetry = jest.fn();
  const onRetryLoadMore = jest.fn();
  render(
    <DriveList
      listData={[]}
      viewMode="list"
      loading={false}
      loadingMore={false}
      searchQuery=""
      bottomInset={BOTTOM_INSET}
      hasLoadError={false}
      hasLoadMoreError={false}
      isSessionExpired={false}
      onRetry={onRetry}
      onRetryLoadMore={onRetryLoadMore}
      onNavigate={jest.fn()}
      onLoadMore={jest.fn()}
      {...overrides}
    />,
  );
  return { onRetry, onRetryLoadMore };
};

describe('DriveList', () => {
  test('when the folder failed to load and retry is pressed, then an error message and a retry action are shown instead of the empty message and a reload is requested once', () => {
    const { onRetry } = renderDriveList({ hasLoadError: true, loadingMore: true, searchQuery: 'report' });

    expect(screen.getByText(strings.screens.ShareExtension.folderLoadError)).toBeTruthy();
    expect(screen.getByText(strings.buttons.tryAgain)).toBeTruthy();
    expect(screen.queryByText(strings.screens.ShareExtension.emptyFolder)).toBeNull();
    expect(screen.queryByText(strings.screens.ShareExtension.noResults)).toBeNull();
    expect(screen.queryByTestId(SKELETON_TEST_ID)).toBeNull();

    fireEvent.press(screen.getByText(strings.buttons.tryAgain));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('when the folder is empty and loaded without error, then the empty message is shown without a loading placeholder', () => {
    renderDriveList();

    expect(screen.getByText(strings.screens.ShareExtension.emptyFolder)).toBeTruthy();
    expect(screen.queryByText(strings.screens.ShareExtension.folderLoadError)).toBeNull();
    expect(screen.queryByTestId(SKELETON_TEST_ID)).toBeNull();
  });

  test('when the folders loaded but the files failed on the first load and retry is pressed, then the folders stay visible with a retry row and the next page is retried once', () => {
    const { onRetry, onRetryLoadMore } = renderDriveList(NEXT_PAGE_FAILED);

    expect(screen.getByText(LOADED_FOLDER.data.plainName)).toBeTruthy();
    expect(screen.getByText(strings.screens.ShareExtension.folderLoadError)).toBeTruthy();
    expect(screen.queryByText(strings.screens.ShareExtension.emptyFolder)).toBeNull();

    fireEvent.press(screen.getByText(strings.buttons.tryAgain));

    expect(onRetryLoadMore).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  test.each([
    ['the first load', { hasLoadError: true }],
    ['a next page', NEXT_PAGE_FAILED],
  ])(
    'when %s fails because the session expired, then the session expired message is shown without a retry action',
    (_failedLoad, overrides) => {
      renderDriveList({ ...overrides, isSessionExpired: true });

      expect(screen.getByText(strings.screens.ShareExtension.errorSessionExpired)).toBeTruthy();
      expect(screen.queryByText(strings.screens.ShareExtension.folderLoadError)).toBeNull();
      expect(screen.queryByText(strings.buttons.tryAgain)).toBeNull();
    },
  );

  test.each(['list', 'grid'] as const)(
    'when the list is shown in %s mode, then its content is padded so the last row and the footer scroll above the bottom panel',
    (viewMode) => {
      renderDriveList({ ...NEXT_PAGE_FAILED, viewMode });

      expect(StyleSheet.flatten(screen.UNSAFE_getByType(FlatList).props.contentContainerStyle)).toEqual(
        expect.objectContaining({ paddingBottom: BOTTOM_INSET }),
      );
    },
  );
});
