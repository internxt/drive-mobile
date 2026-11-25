import { startFilePreview } from '@internxt-mobile/hooks/drive/useOpenFilePreview';
import errorService from '@internxt-mobile/services/ErrorService';
import { fs } from '@internxt-mobile/services/FileSystemService';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import { FileExtension } from '@internxt-mobile/types/drive/file';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import strings from 'assets/lang/strings';
import { Animated, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from 'src/components/AppButton';
import AppProgressBar from 'src/components/AppProgressBar';
import AppText from 'src/components/AppText';
import { getFileTypeIcon } from 'src/helpers';
import { useDelayedVideoActivation } from 'src/hooks/useDelayedVideoActivation';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { getLineHeight } from 'src/styles/global';
import { DriveImagePreview } from './DriveImagePreview';
import { DrivePdfPreview } from './DrivePdfPreview';
import { DRIVE_PREVIEW_HEADER_HEIGHT } from './DrivePreviewScreenHeader';
import { DriveVideoPreview } from './DriveVideoPreview';
import AnimatedLoadingDots from './LoadingDots';

const IMAGE_PREVIEW_TYPES = new Set([FileExtension.PNG, FileExtension.JPG, FileExtension.JPEG, FileExtension.HEIC]);
export const VIDEO_PREVIEW_TYPES = new Set([FileExtension.MP4, FileExtension.MOV, FileExtension.AVI]);
const PDF_PREVIEW_TYPES = new Set([FileExtension.PDF]);
const PDF_DEFAULT_SCALE = 1;

export const getPreviewFileName = (driveFile: DriveItemData) =>
  `${driveFile.name || ''}${driveFile.type ? `.${driveFile.type}` : ''}`;

interface DrivePreviewPageProps {
  driveFile: DriveItemData;
  isActive: boolean;
  cachedFilePath?: string;
  topbarVisible: boolean;
  videoThumbnailPath?: string;
  pdfViewerSpacerHeight: Animated.Value;
  onToggleTopbar: () => void;
  onHideTopbar: () => void;
  onZoomChange: (isZoomed: boolean) => void;
}

export const DrivePreviewPage = ({
  driveFile,
  isActive,
  cachedFilePath,
  topbarVisible,
  videoThumbnailPath,
  pdfViewerSpacerHeight,
  onToggleTopbar,
  onHideTopbar,
  onZoomChange,
}: DrivePreviewPageProps): JSX.Element => {
  const dimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const isVideoActive = useDelayedVideoActivation(isActive);
  const downloadingFile = useAppSelector((state) => state.drive.downloadingFile);
  const totalHeaderHeight = DRIVE_PREVIEW_HEADER_HEIGHT + insets.top;
  const filename = getPreviewFileName(driveFile);
  const FileIcon = getFileTypeIcon(driveFile.type || '');
  const pageDownload = isActive && downloadingFile?.data.uuid === driveFile.uuid ? downloadingFile : undefined;

  const fileType = driveFile.type?.toLowerCase();
  const hasImagePreview = fileType ? IMAGE_PREVIEW_TYPES.has(fileType as FileExtension) : false;
  const hasVideoPreview = fileType ? VIDEO_PREVIEW_TYPES.has(fileType as FileExtension) : false;
  const hasPdfPreview = fileType ? PDF_PREVIEW_TYPES.has(fileType as FileExtension) : false;
  const downloadedFilePath = pageDownload?.downloadedFilePath ?? cachedFilePath;
  const canShowWhileInactive = !!downloadedFilePath && (hasImagePreview || hasPdfPreview);

  if (!pageDownload && !canShowWhileInactive) {
    return (
      <View className="flex-1 items-center justify-center px-10" style={{ width: dimensions.width }}>
        <FileIcon />
        <AppText
          className="mt-5 text-center text-xl"
          style={{ lineHeight: getLineHeight(20, 1.2) }}
          numberOfLines={2}
          medium
        >
          {filename}
        </AppText>
      </View>
    );
  }

  const currentProgress = pageDownload
    ? (pageDownload.downloadProgress ?? 0) * 0.95 + (pageDownload.decryptProgress ?? 0) * 0.05
    : 1;

  const getProgressMessage = () => {
    return currentProgress < 0.95 ? strings.generic.downloading : strings.generic.decrypting;
  };

  const handleOpenFileWith = async (downloadedFilePath: string) => {
    try {
      await fs.shareFile({
        title: filename,
        fileUri: downloadedFilePath,
      });
    } catch (error) {
      notifications.error(strings.errors.openWithFailed);
      errorService.reportError(error);
    }
  };

  const renderNoPreview = ({
    isDownloaded,
    downloadedFilePath,
    error,
  }: {
    isDownloaded: boolean;
    downloadedFilePath?: string;
    error?: string;
  }) => {
    return (
      <View className="flex-1 flex items-center justify-center px-10">
        <FileIcon />
        <View className="mt-5">
          <AppText
            className="text-center text-xl"
            style={{ lineHeight: getLineHeight(20, 1.2) }}
            numberOfLines={2}
            medium
          >
            {filename}
          </AppText>
          {!isDownloaded && !error ? (
            <AnimatedLoadingDots
              previousDotsText={getProgressMessage()}
              progress={Number.parseInt((currentProgress * 100).toFixed(0))}
            />
          ) : null}
        </View>
        {!isDownloaded && !error ? (
          <View className="w-full mt-10">
            <AppProgressBar height={4} animateWidth currentValue={currentProgress} totalValue={1} />
          </View>
        ) : null}
        {error ? (
          <View className="mt-1">
            <AppText className="text-center text-red">{error}</AppText>
            <AppButton
              className="mt-5"
              title={strings.buttons.tryAgain}
              type={'white'}
              onPress={() => startFilePreview(dispatch, driveFile)}
            ></AppButton>
          </View>
        ) : null}
        {isDownloaded && downloadedFilePath ? (
          <View className="mt-1">
            <AppText className="text-gray-60 text-center">{strings.screens.PreviewScreen.noPreviewAvailable}</AppText>
            <AppButton
              className="mt-5"
              title={strings.screens.PreviewScreen.openWith}
              type={'white'}
              onPress={() => handleOpenFileWith(downloadedFilePath)}
            ></AppButton>
          </View>
        ) : null}
      </View>
    );
  };

  const renderByStatus = () => {
    const renderImagePreview = downloadedFilePath && hasImagePreview;
    const renderVideoPreview = downloadedFilePath && hasVideoPreview;
    const renderPdfPreview = downloadedFilePath && hasPdfPreview;
    if (!downloadedFilePath || (!renderImagePreview && !renderVideoPreview && !renderPdfPreview)) {
      return renderNoPreview({
        isDownloaded: !!downloadedFilePath,
        downloadedFilePath,
        error: pageDownload?.error,
      });
    }

    if (renderImagePreview) {
      return (
        <DriveImagePreview
          onTapImage={onToggleTopbar}
          onZoomImage={() => {
            onHideTopbar();
            onZoomChange(true);
          }}
          onImageViewReset={() => onZoomChange(false)}
          imagePath={downloadedFilePath}
          height={dimensions.height}
        />
      );
    }

    if (renderVideoPreview) {
      return (
        <View className="flex-1" style={{ paddingTop: totalHeaderHeight, paddingBottom: insets.bottom }}>
          <DriveVideoPreview thumbnail={videoThumbnailPath} source={isVideoActive ? downloadedFilePath : undefined} />
        </View>
      );
    }

    if (renderPdfPreview) {
      const availableHeight = dimensions.height - (topbarVisible ? totalHeaderHeight : 0);
      return (
        <View>
          <Animated.View style={{ height: pdfViewerSpacerHeight }} />
          <DrivePdfPreview
            topbarVisible={topbarVisible}
            style={{ height: availableHeight }}
            onTap={onToggleTopbar}
            onScaleChanged={(scale) => onZoomChange(scale > PDF_DEFAULT_SCALE)}
            width={dimensions.width}
            height={dimensions.height}
            source={downloadedFilePath}
          />
        </View>
      );
    }
  };

  return <View style={{ width: dimensions.width }}>{renderByStatus()}</View>;
};
