import { render } from '@testing-library/react-native';
import { DriveList } from '../components/DriveScreen/DriveList';
import { useFolderNavigation } from '../hooks/useFolderNavigation';
import { DriveScreen } from './DriveScreen';

jest.useFakeTimers();

jest.mock('tailwind-rn', () => ({
  useTailwind: () => () => ({}),
}));

jest.mock('../hooks/useFolderNavigation', () => ({
  useFolderNavigation: jest.fn(),
}));

jest.mock('../components/DriveScreen/DriveList', () => ({
  DriveList: jest.fn(() => null),
}));

const mockUseFolderNavigation = useFolderNavigation as jest.Mock;
const mockDriveList = DriveList as unknown as jest.Mock;

const renderDriveScreen = (navigation: Record<string, unknown> = {}) => {
  mockUseFolderNavigation.mockReturnValue({
    currentFolder: { uuid: 'root-uuid', name: 'Drive' },
    folders: [],
    files: [],
    loading: false,
    loadingMore: false,
    hasLoadError: false,
    hasLoadMoreError: false,
    isSessionExpired: false,
    loadMore: jest.fn(),
    retryLoadMore: jest.fn(),
    searchQuery: '',
    setSearchQuery: jest.fn(),
    viewMode: 'list',
    setViewMode: jest.fn(),
    breadcrumb: [{ uuid: 'root-uuid', name: 'Drive' }],
    navigate: jest.fn(),
    goBack: jest.fn(),
    refresh: jest.fn(),
    createFolder: jest.fn(),
    ...navigation,
  });

  render(
    <DriveScreen
      sharedFiles={[]}
      rootFolderUuid="root-uuid"
      uploadStatus="idle"
      uploadErrorType={null}
      onClose={jest.fn()}
      onSave={jest.fn()}
      onViewInFolder={jest.fn()}
      onDismissError={jest.fn()}
    />,
  );
};

describe('DriveScreen', () => {
  test('when the folder failed to load, then the list shows the error and retrying reloads the folder', () => {
    const refresh = jest.fn();
    const retryLoadMore = jest.fn();

    renderDriveScreen({ hasLoadError: true, refresh, retryLoadMore });

    expect(mockDriveList.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({ hasLoadError: true, onRetry: refresh, onRetryLoadMore: retryLoadMore }),
    );
  });
});
