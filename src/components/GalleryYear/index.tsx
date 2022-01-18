import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View, Text, TouchableWithoutFeedback, ImageBackground } from 'react-native';
import { tailwind } from '../../helpers/designSystem';
import imageService from '../../services/image';
import { useAppDispatch } from '../../store/hooks';
import { photosActions } from '../../store/slices/photos';
import { GalleryViewMode } from '../../types/photos';

interface GalleryYearProps {
  year: number;
  preview: string;
}

const GalleryYear = (props: GalleryYearProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const onYearPressed = () => {
    dispatch(photosActions.setViewMode(GalleryViewMode.Months));
    // TODO: scroll up to beginning of the month
  };

  return (
    <TouchableWithoutFeedback onPress={onYearPressed}>
      <View style={[tailwind('mb-5 w-full rounded-lg bg-neutral-30'), { aspectRatio: 2 / 1 }]}>
        <ImageBackground
          source={{ uri: props.preview }}
          resizeMode="cover"
          style={tailwind('w-full h-full')}
          imageStyle={tailwind('rounded-lg')}
        >
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0)', 'transparent']}
            style={tailwind('rounded-lg h-full w-full')}
          >
            <Text style={tailwind('p-5 text-white text-2xl font-semibold')}>{props.year}</Text>
          </LinearGradient>
        </ImageBackground>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default GalleryYear;
