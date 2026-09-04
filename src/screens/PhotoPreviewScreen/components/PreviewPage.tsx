import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, View, useWindowDimensions } from 'react-native';
import { logger } from 'src/services/common';
import { useTailwind } from 'tailwind-rn';
import { VideoViewer } from '../../../components/photos/VideoViewer/VideoViewer';
import { ImageViewer } from '../../../components/ui-kit/view/ImageViewer/ImageViewer';
import { TimelinePhotoItem } from '../../PhotosScreen/types';
import { useCloudThumbnailBackfill } from '../hooks/useCloudThumbnailBackfill';
import { usePreviewSource } from '../hooks/usePreviewSource';

const VIDEO_ACTIVATION_DELAY_MS = 200;

interface ThumbnailFallbackProps {
  itemId: string;
  thumbnailUri: string | null;
  isLoading: boolean;
  mediaLabel: 'video' | 'photo';
  containerClassName: string;
}

const ThumbnailFallback = ({
  itemId,
  thumbnailUri,
  isLoading,
  mediaLabel,
  containerClassName,
}: ThumbnailFallbackProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <View style={tailwind(containerClassName)}>
      {thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={tailwind('w-full h-full')}
          resizeMode="contain"
          onError={(e) =>
            logger.error(
              `[PreviewPage] ${mediaLabel} thumbnail failed to load — id: ${itemId}, uri: ${thumbnailUri}, error: ${e.nativeEvent.error}`,
            )
          }
        />
      ) : null}
      {isLoading ? <ActivityIndicator style={tailwind('absolute')} color="white" size="large" /> : null}
    </View>
  );
};

interface PageContentProps {
  item: TimelinePhotoItem;
  uri: string | null;
  thumbnailUri: string | null;
  isLoading: boolean;
  isActive: boolean;
  onTap: () => void;
  onZoom: () => void;
  onReset: () => void;
  onVideoPlay: () => void;
  onVideoPause: () => void;
  onVideoEnd: () => void;
  videoResetKey?: number;
}

const PageContent = ({
  item,
  uri,
  thumbnailUri,
  isLoading,
  isActive,
  onTap,
  onZoom,
  onReset,
  onVideoPlay,
  onVideoPause,
  onVideoEnd,
  videoResetKey,
}: PageContentProps): JSX.Element => {
  if (item.mediaType === 'video') {
    if (uri && isActive) {
      return (
        <VideoViewer
          key={videoResetKey}
          source={uri}
          thumbnail={thumbnailUri ?? undefined}
          onPlay={onVideoPlay}
          onPause={onVideoPause}
          onEnd={onVideoEnd}
        />
      );
    }
    return (
      <ThumbnailFallback
        itemId={item.id}
        thumbnailUri={thumbnailUri}
        isLoading={isLoading}
        mediaLabel="video"
        containerClassName="flex-1 bg-black justify-center items-center"
      />
    );
  }

  if (uri) {
    return <ImageViewer source={uri} onTapImage={onTap} onZoomImage={onZoom} onImageViewReset={onReset} />;
  }

  return (
    <ThumbnailFallback
      itemId={item.id}
      thumbnailUri={thumbnailUri}
      isLoading={isLoading}
      mediaLabel="photo"
      containerClassName="flex-1 justify-center items-center"
    />
  );
};

interface PreviewPageProps {
  item: TimelinePhotoItem;
  isActive: boolean;
  isScrubbing: boolean;
  onTap: () => void;
  onZoomChange: (zoomed: boolean) => void;
  onVideoPlay?: () => void;
  onVideoPause?: () => void;
  onVideoEnd?: () => void;
  videoResetKey?: number;
}

export const PreviewPage = ({
  item,
  isActive,
  isScrubbing,
  onTap,
  onZoomChange,
  onVideoPlay,
  onVideoPause,
  onVideoEnd,
  videoResetKey,
}: PreviewPageProps): JSX.Element => {
  const tailwind = useTailwind();
  const { width: screenWidth } = useWindowDimensions();
  const { uri, thumbnailUri, isLoading } = usePreviewSource(item, isScrubbing);
  useCloudThumbnailBackfill(item, uri);
  const [isVideoActive, setIsVideoActive] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsVideoActive(false);
      return;
    }
    const activateVideoTimer = setTimeout(() => setIsVideoActive(true), VIDEO_ACTIVATION_DELAY_MS);
    return () => clearTimeout(activateVideoTimer);
  }, [isActive]);

  const handleZoom = useCallback(() => {
    onZoomChange(true);
  }, [onZoomChange]);

  const handleReset = useCallback(() => {
    onZoomChange(false);
  }, [onZoomChange]);

  const playVideo = useCallback(() => {
    onVideoPlay?.();
  }, [onVideoPlay]);

  const pauseVideo = useCallback(() => {
    onVideoPause?.();
  }, [onVideoPause]);

  const endVideo = useCallback(() => {
    onVideoEnd?.();
  }, [onVideoEnd]);

  return (
    <View style={[tailwind('flex-1 bg-black'), { width: screenWidth }]}>
      <PageContent
        item={item}
        uri={uri}
        thumbnailUri={thumbnailUri}
        isLoading={isLoading}
        isActive={isVideoActive}
        onTap={onTap}
        onZoom={handleZoom}
        onReset={handleReset}
        onVideoPlay={playVideo}
        onVideoPause={pauseVideo}
        onVideoEnd={endVideo}
        videoResetKey={videoResetKey}
      />
    </View>
  );
};
