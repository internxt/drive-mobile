import { driveFileService } from '@internxt-mobile/services/drive/file';
import { DownloadedThumbnail } from '@internxt-mobile/types/drive/file';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { DownloadingFile } from '@internxt-mobile/types/drive/operations';
import { configureStore } from '@reduxjs/toolkit';
import { act, render, waitFor } from '@testing-library/react-native';
import strings from 'assets/lang/strings';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import { Bar as ProgressBar } from 'react-native-progress';
import { Provider } from 'react-redux';
import driveReducer from 'src/store/slices/drive';
import { DrivePreviewPage } from './DrivePreviewPage';

jest.mock('@internxt-mobile/contexts/Theme', () => ({ useTheme: () => ({ theme: 'light' }) }));
jest.mock('@internxt-mobile/services/drive/file', () => ({ driveFileService: { getThumbnail: jest.fn() } }));
jest.mock('@internxt-mobile/services/ErrorService', () => ({ __esModule: true, default: { reportError: jest.fn() } }));
jest.mock('@internxt-mobile/services/FileSystemService', () => ({ fs: { shareFile: jest.fn() } }));
jest.mock('@internxt-mobile/services/NotificationsService', () => ({ notifications: { error: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('src/helpers/filetypes', () => ({
  ...jest.requireActual('src/helpers/filetypes'),
  getFileTypeIcon: () => () => null,
}));
jest.mock('./DrivePdfPreview', () => ({ DrivePdfPreview: () => null }));
jest.mock('./DriveVideoPreview', () => ({ DriveVideoPreview: () => null }));

const getThumbnailMock = driveFileService.getThumbnail as jest.Mock;

const DOWNLOAD_PROGRESS_HALF = 0.5;
const TALL_THUMBNAIL_WIDTH = 100;
const TALL_THUMBNAIL_HEIGHT = 600;
const SQUARE_THUMBNAIL_SIZE = 40;

const thumbnail: DownloadedThumbnail = {
  width: SQUARE_THUMBNAIL_SIZE,
  height: SQUARE_THUMBNAIL_SIZE,
  uri: 'file:///thumb.png',
};
const fileWithoutThumbnail = { uuid: 'file-uuid', name: 'holiday', type: 'zip' } as DriveItemData;
const fileWithThumbnail = {
  ...fileWithoutThumbnail,
  thumbnails: [{ bucket_file: 'thumbnail-file', bucket_id: 'thumbnail-bucket', type: 'png' }],
} as unknown as DriveItemData;

const aDownload = (overrides: Partial<DownloadingFile> = {}): DownloadingFile => ({
  requestId: 'request-id',
  data: { uuid: 'file-uuid', fileId: 'file-id', name: 'holiday', type: 'zip', size: 1024, updatedAt: '2026-01-01' },
  downloadProgress: DOWNLOAD_PROGRESS_HALF,
  decryptProgress: 0,
  hasDownloadStarted: true,
  status: 'idle',
  ...overrides,
});

const renderPage = ({
  driveFile,
  isActive,
  downloadingFile,
}: {
  driveFile: DriveItemData;
  isActive: boolean;
  downloadingFile?: DownloadingFile;
}) => {
  const store = configureStore({
    reducer: {
      drive: driveReducer,
      auth: () => ({ user: { userId: 'user-id' } }),
    },
    preloadedState: {
      drive: { ...driveReducer(undefined, { type: 'init' }), downloadingFile },
      auth: { user: { userId: 'user-id' } },
    },
  });

  return render(
    <Provider store={store}>
      <DrivePreviewPage
        driveFile={driveFile}
        isActive={isActive}
        topbarVisible
        pdfViewerSpacerHeight={new Animated.Value(0)}
        onToggleTopbar={jest.fn()}
        onHideTopbar={jest.fn()}
        onZoomChange={jest.fn()}
      />
    </Provider>,
  );
};

describe('Drive preview page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getThumbnailMock.mockResolvedValue(thumbnail);
  });

  test('when a page that is not visible has a thumbnail, then the thumbnail is shown instead of the file icon', async () => {
    const { findByTestId, queryByText } = renderPage({ driveFile: fileWithThumbnail, isActive: false });

    expect(await findByTestId('drive-preview-thumbnail')).toBeTruthy();
    expect(queryByText('holiday.zip')).toBeNull();
  });

  test('when a page that is not visible has no thumbnail, then the file type icon and name are shown', () => {
    const { queryByTestId, queryByText } = renderPage({ driveFile: fileWithoutThumbnail, isActive: false });

    expect(queryByTestId('drive-preview-thumbnail')).toBeNull();
    expect(queryByText('holiday.zip')).not.toBeNull();
  });

  test('when a page that is not visible belongs to the file being downloaded, then it shows its thumbnail without the spinner or the progress line', async () => {
    const { findByTestId, queryByTestId, queryByLabelText, UNSAFE_queryByType } = renderPage({
      driveFile: fileWithThumbnail,
      isActive: false,
      downloadingFile: aDownload(),
    });

    expect(await findByTestId('drive-preview-thumbnail')).toBeTruthy();
    expect(queryByTestId('drive-preview-thumbnail-scrim')).toBeNull();
    expect(queryByLabelText(strings.generic.downloading)).toBeNull();
    expect(UNSAFE_queryByType(ProgressBar)).toBeNull();
  });

  test('when the visible file is still downloading and has a thumbnail, then the thumbnail is shown with a spinner and the progress line', async () => {
    const { findByTestId, queryByTestId, queryByText, queryByLabelText, UNSAFE_queryByType } = renderPage({
      driveFile: fileWithThumbnail,
      isActive: true,
      downloadingFile: aDownload(),
    });

    expect(await findByTestId('drive-preview-thumbnail')).toBeTruthy();
    expect(queryByTestId('drive-preview-thumbnail-scrim')).not.toBeNull();
    expect(queryByLabelText(strings.generic.downloading)).not.toBeNull();
    expect(UNSAFE_queryByType(ProgressBar)).not.toBeNull();
    expect(queryByText('holiday.zip')).toBeNull();
  });

  test('when the visible file is downloading and its thumbnail is much taller than the page, then the thumbnail fits inside the page', async () => {
    getThumbnailMock.mockResolvedValue({
      width: TALL_THUMBNAIL_WIDTH,
      height: TALL_THUMBNAIL_HEIGHT,
      uri: 'file:///thumb.png',
    });
    const windowSize = Dimensions.get('window');

    const { findByTestId } = renderPage({
      driveFile: fileWithThumbnail,
      isActive: true,
      downloadingFile: aDownload(),
    });

    const frameStyle = StyleSheet.flatten((await findByTestId('drive-preview-thumbnail-frame')).props.style);
    expect(frameStyle.height).toBeLessThanOrEqual(windowSize.height);
    expect(frameStyle.width).toBeLessThanOrEqual(windowSize.width);
    expect(frameStyle.width / frameStyle.height).toBeCloseTo(TALL_THUMBNAIL_WIDTH / TALL_THUMBNAIL_HEIGHT);
  });

  test('when the visible file without a thumbnail is downloading, then its icon, name, a spinner and the progress line are shown', () => {
    const { queryByTestId, queryByText, queryByLabelText, UNSAFE_queryByType } = renderPage({
      driveFile: fileWithoutThumbnail,
      isActive: true,
      downloadingFile: aDownload(),
    });

    expect(queryByTestId('drive-preview-thumbnail')).toBeNull();
    expect(queryByText('holiday.zip')).not.toBeNull();
    expect(queryByLabelText(strings.generic.downloading)).not.toBeNull();
    expect(UNSAFE_queryByType(ProgressBar)).not.toBeNull();
    expect(queryByText(strings.generic.downloading)).toBeNull();
    expect(queryByText(strings.generic.decrypting)).toBeNull();
  });

  test('when the visible file is still being checked before its download starts, then the spinner is shown without the progress line', async () => {
    const { findByTestId, queryByLabelText, UNSAFE_queryByType } = renderPage({
      driveFile: fileWithThumbnail,
      isActive: true,
      downloadingFile: aDownload({ downloadProgress: 0, hasDownloadStarted: false }),
    });

    await findByTestId('drive-preview-thumbnail');
    expect(queryByLabelText(strings.generic.downloading)).not.toBeNull();
    expect(UNSAFE_queryByType(ProgressBar)).toBeNull();
  });

  test('when the visible file has a thumbnail but the download failed, then the error and retry are shown instead of the thumbnail', async () => {
    const { queryByTestId, queryByText } = renderPage({
      driveFile: fileWithThumbnail,
      isActive: true,
      downloadingFile: aDownload({ error: 'Download failed' }),
    });
    await waitFor(() => expect(getThumbnailMock).toHaveBeenCalled());
    await act(async () => {
      await getThumbnailMock.mock.results[0].value;
    });

    expect(queryByTestId('drive-preview-thumbnail')).toBeNull();
    expect(queryByText('Download failed')).not.toBeNull();
    expect(queryByText(strings.buttons.tryAgain)).not.toBeNull();
  });
});
