import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';

import PhotosPermissionsScreen from '../screens/PhotosPermissionsScreen';
import PhotosGalleryScreen from '../screens/PhotosGalleryScreen';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { photosSelectors, photosThunks } from '../store/slices/photos';
import strings from '../../assets/lang/strings';
import AppButton from '../components/AppButton';
import { PhotosStackParamList } from '../types/navigation';
import { PermissionStatus } from 'expo-media-library';
import { useTailwind } from 'tailwind-rn';

const StackNav = createNativeStackNavigator<PhotosStackParamList>();

function PhotosNavigator(): JSX.Element {
  const tailwind = useTailwind();
  const [isInitialized, setIsInitialized] = useState(false);
  const { initializeError } = useAppSelector((state) => state.photos);

  const permissionsStatus = useAppSelector(photosSelectors.permissionsStatus);

  const initialRouteName: keyof PhotosStackParamList =
    permissionsStatus === PermissionStatus.GRANTED ? 'PhotosGallery' : 'PhotosPermissions';
  const dispatch = useAppDispatch();
  const startUsingPhotos = async () => {
    await dispatch(photosThunks.startUsingPhotosThunk());
  };
  const onTryAgainInitializeButtonPressed = () => {
    startUsingPhotos();
  };

  useEffect(() => {
    dispatch(photosThunks.checkPermissionsThunk())
      .unwrap()
      .then((result) => {
        if (result.hasPermissions) {
          return startUsingPhotos();
        }
      })
      .finally(() => setIsInitialized(true));
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
              title={strings.buttons.tryAgain}
              onPress={onTryAgainInitializeButtonPressed}
            />
          </View>
        </View>
      )}
    </>
  );
}

export default PhotosNavigator;
