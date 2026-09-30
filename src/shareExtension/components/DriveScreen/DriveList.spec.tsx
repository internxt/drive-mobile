import { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import strings from '../../../../assets/lang/strings';
import { DriveList } from './DriveList';

jest.mock('tailwind-rn', () => ({
  useTailwind: () => () => ({}),
}));

jest.mock('src/components/DriveItemSkinSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <View testID="drive-item-skeleton" /> };
});

jest.mock('../FileListItem', () => ({
  FileListItem: () => null,
}));

const SKELETON_TEST_ID = 'drive-item-skeleton';

const renderDriveList = (overrides: Partial<ComponentProps<typeof DriveList>> = {}) => {
  const onRetry = jest.fn();
  render(
    <DriveList
      listData={[]}
      viewMode="list"
      loading={false}
      loadingMore={false}
      searchQuery=""
      hasLoadError={false}
      onRetry={onRetry}
      onNavigate={jest.fn()}
      onLoadMore={jest.fn()}
      {...overrides}
    />,
  );
  return { onRetry };
};

describe('DriveList', () => {
  test('when the folder failed to load and retry is pressed, then an error message and a retry action are shown instead of the empty message and a reload is requested once', () => {
    const { onRetry } = renderDriveList({ hasLoadError: true, loadingMore: true, searchQuery: 'report' });

    expect(screen.getByText(strings.screens.ShareExtension.folderLoadError)).toBeTruthy();
    expect(screen.getByText(strings.screens.ShareExtension.retry)).toBeTruthy();
    expect(screen.queryByText(strings.screens.ShareExtension.emptyFolder)).toBeNull();
    expect(screen.queryByText(strings.screens.ShareExtension.noResults)).toBeNull();
    expect(screen.queryByTestId(SKELETON_TEST_ID)).toBeNull();

    fireEvent.press(screen.getByText(strings.screens.ShareExtension.retry));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('when the folder is empty and loaded without error, then the empty message is shown without a loading placeholder', () => {
    renderDriveList();

    expect(screen.getByText(strings.screens.ShareExtension.emptyFolder)).toBeTruthy();
    expect(screen.queryByText(strings.screens.ShareExtension.folderLoadError)).toBeNull();
    expect(screen.queryByTestId(SKELETON_TEST_ID)).toBeNull();
  });

  describe('share extension texts', () => {
    afterEach(() => strings.setLanguage('en'));

    test.each(['en', 'es'])(
      'when the share extension texts are read in every language, then the folder error and retry texts exist (%s)',
      (language) => {
        strings.setLanguage(language);

        expect(strings.screens.ShareExtension.folderLoadError).toEqual(expect.stringMatching(/\S/));
        expect(strings.screens.ShareExtension.retry).toEqual(expect.stringMatching(/\S/));
      },
    );
  });
});
