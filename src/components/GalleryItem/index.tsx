import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Image, Animated, Easing } from 'react-native';
import { GalleryItemType, PhotosItem, PhotosSyncStatus, PhotoSyncStatus } from '../../types/photos';
import { ArrowUp, CheckCircle, CloudSlash, EyeSlash } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from 'src/hooks/useColor';
import { PhotosContext } from 'src/contexts/Photos';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import AppText from '../AppText';
import { time } from '@internxt-mobile/services/common/time';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { PhotosItemType } from '@internxt/sdk/dist/photos';
import photos from '@internxt-mobile/services/photos';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingSpinner from '../LoadingSpinner';
import errorService from '@internxt-mobile/services/ErrorService';
import { PRIVATE_MODE_ENABLED } from '@internxt-mobile/services/photos/constants';
import appService from '@internxt-mobile/services/AppService';
interface GalleryItemProps {
  type?: GalleryItemType;
  data: PhotosItem;
  onPress: (photosItem: PhotosItem) => void;
}

const DISPLAY_LOCAL_PHOTOS = true;
const GalleryItem: React.FC<GalleryItemProps> = (props) => {
  const photosCtx = useContext(PhotosContext);
  const getColor = useGetColor();
  const tailwind = useTailwind();
  const [retrievedPreviewUri, setRetrievedPreviewUri] = useState<string | null>(null);
  const { onPress, data } = props;
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    if (data.localUri) {
      fadeAnim.stopAnimation();
    }
  }, [data.localUri]);

  const isUploading = photosCtx?.uploadingPhotosItem?.name === data.name;
  const isPullingRemotePhotos = photosCtx?.sync.status === PhotosSyncStatus.PullingRemotePhotos;

  const uploadedItem = useMemo(
    () =>
      photosCtx.uploadedPhotosItems.find(
        (uploaded) => uploaded.name === data.name && uploaded.takenAt === data.takenAt,
      ),
    [photosCtx.uploadedPhotosItems, data],
  );

  const photosItem = uploadedItem || props.data;
  const isSelected = useMemo(
    () => photosCtx.selection.isPhotosItemSelected(data),
    [photosCtx.selection.selectedPhotosItems],
  );

  const handleOnPress = () => {
    if (photosCtx.selection.selectionModeActivated) {
      isSelected
        ? photosCtx.selection.deselectPhotosItems([photosItem])
        : photosCtx.selection.selectPhotosItems([photosItem]);
    } else {
      onPress(photosItem);
    }
  };

  const handleOnLongPress = () => {
    if (!photosCtx.selection.selectionModeActivated) {
      photosCtx.selection.setSelectionModeActivated(true);
      photosCtx.selection.selectPhotosItems([photosItem]);
    }
  };

  const handlePreviewLoadError = async () => {
    try {
      const preview = await photos.preview.getPreview(photosItem);
      setRetrievedPreviewUri(preview);
    } catch {
      errorService.reportError(new Error('Unable to load preview'), {
        extra: {
          previewId: photosItem.previewFileId,
        },
      });
    }
  };

  const canShowNotUploadedIcon = () => {
    // If is Android we are running
    // native mobile sdk, we don't have progress report here
    // so we just show the not synced icon until we receive an
    // item synced event
    if (appService.isAndroid) {
      return props.data.status === PhotoSyncStatus.IN_DEVICE_ONLY && !uploadedItem;
    }
    return (
      props.data.status === PhotoSyncStatus.IN_DEVICE_ONLY && !uploadedItem && !isUploading && !isPullingRemotePhotos
    );
  };

  const isBeingUploaded = () => {
    // On Android we don't have upload reporting
    return isUploading && !uploadedItem && !appService.isAndroid;
  };
  const renderGradient = () => {
    return (
      <LinearGradient
        style={tailwind('w-full h-full')}
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.15)', 'rgba(0, 0, 0, 0.25)']}
        locations={[0.5, 0.75, 1]}
      />
    );
  };

  const shouldRenderGradient = !PRIVATE_MODE_ENABLED && data.localUri;
  return (
    <TouchableWithoutFeedback
      style={[{ width: '100%', height: '100%', overflow: 'hidden' }]}
      onPress={handleOnPress}
      onLongPress={handleOnLongPress}
    >
      <Animated.View style={[tailwind('bg-gray-5 w-full h-full'), { opacity: data.localPreviewPath ? 1 : fadeAnim }]}>
        {/* Used to display the camera roll previews, mostly for iOS */}
        {/* Looks like FastImage doesn't support ph:// uris, RN Image does */}
        {!retrievedPreviewUri && data.localPreviewPath && !PRIVATE_MODE_ENABLED && DISPLAY_LOCAL_PHOTOS && (
          <Image
            onError={handlePreviewLoadError}
            style={tailwind('w-full h-full')}
            source={{
              uri: fileSystemService.pathToUri(data.localPreviewPath as string),
            }}
          />
        )}

        {/* Fallback when we regenerate the preview */}
        {retrievedPreviewUri && !PRIVATE_MODE_ENABLED && DISPLAY_LOCAL_PHOTOS && (
          <Image
            style={tailwind('w-full h-full')}
            source={{
              uri: fileSystemService.pathToUri(retrievedPreviewUri as string),
            }}
          />
        )}

        {PRIVATE_MODE_ENABLED && (
          <View style={tailwind('w-full h-full flex items-center justify-center bg-gray-30')}>
            <EyeSlash />
          </View>
        )}

        {photosItem.type === PhotosItemType.VIDEO && !isSelected && photosItem.duration ? (
          <View style={[tailwind('absolute bottom-1 right-1.5 flex justify-center items-center rounded-xl z-10')]}>
            <AppText medium style={tailwind('text-white text-xs')}>
              {time.fromSeconds(photosItem.duration).toFormat(time.formats.duration)}
            </AppText>
          </View>
        ) : null}
        {canShowNotUploadedIcon() && (
          <View style={[tailwind('absolute w-5 h-5 bottom-1 left-1 flex justify-center items-center rounded-xl z-10')]}>
            <CloudSlash color={getColor('text-white')} size={16} />
          </View>
        )}
        {isBeingUploaded() && (
          <View style={tailwind('absolute bottom-1 left-1 flex justify-center items-center rounded-xl z-10')}>
            <View style={tailwind('mb-0.5')}>
              <LoadingSpinner
                progress={photosCtx.uploadProgress}
                size={18}
                color={tailwind('text-white').color as string}
                useDefaultSpinner
                fill={'rgba(0,0,0,0.25)'}
              >
                <ArrowUp weight="bold" color={tailwind('text-white').color as string} size={12} />
              </LoadingSpinner>
            </View>
          </View>
        )}

        {isSelected && (
          <View
            style={[
              tailwind('absolute bg-primary w-5 h-5 bottom-1 right-1 flex justify-center items-center rounded-xl z-10'),
            ]}
          >
            <CheckCircle color={getColor('text-white')} size={24} />
          </View>
        )}
        {shouldRenderGradient ? (
          <View style={tailwind('absolute bottom-0 left-0 h-12 w-full')}>{renderGradient()}</View>
        ) : null}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default GalleryItem;
