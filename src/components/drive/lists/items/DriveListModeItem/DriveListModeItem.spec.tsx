import { render } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { useDownloadedThumbnail } from '@internxt-mobile/hooks/drive';
import { DownloadedThumbnail } from '@internxt-mobile/types/drive/file';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { DriveItemStatus } from '../../../../../types/drive/item';
import { DriveItemProps, DriveListType, DriveListViewMode } from '../../../../../types/drive/ui';
import { SelectionModeContext } from '../SelectionModeContext';
import { DriveListModeItem } from './DriveListModeItem';

jest.mock('@internxt-mobile/hooks/drive', () => ({
  useDownloadedThumbnail: jest.fn(),
}));

jest.mock('@internxt/lib', () => ({
  items: {
    getItemDisplayName: ({ name, type }: { name: string; type?: string }) => (type ? `${name}.${type}` : name),
  },
}));

jest.mock('tailwind-rn', () => ({
  useTailwind: () => () => ({}),
}));

jest.mock('../../../../../hooks/useColor', () => () => () => '#000000');

jest.mock('../../../../../helpers', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    FolderIcon: () => <MockText testID="drive-list-item-folder-icon" />,
    getFileTypeIcon: () => () => <MockText testID="drive-list-item-generic-icon" />,
  };
});

const useDownloadedThumbnailMock = useDownloadedThumbnail as jest.Mock;
const thumbnail: DownloadedThumbnail = { width: 40, height: 40, uri: 'file:///thumb.png' };

const SelectionModeProvider = ({ children }: { children: ReactNode }) => {
  const selectionModeProgress = useSharedValue(0);
  return <SelectionModeContext.Provider value={selectionModeProgress}>{children}</SelectionModeContext.Provider>;
};

const arrange = (): DriveItemProps => ({
  type: DriveListType.Drive,
  viewMode: DriveListViewMode.List,
  status: DriveItemStatus.Idle,
  data: { name: 'photo', type: 'png', isFolder: false } as DriveItemData,
});

describe('DriveListModeItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when the item has a downloaded thumbnail, then the row renders the thumbnail instead of the generic icon', () => {
    useDownloadedThumbnailMock.mockReturnValue(thumbnail);

    const { queryByTestId } = render(<DriveListModeItem {...arrange()} />, { wrapper: SelectionModeProvider });

    expect(queryByTestId('drive-list-item-thumbnail')).not.toBeNull();
    expect(queryByTestId('drive-list-item-generic-icon')).toBeNull();
  });

  test('when the item has no downloaded thumbnail, then the row renders the generic icon', () => {
    useDownloadedThumbnailMock.mockReturnValue(null);

    const { queryByTestId } = render(<DriveListModeItem {...arrange()} />, { wrapper: SelectionModeProvider });

    expect(queryByTestId('drive-list-item-generic-icon')).not.toBeNull();
    expect(queryByTestId('drive-list-item-thumbnail')).toBeNull();
  });
});
