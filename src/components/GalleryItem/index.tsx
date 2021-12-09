import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';

import { getColor, tailwind } from '../../helpers/designSystem';
import { GalleryItemType } from '../../types';
import { Photo } from '@internxt/sdk';

interface GalleryItemProps {
  type?: GalleryItemType;
  size: number;
  data: Photo;
  isSelected: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

const defaultProps: Partial<GalleryItemProps> = {
  type: GalleryItemType.Image,
};

const GalleryItem = ({
  type = defaultProps.type as GalleryItemType,
  size,
  data,
  isSelected,
  onPress,
  onLongPress,
}: GalleryItemProps): JSX.Element => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const examplePhoto = '';
  const getItemContent = () =>
    ({
      [GalleryItemType.Image]: () => <Image style={tailwind('w-full h-full')} source={{ uri: examplePhoto }} />,
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
