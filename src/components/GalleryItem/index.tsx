import React from 'react';
import { Image, TouchableOpacity } from 'react-native';

import { tailwind } from '../../helpers/designSystem';

enum GalleryItemType {
  Image = 'image',
}

interface GalleryItemProps {
  type?: GalleryItemType;
  size: number;
  uri: string;
  isSelected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

const defaultProps: Partial<GalleryItemProps> = {
  type: GalleryItemType.Image,
};

const GalleryItem = ({ type = defaultProps.type, size, uri, onPress, onLongPress }: GalleryItemProps) => {
  const getItemContent = () =>
    ({
      [GalleryItemType.Image]: () => <Image style={tailwind('w-full h-full')} source={{ uri }} />,
    }[type]());

  return (
    <TouchableOpacity style={[{ width: size, height: size }]} onPress={onPress} onLongPress={onLongPress}>
      {getItemContent()}
    </TouchableOpacity>
  );
};

export default GalleryItem;
