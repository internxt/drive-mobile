import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhotosPermissionsScreen from '../screens/PhotosPermissionsScreen';
import PhotosGalleryScreen from '../screens/PhotosGalleryScreen';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { photosSelectors, photosThunks } from '../store/slices/photos';
import { PhotosStackParamList } from '../types/navigation';
import { PermissionStatus } from 'expo-media-library';
const StackNav = createNativeStackNavigator<PhotosStackParamList>();

function PhotosNavigator(): JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);

  const permissionsStatus = useAppSelector(photosSelectors.permissionsStatus);

  const initialRouteName: keyof PhotosStackParamList =
    permissionsStatus === PermissionStatus.GRANTED ? 'PhotosGallery' : 'PhotosPermissions';
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(photosThunks.checkPermissionsThunk())
      .unwrap()
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
    </>
  );
}

export default PhotosNavigator;
