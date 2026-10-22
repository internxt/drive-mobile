import { render } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';

import { DriveItemStatus, DriveListItem } from '../../../../types/drive/item';
import { DriveListViewMode } from '../../../../types/drive/ui';
import DriveList from './DriveList';

jest.mock('tailwind-rn', () => ({ useTailwind: () => () => ({}) }));

jest.mock('../../../../hooks/useColor', () => ({
  __esModule: true,
  default: () => () => '#000000',
}));

jest.mock('@internxt-mobile/useCases/drive', () => ({
  onDriveItemTrashed: jest.fn(() => jest.fn()),
  onDriveItemRestored: jest.fn(() => jest.fn()),
}));

jest.mock('../items/DriveListModeItem', () => {
  const { Text } = jest.requireActual('react-native');
  return { DriveListModeItem: ({ data }: { data: { name: string } }) => <Text>{data.name}</Text> };
});

jest.mock('../items/DriveGridModeItem', () => {
  const { Text } = jest.requireActual('react-native');
  return { DriveGridModeItem: ({ data }: { data: { name: string } }) => <Text>{data.name}</Text> };
});

const aFile = (name: string): DriveListItem => ({
  id: name,
  status: DriveItemStatus.Idle,
  data: {
    uuid: `${name}-uuid`,
    name,
    isFolder: false,
    createdAt: '2026-10-22T10:00:00.000Z',
    updatedAt: '2026-10-22T10:00:00.000Z',
    thumbnails: [],
    currentThumbnail: null,
  },
});

const renderListOfFiles = (isLoadingMore: boolean) =>
  render(
    <DriveList
      items={[aFile('report.pdf'), aFile('notes.txt')]}
      viewMode={DriveListViewMode.List}
      isLoadingMore={isLoadingMore}
      onDriveItemPress={jest.fn()}
      onDriveItemActionsPress={jest.fn()}
      onRefresh={jest.fn()}
    />,
  );

describe('Showing that more items are loading', () => {
  test('when the next page is loading, then a loading indicator appears at the end of the list', () => {
    const screen = renderListOfFiles(true);

    expect(screen.getByText('notes.txt')).toBeTruthy();
    expect(screen.UNSAFE_queryAllByType(ActivityIndicator)).toHaveLength(1);
  });

  test('when nothing is loading, then no loading indicator appears', () => {
    const screen = renderListOfFiles(false);

    expect(screen.getByText('notes.txt')).toBeTruthy();
    expect(screen.UNSAFE_queryAllByType(ActivityIndicator)).toHaveLength(0);
  });
});
