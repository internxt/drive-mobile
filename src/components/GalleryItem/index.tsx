import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { GalleryItemType, PhotosItem, PhotoSyncStatus } from '../../types/photos';
import { CheckCircle, CloudSlash } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from 'src/hooks/useColor';
import { LinearGradient } from 'expo-linear-gradient';
interface GalleryItemProps {
  type?: GalleryItemType;
  size: number;
  data: PhotosItem;
  isSelected: boolean;
  onPress: (photosItem: PhotosItem) => void;
  onLongPress: (photosItem: PhotosItem) => void;
}

const GalleryItem: React.FC<GalleryItemProps> = (props) => {
  const getColor = useGetColor();
  const tailwind = useTailwind();
  const { onPress, data, size, onLongPress, isSelected } = props;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[{ width: size, height: size }]}
      onPress={() => onPress(data)}
      onLongPress={() => onLongPress(data)}
    >
      {!data.localUri && (
        <LinearGradient
          style={tailwind('w-full h-full')}
          colors={['#F9F9FC', '#FFFFFF', '#F9F9FC']}
          start={{ x: 0.7, y: 0 }}
        />
      )}
      {data.localUri && (
        <Image
          style={tailwind('w-full h-full')}
          source={{
            uri: data.localUri,
          }}
        />
      )}

      {props.data.status === PhotoSyncStatus.IN_DEVICE_ONLY && (
        <View style={[tailwind('absolute w-5 h-5 bottom-3 left-3 flex justify-center items-center rounded-xl')]}>
          <CloudSlash color={getColor('text-white')} size={20} />
        </View>
      )}

      {isSelected && (
        <View
          style={[tailwind('absolute bg-blue-60 w-5 h-5 bottom-3 right-3 flex justify-center items-center rounded-xl')]}
        >
          <CheckCircle color={getColor('text-white')} size={30} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default React.memo(GalleryItem, (prev, next) => prev.data.localUri === next.data.localUri);
