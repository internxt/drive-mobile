import React, { useContext, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhotosPermissionsScreen from '../screens/PhotosPermissionsScreen';
import PhotosGalleryScreen from '../screens/PhotosGalleryScreen';
import { PhotosStackParamList } from '../types/navigation';
import { PermissionStatus } from 'expo-media-library';
import { PhotosContext } from 'src/contexts/Photos';
const StackNav = createNativeStackNavigator<PhotosStackParamList>();

function PhotosNavigator(): JSX.Element {
  const photosCtx = useContext(PhotosContext);
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionsStatus, setPermissionsStatus] = useState(PermissionStatus.UNDETERMINED);

  const initialRouteName: keyof PhotosStackParamList =
    permissionsStatus === PermissionStatus.GRANTED ? 'PhotosGallery' : 'PhotosPermissions';

  useEffect(() => {
    photosCtx.permissions.getPermissionsStatus().then((status) => {
      setPermissionsStatus(status);
      setIsInitialized(true);
    });
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
