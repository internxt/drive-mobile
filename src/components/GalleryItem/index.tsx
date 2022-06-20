import React, { useEffect, useState } from 'react';
import { View, Image, TouchableOpacity } from 'react-native';

import { getColor, tailwind } from '../../helpers/designSystem';
import { Photo } from '@internxt/sdk/dist/photos';
import { GalleryItemType } from '../../types/photos';
import { CheckCircle } from 'phosphor-react-native';
import { useDispatch } from 'react-redux';
import { photosThunks } from '../../store/slices/photos';
import { unwrapResult } from '@reduxjs/toolkit';
import { useAppDispatch } from '../../store/hooks';

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
  isSelected,
  onPress,
  data,
  onLongPress,
}: GalleryItemProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const [photoPreview, setPhotoPreview] = useState<null | string>(null);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    const result = await dispatch(photosThunks.getPreviewThunk({ photo: data })).unwrap();
    setPhotoPreview(result);
  };

  const getItemContent = () =>
    ({
      [GalleryItemType.Image]: () => (
        <Image style={tailwind('w-full h-full')} source={{ uri: photoPreview || undefined }} />
      ),
    }[type]());

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
          <CheckCircle color={getColor('white')} size={30} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default GalleryItem;
