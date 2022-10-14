import React, { useContext, useMemo } from 'react';
import { View, Image } from 'react-native';
import { GalleryItemType, PhotosItem, PhotoSyncStatus } from '../../types/photos';
import { CheckCircle, CloudSlash } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from 'src/hooks/useColor';
import { PhotosContext } from 'src/contexts/Photos';
import FastImage from 'react-native-fast-image';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import AppText from '../AppText';
import { time } from '@internxt-mobile/services/common/time';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { PhotosItemType } from '@internxt/sdk/dist/photos';
interface GalleryItemProps {
  type?: GalleryItemType;
  data: PhotosItem;
  onPress: (photosItem: PhotosItem) => void;
}

const GalleryItem: React.FC<GalleryItemProps> = (props) => {
  const photosCtx = useContext(PhotosContext);
  const getColor = useGetColor();
  const tailwind = useTailwind();
  const { onPress, data } = props;

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
    const item = uploadedItem || data;
    if (photosCtx.selection.selectionModeActivated) {
      isSelected ? photosCtx.selection.deselectPhotosItems([item]) : photosCtx.selection.selectPhotosItems([item]);
    } else {
      onPress(item);
    }
  };

  const handleOnLongPress = () => {
    if (!photosCtx.selection.selectionModeActivated) {
      const item = uploadedItem || data;
      photosCtx.selection.setSelectionModeActivated(true);
      photosCtx.selection.selectPhotosItems([item]);
    }
  };

  const useLocalUri = props.data.status !== PhotoSyncStatus.IN_SYNC_ONLY && data.localUri;

  return (
    <TouchableWithoutFeedback
      style={[{ width: '100%', height: '100%', overflow: 'hidden' }]}
      onPress={handleOnPress}
      onLongPress={handleOnLongPress}
    >
      {useLocalUri && (
        <Image
          style={tailwind('w-full h-full')}
          source={{
            uri: fileSystemService.pathToUri(data.localUri as string),
          }}
        />
      )}

      {uploadedItem && !data.localPreviewPath && (
        <FastImage
          style={tailwind('w-full h-full')}
          source={{
            uri: fileSystemService.pathToUri(uploadedItem.localPreviewPath),
          }}
        />
      )}
      {data.localPreviewPath && (
        <FastImage
          style={tailwind('w-full h-full')}
          source={{
            uri: fileSystemService.pathToUri(data.localPreviewPath),
          }}
        />
      )}

      {photosItem.type === PhotosItemType.VIDEO && !isSelected && photosItem.duration ? (
        <View style={[tailwind('absolute bottom-1 right-1.5 flex justify-center items-center rounded-xl')]}>
          <AppText medium style={tailwind('text-white text-xs')}>
            {time.fromSeconds(photosItem.duration).toFormat(time.formats.duration)}
          </AppText>
        </View>
      ) : null}
      {props.data.status === PhotoSyncStatus.IN_DEVICE_ONLY && !uploadedItem && (
        <View style={[tailwind('absolute w-5 h-5 bottom-1 left-1 flex justify-center items-center rounded-xl')]}>
          <CloudSlash color={getColor('text-white')} size={16} />
        </View>
      )}

      {isSelected && (
        <View
          style={[tailwind('absolute bg-blue-60 w-5 h-5 bottom-1 right-1 flex justify-center items-center rounded-xl')]}
        >
          <CheckCircle color={getColor('text-white')} size={24} />
        </View>
      )}
    </TouchableWithoutFeedback>
  );
};

export default React.memo(
  GalleryItem,
  (prev, next) =>
    prev.data.localPreviewPath === next.data.localPreviewPath &&
    prev.data.name === next.data.name &&
    prev.data.photoId === next.data.photoId,
);
