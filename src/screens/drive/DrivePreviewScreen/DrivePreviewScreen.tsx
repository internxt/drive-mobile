import { GeneratedThumbnail, imageService } from '@internxt-mobile/services/common';
import { time } from '@internxt-mobile/services/common/time';
import errorService from '@internxt-mobile/services/ErrorService';
import { fs } from '@internxt-mobile/services/FileSystemService';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import { FileExtension } from '@internxt-mobile/types/drive/file';
import { RootStackScreenProps } from '@internxt-mobile/types/navigation';
import { Thumbnail } from '@internxt-mobile/types/drive/file';
import strings from 'assets/lang/strings';
import { WarningCircle } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from 'src/components/AppButton';
import AppProgressBar from 'src/components/AppProgressBar';
import AppScreen from 'src/components/AppScreen';
import AppText from 'src/components/AppText';
import { DEFAULT_EASING } from 'src/components/modals/SharedLinkSettingsModal/animations';
import { getFileTypeIcon } from 'src/helpers';
import { useDrive } from 'src/hooks/drive';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { uiActions } from 'src/store/slices/ui';
import { getLineHeight } from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';
import { driveActions, driveThunks } from '../../../store/slices/drive';
import { DriveImagePreview } from './DriveImagePreview';
import { DrivePdfPreview } from './DrivePdfPreview';
import { DRIVE_PREVIEW_HEADER_HEIGHT, DrivePreviewScreenHeader } from './DrivePreviewScreenHeader';
import { DriveVideoPreview } from './DriveVideoPreview';
import { useThumbnailRegeneration } from './hooks/useThumbnailRegeneration';
import AnimatedLoadingDots from './LoadingDots';

const IMAGE_PREVIEW_TYPES = new Set([FileExtension.PNG, FileExtension.JPG, FileExtension.JPEG, FileExtension.HEIC]);
const VIDEO_PREVIEW_TYPES = new Set([FileExtension.MP4, FileExtension.MOV, FileExtension.AVI]);
const PDF_PREVIEW_TYPES = new Set([FileExtension.PDF]);

