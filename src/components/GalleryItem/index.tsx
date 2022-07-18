import React from 'react';
import { View, TouchableOpacity } from 'react-native';

import { Photo } from '@internxt/sdk/dist/photos';
import { GalleryItemType, PhotoWithPreview } from '../../types/photos';
import { CheckCircle } from 'phosphor-react-native';
import FastImage from 'react-native-fast-image';
import { useTailwind } from 'tailwind-rn';
import useGetColor from 'src/hooks/useColor';

interface GalleryItemProps {
  type?: GalleryItemType;
  size: number;
  data: PhotoWithPreview;
  isSelected: boolean;
  onPress?: (photo: Photo, preview: string | null) => void;
  onLongPress?: (photo: Photo, preview: string | null) => void;
}

const GalleryItem: React.FC<GalleryItemProps> = (props) => {
  const getColor = useGetColor();
  const tailwind = useTailwind();
  const { onPress, data, size, onLongPress, isSelected } = props;
  const { resolvedPreview } = data;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[tailwind('bg-white'), { width: size, height: size }]}
      onPress={() => onPress && resolvedPreview && onPress(data, resolvedPreview)}
      onLongPress={() => onLongPress && resolvedPreview && onLongPress(data, resolvedPreview)}
    >
      {resolvedPreview && (
        <FastImage
          style={tailwind('w-full h-full')}
          source={{
            uri: resolvedPreview,
          }}
        />
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

export default GalleryItem;
