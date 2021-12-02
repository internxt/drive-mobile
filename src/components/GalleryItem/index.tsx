import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';

import { getColor, tailwind } from '../../helpers/designSystem';

enum GalleryItemType {
  Image = 'image',
}

interface GalleryItemProps {
  type?: GalleryItemType;
  size: number;
  uri: string;
  isSelected: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

const defaultProps: Partial<GalleryItemProps> = {
  type: GalleryItemType.Image,
};

const GalleryItem = ({
  type = defaultProps.type,
  size,
  uri,
  isSelected,
  onPress,
  onLongPress,
}: GalleryItemProps): JSX.Element => {
  const getItemContent = () =>
    ({
      [GalleryItemType.Image]: () => <Image style={tailwind('w-full h-full')} source={{ uri }} />,
    }[type]());

  return (
    <TouchableOpacity
      style={[tailwind('bg-black'), { width: size, height: size }]}
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
