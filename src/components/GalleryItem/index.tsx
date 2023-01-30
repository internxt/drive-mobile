import React, { useContext, useMemo, useState } from 'react';
import { View, Image } from 'react-native';
import { GalleryItemType, PhotosItem, PhotosSyncStatus, PhotoSyncStatus } from '../../types/photos';
import { ArrowUp, CheckCircle, CloudSlash, EyeSlash } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from 'src/hooks/useColor';
import { PhotosContext } from 'src/contexts/Photos';
import FastImage from 'react-native-fast-image';
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

  const isUploading = photosCtx?.uploadingPhotosItem?.name === data.name;
  const isPullingRemotePhotos = photosCtx?.sync.status === PhotosSyncStatus.PullingRemotePhotos;

  const uploadedItem = useMemo(
    () => photosCtx.uploadedPhotosItems.find((uploaded) => uploaded.name === data.name),
    [photosCtx.uploadedPhotosItems, data.name],
  );

  const photosItem = uploadedItem || props.data;
  const isSelected = useMemo(
    () => photosCtx.selection.isPhotosItemSelected(data),
    [photosCtx.selection.selectedPhotosItems],
  );

  const handleOnPress = () => {
    // Mix the just uploaded item and the props item
    // so we get an updated item with both items properties
    const item = {
      ...uploadedItem,
      ...data,
    };
    if (photosCtx.selection.selectionModeActivated) {
      isSelected ? photosCtx.selection.deselectPhotosItems([item]) : photosCtx.selection.selectPhotosItems([item]);
    } else {
      onPress(data);
    }
  };

  const handleOnLongPress = () => {
    if (!photosCtx.selection.selectionModeActivated) {
      const item = uploadedItem || data;
      photosCtx.selection.setSelectionModeActivated(true);
      photosCtx.selection.selectPhotosItems([item]);
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

  const useLocalUri = props.data.status !== PhotoSyncStatus.IN_SYNC_ONLY && data.localUri;

  const canShowNotUploadedIcon = () => {
    return (
      props.data.status === PhotoSyncStatus.IN_DEVICE_ONLY && !uploadedItem && !isUploading && !isPullingRemotePhotos
    );
  };

  const isBeingUploaded = () => {
    return isUploading && !uploadedItem;
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
  return (
    <TouchableWithoutFeedback
      style={[{ width: '100%', height: '100%', overflow: 'hidden' }]}
      onPress={handleOnPress}
      onLongPress={handleOnLongPress}
    >
      {/* Used to display the camera roll previews, mostly for iOS */}
      {/* Looks like FastImage doesn't support ph:// uris, RN Image does */}
      {useLocalUri && !PRIVATE_MODE_ENABLED && DISPLAY_LOCAL_PHOTOS && (
        <Image
          onError={handlePreviewLoadError}
          style={tailwind('w-full h-full')}
          source={{
            uri: fileSystemService.pathToUri(data.localUri as string),
          }}
        />
      )}

      {/* Used to display the previews that are just uploaded */}
      {uploadedItem && !data.localPreviewPath && !PRIVATE_MODE_ENABLED && (
        <FastImage
          onError={handlePreviewLoadError}
          style={tailwind('w-full h-full')}
          source={{
            uri: fileSystemService.pathToUri(uploadedItem.localPreviewPath),
          }}
        />
      )}
      {/* Used to display the previews we have in the filesystem */}
      {data.localPreviewPath && !useLocalUri && !retrievedPreviewUri && !PRIVATE_MODE_ENABLED && (
        <FastImage
          onError={handlePreviewLoadError}
          style={tailwind('w-full h-full')}
          source={{
            uri: fileSystemService.pathToUri(data.localPreviewPath),
          }}
        />
      )}

      {/* Used in case the preview is failing and it was retried */}
      {retrievedPreviewUri && !useLocalUri && !PRIVATE_MODE_ENABLED && (
        <FastImage
          onError={handlePreviewLoadError}
          style={tailwind('w-full h-full')}
          source={{
            uri: fileSystemService.pathToUri(retrievedPreviewUri),
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
            tailwind('absolute bg-blue-60 w-5 h-5 bottom-1 right-1 flex justify-center items-center rounded-xl z-10'),
          ]}
        >
          <CheckCircle color={getColor('text-white')} size={24} />
        </View>
      )}
      {!PRIVATE_MODE_ENABLED ? (
        <View style={tailwind('absolute bottom-0 left-0 h-12 w-full')}>{renderGradient()}</View>
      ) : null}
    </TouchableWithoutFeedback>
  );
};

export default GalleryItem;
