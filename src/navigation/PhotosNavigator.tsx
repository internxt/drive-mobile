import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PhotosPermissionsScreen from '../screens/PhotosPermissionsScreen';
import PhotosGalleryScreen from '../screens/PhotosGalleryScreen';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { photosSelectors, photosThunks } from '../store/slices/photos';
import strings from '../../assets/lang/strings';
import { Text, View } from 'react-native';
import { tailwind } from '../helpers/designSystem';
import AppButton from '../components/AppButton';
import { PhotosStackParamList } from '../types/photos';

const StackNav = createNativeStackNavigator<PhotosStackParamList>();

function PhotosNavigator(): JSX.Element {
  const { isInitialized, initializeError } = useAppSelector((state) => state.photos);
  const arePermissionsGranted = useAppSelector(photosSelectors.arePermissionsGranted);
  const initialRouteName: keyof PhotosStackParamList = arePermissionsGranted ? 'PhotosGallery' : 'PhotosPermissions';
  const dispatch = useAppDispatch();
  const startUsingPhotos = async () => {
    await dispatch(photosThunks.startUsingPhotosThunk());
  };
  const onTryAgainInitializeButtonPressed = () => {
    startUsingPhotos();
  };

  useEffect(() => {
    startUsingPhotos();
  }, []);

  return (
    <>
      {isInitialized && (
        <StackNav.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
          <StackNav.Screen name={'PhotosPermissions'} component={PhotosPermissionsScreen} />
          <StackNav.Screen name={'PhotosGallery'} component={PhotosGalleryScreen} />
        </StackNav.Navigator>
      )}

      {initializeError && (
        <View style={tailwind('flex-1 items-center justify-center')}>
          <View style={tailwind('px-5')}>
            <Text style={tailwind('text-red-60')}>
              {strings.formatString(strings.errors.photosInitialize, initializeError)}
            </Text>
            <AppButton
              style={tailwind('mt-5')}
              type="accept"
              title={strings.components.buttons.tryAgain}
              onPress={onTryAgainInitializeButtonPressed}
            />
          </View>
        </View>
      )}
    </>
  );
}

export default PhotosNavigator;
