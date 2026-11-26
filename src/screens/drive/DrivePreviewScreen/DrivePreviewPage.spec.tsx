import { useDownloadedThumbnail } from '@internxt-mobile/hooks/drive/useDownloadedThumbnail';
import { DownloadedThumbnail } from '@internxt-mobile/types/drive/file';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { render } from '@testing-library/react-native';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import { useAppSelector } from 'src/store/hooks';
import { DrivePreviewPage } from './DrivePreviewPage';

jest.mock('@internxt-mobile/hooks/drive/useDownloadedThumbnail', () => ({
  useDownloadedThumbnail: jest.fn(),
}));

jest.mock('@internxt-mobile/hooks/drive/useOpenFilePreview', () => ({ startFilePreview: jest.fn() }));
jest.mock('@internxt-mobile/services/ErrorService', () => ({ __esModule: true, default: { reportError: jest.fn() } }));
jest.mock('@internxt-mobile/services/FileSystemService', () => ({ fs: { shareFile: jest.fn() } }));
jest.mock('@internxt-mobile/services/NotificationsService', () => ({ notifications: { error: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('src/store/hooks', () => ({ useAppDispatch: jest.fn(), useAppSelector: jest.fn() }));
jest.mock('src/hooks/useDelayedVideoActivation', () => ({ useDelayedVideoActivation: () => false }));
jest.mock('src/hooks/useColor', () => ({ __esModule: true, default: () => () => '#0066FF' }));
jest.mock('src/helpers', () => ({ getFileTypeIcon: () => () => null }));
jest.mock('src/components/AppButton', () => {
  const { Text } = jest.requireActual('react-native');
  return ({ title }: { title: string }) => <Text>{title}</Text>;
});
jest.mock('src/components/AppProgressBar', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="drive-preview-progress" />;
});
jest.mock('src/components/AppText', () => {
  const { Text } = jest.requireActual('react-native');
  return ({ children }: { children: string }) => <Text>{children}</Text>;
});
jest.mock('assets/lang/strings', () => ({
  __esModule: true,
  default: { generic: { downloading: 'Downloading', decrypting: 'Decrypting' }, buttons: { tryAgain: 'Try again' } },
}));
jest.mock('src/styles/global', () => ({ getLineHeight: () => 24 }));
jest.mock('./DriveImagePreview', () => ({ DriveImagePreview: () => null }));
jest.mock('./DrivePdfPreview', () => ({ DrivePdfPreview: () => null }));
jest.mock('./DriveVideoPreview', () => ({ DriveVideoPreview: () => null }));
jest.mock('./DrivePreviewScreenHeader', () => ({ DRIVE_PREVIEW_HEADER_HEIGHT: 0 }));

const useDownloadedThumbnailMock = useDownloadedThumbnail as jest.Mock;
const useAppSelectorMock = useAppSelector as jest.Mock;
const thumbnail: DownloadedThumbnail = { width: 40, height: 40, uri: 'file:///thumb.png' };
const driveFile = { uuid: 'file-uuid', name: 'holiday', type: 'zip' } as DriveItemData;

const renderPage = (isActive: boolean) =>
  render(
    <DrivePreviewPage
      driveFile={driveFile}
      isActive={isActive}
      topbarVisible
      pdfViewerSpacerHeight={new Animated.Value(0)}
      onToggleTopbar={jest.fn()}
      onHideTopbar={jest.fn()}
      onZoomChange={jest.fn()}
    />,
  );

describe('Drive preview page', () => {
  beforeEach(() => {
    useAppSelectorMock.mockReturnValue(undefined);
  });

  test('when a page that is not visible has a thumbnail, then the thumbnail is shown instead of the file icon', () => {
    useDownloadedThumbnailMock.mockReturnValue(thumbnail);

    const { queryByTestId, queryByText } = renderPage(false);

    expect(queryByTestId('drive-preview-thumbnail')).not.toBeNull();
    expect(queryByText('holiday.zip')).toBeNull();
  });

  test('when a page that is not visible has no thumbnail, then the file type icon and name are shown', () => {
    useDownloadedThumbnailMock.mockReturnValue(null);

    const { queryByTestId, queryByText } = renderPage(false);

    expect(queryByTestId('drive-preview-thumbnail')).toBeNull();
    expect(queryByText('holiday.zip')).not.toBeNull();
  });

  test('when a page that is not visible belongs to the file being downloaded, then it shows its thumbnail without the spinner or the progress line', () => {
    useDownloadedThumbnailMock.mockReturnValue(thumbnail);
    useAppSelectorMock.mockReturnValue({
      data: { uuid: 'file-uuid' },
      downloadProgress: 0.5,
      hasDownloadStarted: true,
    });

    const { queryByTestId, queryByLabelText } = renderPage(false);

    expect(queryByTestId('drive-preview-thumbnail')).not.toBeNull();
    expect(queryByTestId('drive-preview-thumbnail-scrim')).toBeNull();
    expect(queryByLabelText('Downloading')).toBeNull();
    expect(queryByTestId('drive-preview-progress')).toBeNull();
  });

  test('when the visible file is still downloading and has a thumbnail, then the thumbnail is shown with a spinner and the progress line', () => {
    useDownloadedThumbnailMock.mockReturnValue(thumbnail);
    useAppSelectorMock.mockReturnValue({
      data: { uuid: 'file-uuid' },
      downloadProgress: 0.5,
      hasDownloadStarted: true,
    });

    const { queryByTestId, queryByText, queryByLabelText } = renderPage(true);

    expect(queryByTestId('drive-preview-thumbnail')).not.toBeNull();
    expect(queryByTestId('drive-preview-thumbnail-scrim')).not.toBeNull();
    expect(queryByLabelText('Downloading')).not.toBeNull();
    expect(queryByTestId('drive-preview-progress')).not.toBeNull();
    expect(queryByText('holiday.zip')).toBeNull();
  });

  test('when the visible file is downloading and its thumbnail is much taller than the page, then the thumbnail fits inside the page', () => {
    useDownloadedThumbnailMock.mockReturnValue({ width: 100, height: 600, uri: 'file:///thumb.png' });
    useAppSelectorMock.mockReturnValue({
      data: { uuid: 'file-uuid' },
      downloadProgress: 0.5,
      hasDownloadStarted: true,
    });
    const windowSize = Dimensions.get('window');

    const { getByTestId } = renderPage(true);

    const frameStyle = StyleSheet.flatten(getByTestId('drive-preview-thumbnail-frame').props.style);
    expect(frameStyle.height).toBeLessThanOrEqual(windowSize.height);
    expect(frameStyle.width).toBeLessThanOrEqual(windowSize.width);
    expect(frameStyle.width / frameStyle.height).toBeCloseTo(100 / 600);
  });

  test('when the visible file without a thumbnail is downloading, then its icon, name, a spinner and the progress line are shown', () => {
    useDownloadedThumbnailMock.mockReturnValue(null);
    useAppSelectorMock.mockReturnValue({
      data: { uuid: 'file-uuid' },
      downloadProgress: 0.5,
      hasDownloadStarted: true,
    });

    const { queryByTestId, queryByText, queryByLabelText } = renderPage(true);

    expect(queryByTestId('drive-preview-thumbnail')).toBeNull();
    expect(queryByText('holiday.zip')).not.toBeNull();
    expect(queryByLabelText('Downloading')).not.toBeNull();
    expect(queryByTestId('drive-preview-progress')).not.toBeNull();
    expect(queryByText('Downloading')).toBeNull();
    expect(queryByText('Decrypting')).toBeNull();
  });

  test('when the visible file is still being checked before its download starts, then the spinner is shown without the progress line', () => {
    useDownloadedThumbnailMock.mockReturnValue(thumbnail);
    useAppSelectorMock.mockReturnValue({ data: { uuid: 'file-uuid' }, downloadProgress: 0, hasDownloadStarted: false });

    const { queryByTestId, queryByLabelText } = renderPage(true);

    expect(queryByLabelText('Downloading')).not.toBeNull();
    expect(queryByTestId('drive-preview-progress')).toBeNull();
  });

  test('when the visible file has a thumbnail but the download failed, then the error and retry are shown instead of the thumbnail', () => {
    useDownloadedThumbnailMock.mockReturnValue(thumbnail);
    useAppSelectorMock.mockReturnValue({
      data: { uuid: 'file-uuid' },
      downloadProgress: 0.5,
      hasDownloadStarted: true,
      error: 'Download failed',
    });

    const { queryByTestId, queryByText } = renderPage(true);

    expect(queryByTestId('drive-preview-thumbnail')).toBeNull();
    expect(queryByText('Download failed')).not.toBeNull();
    expect(queryByText('Try again')).not.toBeNull();
  });
});
