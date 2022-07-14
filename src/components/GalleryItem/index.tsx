import React from 'react';
import { View, TouchableOpacity } from 'react-native';

import { getColor, tailwind } from '../../helpers/designSystem';
import { Photo } from '@internxt/sdk/dist/photos';
import { GalleryItemType, PhotoWithPreview } from '../../types/photos';
import { CheckCircle } from 'phosphor-react-native';
import FastImage from 'react-native-fast-image';

interface GalleryItemProps {
  type?: GalleryItemType;
  size: number;
  data: PhotoWithPreview;
  isSelected: boolean;
  onPress?: (photo: Photo, preview: string | null) => void;
  onLongPress?: (photo: Photo, preview: string | null) => void;
}

class GalleryItem extends React.PureComponent<GalleryItemProps> {
  constructor(props: GalleryItemProps) {
    super(props);
  }

  render(): React.ReactNode {
    const { onPress, data, size, onLongPress, isSelected } = this.props;
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
            style={[
              tailwind('absolute bg-blue-60 w-5 h-5 bottom-3 right-3 flex justify-center items-center rounded-xl'),
            ]}
          >
            <CheckCircle color={getColor('white')} size={30} />
          </View>
        )}
      </TouchableOpacity>
    );
  }
}

export default GalleryItem;
