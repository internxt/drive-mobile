import { generateVideoThumbnail } from '@internxt-mobile/services/common';
import { time } from '@internxt-mobile/services/common/time';
import errorService from '@internxt-mobile/services/ErrorService';
import { FileExtension, Thumbnail } from '@internxt-mobile/types/drive/file';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { RootStackScreenProps } from '@internxt-mobile/types/navigation';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppScreen from 'src/components/AppScreen';
import { DEFAULT_EASING } from 'src/components/modals/SharedLinkSettingsModal/animations';
import { useDrive } from 'src/hooks/drive';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { uiActions } from 'src/store/slices/ui';
import { driveActions, driveThunks } from '../../../store/slices/drive';
import { DrivePreviewPage, getPreviewFileName, VIDEO_PREVIEW_TYPES } from './DrivePreviewPage';
import { DrivePreviewPager } from './DrivePreviewPager';
import { DRIVE_PREVIEW_HEADER_HEIGHT, DrivePreviewScreenHeader } from './DrivePreviewScreenHeader';
import { useActivePreviewFile } from './hooks/useActivePreviewFile';
import { useSyncPreviewFilesWithDrive } from './hooks/useSyncPreviewFilesWithDrive';
import { useThumbnailRegeneration } from './hooks/useThumbnailRegeneration';

const TOP_BAR_Z_INDEX = 10;

export const DrivePreviewScreen: React.FC<RootStackScreenProps<'DrivePreview'>> = (props) => {
  const { files, initialIndex } = props.route.params;
  const { previewFiles, activeIndex, activeFile, removalCount, changeActiveIndex, removeFiles, updateFileName } =
    useActivePreviewFile(files, initialIndex);
  const [topbarVisible, setTopbarVisible] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [downloadedFilePaths, setDownloadedFilePaths] = useState<Record<string, string>>({});
  const [videoThumbnailPaths, setVideoThumbnailPaths] = useState<Record<string, string>>({});

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
    const downloadedFileUuid = downloadingFile?.data.uuid;
    const downloadedFilePath = downloadingFile?.downloadedFilePath;
    if (!downloadedFileUuid || !downloadedFilePath) {
      return;
    }
    setDownloadedFilePaths((currentPaths) =>
      currentPaths[downloadedFileUuid] === downloadedFilePath
        ? currentPaths
        : { ...currentPaths, [downloadedFileUuid]: downloadedFilePath },
    );
  }, [downloadingFile?.data.uuid, downloadingFile?.downloadedFilePath]);

  useEffect(() => {
    const videoUuid = downloadingFile?.data.uuid;
    const videoPath = downloadingFile?.downloadedFilePath;
    if (
      !videoUuid ||
      !videoPath ||
      !VIDEO_PREVIEW_TYPES.has(downloadingFile.data.type as FileExtension) ||
      videoThumbnailPaths[videoUuid]
    ) {
      return;
    }
    generateVideoThumbnail(videoPath)
      .then((generatedThumbnail) => {
        setVideoThumbnailPaths((currentPaths) => ({ ...currentPaths, [videoUuid]: generatedThumbnail.path }));
      })
      .catch((err) => errorService.reportError(err));
  }, [downloadingFile?.data.uuid, downloadingFile?.downloadedFilePath]);

  useSyncPreviewFilesWithDrive({ activeFile, removeFiles, updateFileName });

  const isPreviewEmpty = previewFiles.length === 0;
  const { navigation } = props;
  const closePreview = useCallback(async () => {
    await dispatch(driveThunks.cancelDownloadThunk());
    dispatch(driveActions.clearDownloadingFile());
    navigation.goBack();
  }, [dispatch, navigation]);

  useEffect(() => {
    if (isPreviewEmpty) {
      closePreview();
    }
  }, [isPreviewEmpty, closePreview]);

  const focusedItemRef = useRef(focusedItem);
  focusedItemRef.current = focusedItem;

  const updateItemWithNewThumbnail = (thumbnail: Thumbnail, regeneratedFileUuid: string) => {
    const regeneratedFile = previewFiles.find((previewFile) => previewFile.uuid === regeneratedFileUuid);
    if (!regeneratedFile?.folderUuid) {
      return;
    }

    driveCtx.updateItemInTree(regeneratedFile.folderUuid, regeneratedFileUuid, {
      thumbnails: [thumbnail],
    });

    const currentFocusedItem = focusedItemRef.current;
    if (currentFocusedItem?.uuid !== regeneratedFileUuid) {
      return;
    }
    dispatch(
      driveActions.setFocusedItem({
        ...currentFocusedItem,
        thumbnails: [thumbnail],
      }),
    );
  };

  useThumbnailRegeneration(
    {
      downloadedFilePath: downloadedFilePaths[activeFile?.uuid],
      fileExtension: activeFile?.type,
      fileUuid: activeFile?.uuid,
      hasThumbnails: !!(activeFile?.thumbnails && activeFile.thumbnails.length > 0),
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

    if (Platform.OS === 'android') {
      if (topbarVisible) {
        NavigationBar.setVisibilityAsync('visible');
      } else {
        NavigationBar.setVisibilityAsync('hidden');
      }
    }
  }, [topbarVisible]);

  const handleActionsButtonPress = () => {
    dispatch(uiActions.setShowItemModal(true));
  };

  const renderPreviewPage = useCallback(
    (driveFile: DriveItemData, index: number) => (
      <DrivePreviewPage
        driveFile={driveFile}
        isActive={index === activeIndex}
        cachedFilePath={downloadedFilePaths[driveFile.uuid]}
        topbarVisible={topbarVisible}
        videoThumbnailPath={videoThumbnailPaths[driveFile.uuid]}
        pdfViewerSpacerHeight={pdfViewerSpacerHeight}
        onToggleTopbar={() => setTopbarVisible((isVisible) => !isVisible)}
        onHideTopbar={() => setTopbarVisible(false)}
        onZoomChange={setIsZoomed}
      />
    ),
    [activeIndex, downloadedFilePaths, topbarVisible, videoThumbnailPaths, pdfViewerSpacerHeight],
  );

  if (isPreviewEmpty) {
    return null;
  }

  return (
    <AppScreen className="flex-1">
      <Animated.View style={[styles.topBar, { paddingTop: insets.top, transform: [{ translateY: topbarYPosition }] }]}>
        <DrivePreviewScreenHeader
          title={getPreviewFileName(activeFile)}
          subtitle={time.getFormattedDate(activeFile.updatedAt, time.formats.dateAtTimeLong)}
          onCloseButtonPress={closePreview}
          onActionsButtonPress={handleActionsButtonPress}
        />
      </Animated.View>
      <DrivePreviewPager
        key={removalCount}
        previewFiles={previewFiles}
        initialIndex={activeIndex}
        scrollEnabled={!isZoomed}
        renderPreviewPage={renderPreviewPage}
        onActiveIndexChange={changeActiveIndex}
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    width: '100%',
    zIndex: TOP_BAR_Z_INDEX,
    backgroundColor: 'white',
  },
});