export const DrivePreviewScreen: React.FC<RootStackScreenProps<'DrivePreview'>> = (props) => {
  const tailwind = useTailwind();
  const [topbarVisible, setTopbarVisible] = useState(true);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<GeneratedThumbnail>();

  const dimensions = useWindowDimensions();
  // REDUX USAGE STARTS
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const driveCtx = useDrive();
  // REDUX USAGE ENDS
  const { downloadingFile } = useAppSelector((state) => state.drive);
  // Use this in order to listen for state changes
  const { focusedItem } = useAppSelector((state) => state.drive);
  const totalHeaderHeight = DRIVE_PREVIEW_HEADER_HEIGHT + insets.top;
  const topbarYPosition = useRef(new Animated.Value(0)).current;
  const pdfViewerSpacerHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (
      downloadingFile?.downloadedFilePath &&
      VIDEO_PREVIEW_TYPES.has(downloadingFile.data.type as FileExtension) &&
      !generatedThumbnail
    ) {
      imageService
        .generateVideoThumbnail(downloadingFile.downloadedFilePath)
        .then((generatedThumbnail) => {
          setGeneratedThumbnail(generatedThumbnail);
        })
        .catch((err) => errorService.reportError(err));
    }
  }, [downloadingFile?.downloadedFilePath]);

  const updateItemWithNewThumbnail = (thumbnail: Thumbnail) => {
    if (!focusedItem?.folderUuid) return;

    driveCtx.updateItemInTree(focusedItem.folderUuid, focusedItem.id, {
      thumbnails: [thumbnail],
    });
    dispatch(
      driveActions.setFocusedItem({
        ...focusedItem,
        thumbnails: [thumbnail],
      }),
    );
  };

  useThumbnailRegeneration(
    {
      downloadedFilePath: downloadingFile?.downloadedFilePath,
      fileExtension: focusedItem?.type,
      fileUuid: focusedItem?.uuid,
      hasThumbnails: !!(focusedItem?.thumbnails && focusedItem.thumbnails.length > 0),
    },
    {
      onSuccess: updateItemWithNewThumbnail,
    },
  );

  useEffect(() => {
    Animated.timing(topbarYPosition, {
      toValue: topbarVisible ? 0 : -totalHeaderHeight,
      duration: 150,
      useNativeDriver: true,
      easing: DEFAULT_EASING,
    }).start();

    Animated.timing(pdfViewerSpacerHeight, {
      toValue: topbarVisible ? totalHeaderHeight : 0,
      duration: 100,
      useNativeDriver: false,
      easing: DEFAULT_EASING,
    }).start();
  }, [topbarVisible]);

  const handleActionsButtonPress = () => {
    dispatch(uiActions.setShowItemModal(true));
  };

  if (!downloadingFile) {
    return <></>;
  }

  if (!focusedItem) {
    return <></>;
  }
  const filename = `${focusedItem.name || ''}${focusedItem.type ? `.${focusedItem.type}` : ''}`;
  const currentProgress =
    (downloadingFile.downloadProgress ?? 0) * 0.95 + (downloadingFile.decryptProgress ?? 0) * 0.05;
  const FileIcon = getFileTypeIcon(focusedItem.type || '');
  const fileType = downloadingFile.data.type?.toLowerCase();
  const hasImagePreview = fileType ? IMAGE_PREVIEW_TYPES.has(fileType as FileExtension) : false;
  const hasVideoPreview = fileType ? VIDEO_PREVIEW_TYPES.has(fileType as FileExtension) : false;
  const hasPdfPreview = fileType ? PDF_PREVIEW_TYPES.has(fileType as FileExtension) : false;

  const getProgressMessage = () => {
    if (!downloadingFile) {
      return;
    }

    const progressMessage = currentProgress < 0.95 ? strings.generic.downloading : strings.generic.decrypting;

    return progressMessage;
  };

  const handleOpenFileWith = async (filename: string, downloadedFilePath: string) => {
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
      <View style={tailwind('flex-1 flex items-center justify-center px-10')}>
        <FileIcon />
        <View style={tailwind('mt-5')}>
          <AppText
            style={[tailwind('text-center text-xl'), { lineHeight: getLineHeight(20, 1.2) }]}
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
          <View style={tailwind('w-full mt-10')}>
            <AppProgressBar height={4} animateWidth currentValue={currentProgress} totalValue={1} />
          </View>
        ) : null}
        {error ? (
          <View style={tailwind('mt-1')}>
            <View style={tailwind('flex flex-row items-center')}>
              <WarningCircle weight="fill" size={20} color={tailwind('text-red').color as string} />
              <AppText style={tailwind('text-gray-60 text-center text-red ml-1')}>{error}</AppText>
            </View>
            {downloadingFile && error !== strings.messages.downloadLimit && (
              <AppButton
                style={tailwind('mt-5')}
                title={strings.buttons.tryAgain}
                type={'white'}
                onPress={() => downloadingFile?.retry?.()}
              ></AppButton>
            )}
          </View>
        ) : null}
        {isDownloaded && downloadedFilePath ? (
          <View style={tailwind('mt-1')}>
            <AppText style={tailwind('text-gray-60 text-center')}>
              {strings.screens.PreviewScreen.noPreviewAvailable}
            </AppText>
            <AppButton
              style={tailwind('mt-5')}
              title={strings.screens.PreviewScreen.openWith}
              type={'white'}
              onPress={() => handleOpenFileWith(filename, downloadedFilePath)}
            ></AppButton>
          </View>
        ) : null}
      </View>
    );
  };
  const renderByStatus = () => {
    const renderImagePreview = downloadingFile.downloadedFilePath && hasImagePreview;
    const renderVideoPreview = downloadingFile.downloadedFilePath && hasVideoPreview;
    const renderPdfPreview = downloadingFile.downloadedFilePath && hasPdfPreview;
    // Render no preview
    if (
      (currentProgress < 1 && !downloadingFile.downloadedFilePath) ||
      (!renderImagePreview && !renderVideoPreview && !renderPdfPreview) ||
      downloadingFile.error
    ) {
      return renderNoPreview({
        isDownloaded: downloadingFile.downloadedFilePath ? true : false,
        downloadedFilePath: downloadingFile.downloadedFilePath,
        error: downloadingFile.error,
      });
    }

    if (renderImagePreview) {
      return (
        <DriveImagePreview
          onTapImage={() => {
            setTopbarVisible(!topbarVisible);
          }}
          onZoomImage={() => {
            setTopbarVisible(false);
          }}
          imagePath={downloadingFile.downloadedFilePath as string}
          height={dimensions.height}
        />
      );
    }

    if (renderVideoPreview && downloadingFile.downloadedFilePath) {
      return <DriveVideoPreview thumbnail={generatedThumbnail?.path} source={downloadingFile.downloadedFilePath} />;
    }

    if (renderPdfPreview) {
      const availableHeight = dimensions.height - (topbarVisible ? DRIVE_PREVIEW_HEADER_HEIGHT + insets.top : 0);
      return (
        <View>
          <Animated.View style={{ height: pdfViewerSpacerHeight }} />
          <DrivePdfPreview
            topbarVisible={topbarVisible}
            style={{ height: availableHeight }}
            onTap={() => setTopbarVisible(!topbarVisible)}
            width={dimensions.width}
            height={dimensions.height}
            source={downloadingFile.downloadedFilePath as string}
          />
        </View>
      );
    }
  };
  return (
    <AppScreen style={tailwind('flex-1')}>
      <Animated.View
        style={[
          tailwind('absolute w-full z-10 bg-white'),
          { paddingTop: insets.top, transform: [{ translateY: topbarYPosition }] },
        ]}
      >
        <DrivePreviewScreenHeader
          title={filename}
          subtitle={time.getFormattedDate(downloadingFile.data.updatedAt, time.formats.dateAtTimeLong)}
          onCloseButtonPress={async () => {
            await dispatch(driveThunks.cancelDownloadThunk());
            dispatch(driveActions.clearDownloadingFile());
            props.navigation.goBack();
          }}
          onActionsButtonPress={handleActionsButtonPress}
        />
      </Animated.View>
      {renderByStatus()}
    </AppScreen>
  );
};
