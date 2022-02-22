import React, { useState } from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';

import { getColor, tailwind } from '../../helpers/designSystem';
import { Photo } from '@internxt/sdk/dist/photos';
import { GalleryItemType } from '../../types/photos';

interface GalleryItemProps {
  type?: GalleryItemType;
  size: number;
  data: Photo;
  preview: string;
  isSelected: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

const defaultProps: Partial<GalleryItemProps> = {
  type: GalleryItemType.Image,
};

const GalleryItem = ({
  data,
  type = defaultProps.type as GalleryItemType,
  size,
  preview,
  isSelected,
  onPress,
  onLongPress,
}: GalleryItemProps): JSX.Element => {
  const [uri] = useState(preview);
  const getItemContent = () =>
    ({
      [GalleryItemType.Image]: () => <Image style={tailwind('w-full h-full')} source={{ uri }} />,
    }[type]());

  console.log('Rendering GalleryItem: ', data.id);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[tailwind('bg-neutral-30'), { width: size, height: size }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {getItemContent()}

      {isSelected && (
        <View
          style={[tailwind('absolute bg-blue-60 w-5 h-5 bottom-3 right-3 flex justify-center items-center rounded-xl')]}
        >
          <Unicons.UilCheckCircle color={getColor('white')} size={30} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default GalleryItem;
