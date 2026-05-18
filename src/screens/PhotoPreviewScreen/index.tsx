import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { logger } from 'src/services/common';
import { toFileUri } from 'src/services/common/uri/uriHelpers';
import fileSystemService from 'src/services/FileSystemService';
import { PhotoAssetFetchService } from 'src/services/photos/PhotoAssetFetchService';
import { RootStackScreenProps } from 'src/types/navigation';
import { useTailwind } from 'tailwind-rn';
import { MetadataPanel } from './components/MetadataPanel';
import { PreviewCarousel } from './components/PreviewCarousel';
import { PreviewHeader } from './components/PreviewHeader';
import { PreviewPager } from './components/PreviewPager';
import { usePreviewItems } from './hooks/usePreviewItems';

type Props = RootStackScreenProps<'PhotoPreview'>;

export const PhotoPreviewScreen = ({ route }: Props): JSX.Element => {
  const { initialId, items: routeItems } = route.params;
  const { items, currentIndex, setCurrentIndex } = usePreviewItems(initialId, routeItems);
  const tailwind = useTailwind();
  const navigation = useNavigation();

  const [isUiVisible, setIsUiVisible] = useState(true);
  const [zoomActive, setZoomActive] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [hasVideoStarted, setHasVideoStarted] = useState(false);
  const [videoResetKey, setVideoResetKey] = useState(0);

  const resetVideoPlayer = useCallback(() => setVideoResetKey((key) => key + 1), []);

  const handleTap = useCallback(() => {
    setIsUiVisible((visible) => !visible);
  }, []);

  const handleZoomChange = useCallback((zoomed: boolean) => {
    setZoomActive(zoomed);
    if (zoomed) {
      setIsUiVisible(false);
    }
  }, []);

  const handleSwipeDown = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const exitVideoMode = useCallback(() => {
    setHasVideoStarted(false);
    resetVideoPlayer();
    setIsUiVisible(true);
  }, [resetVideoPlayer]);

  const closePreviewScreen = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    if (hasVideoStarted) {
      exitVideoMode();
    } else {
      closePreviewScreen();
    }
  }, [hasVideoStarted, exitVideoMode, closePreviewScreen]);

  const handleVideoPlay = useCallback(() => {
    setHasVideoStarted(true);
    setIsUiVisible(false);
  }, []);

  const handleVideoPause = useCallback(() => {
    setIsUiVisible(true);
  }, []);

  const handleVideoEnd = useCallback(() => {
    setHasVideoStarted(false);
    setIsUiVisible(true);
  }, []);

  const handleExport = useCallback(async () => {
    const item = items[currentIndex];
    if (!item) {
      return;
    }

    const controller = new AbortController();
    try {
      const uri = await PhotoAssetFetchService.fetchUri(item, controller.signal);
      if (!uri) {
        return;
      }
      const fileUri = toFileUri(uri);
      await fileSystemService.shareFile({ title: '', fileUri });
    } catch (error) {
      logger.error(`[PhotoPreview] Export failed: ${error}`);
    }
  }, [items, currentIndex]);

  const showCarousel = isUiVisible && !zoomActive && !hasVideoStarted;
  const currentItem = items[currentIndex];

  return (
    <View style={tailwind('flex-1 bg-black')}>
      <StatusBar hidden />
      <PreviewPager
        items={items}
        initialIndex={currentIndex}
        activeIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        onTap={handleTap}
        onZoomChange={handleZoomChange}
        onSwipeDown={handleSwipeDown}
        onVideoPlay={handleVideoPlay}
        onVideoPause={handleVideoPause}
        onVideoEnd={handleVideoEnd}
        videoResetKey={videoResetKey}
        hasVideoStarted={hasVideoStarted}
      />
      <PreviewHeader
        visible={isUiVisible}
        item={currentItem}
        onClose={handleClose}
        onMore={() => setMetadataOpen(true)}
      />
      {showCarousel && (
        <PreviewCarousel
          items={items}
          currentIndex={currentIndex}
          onPress={setCurrentIndex}
          visible={isUiVisible}
          onExport={handleExport}
          onMore={() => setMetadataOpen(true)}
        />
      )}
      {metadataOpen && currentItem && <MetadataPanel item={currentItem} onClose={() => setMetadataOpen(false)} />}
    </View>
  );
};
