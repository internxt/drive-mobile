import React, { useContext, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhotosGalleryiOSScreen from '../screens/PhotosGalleryScreen/index.ios';
import { PhotosStackParamList } from '../types/navigation';
import { PermissionStatus } from 'expo-media-library';
import { PhotosContext } from 'src/contexts/Photos';
const StackNav = createNativeStackNavigator<PhotosStackParamList>();

function PhotosNavigator(): JSX.Element {
  const photosCtx = useContext(PhotosContext);
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionsStatus, setPermissionsStatus] = useState(PermissionStatus.UNDETERMINED);

  const initialRouteName: keyof PhotosStackParamList = 'PhotosGallery';

  useEffect(() => {
    photosCtx.permissions.getPermissionsStatus().then((status) => {
      setPermissionsStatus(status);

      setTimeout(() => {
        setIsInitialized(true);
      }, 500);
    });
  }, []);

  return (
    <>
      {isInitialized && (
        <StackNav.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
          {/* <StackNav.Screen name={'PhotosPermissions'} component={PhotosPermissionsScreen} /> */}
          <StackNav.Screen name={'PhotosGallery'} component={PhotosGalleryiOSScreen} />
        </StackNav.Navigator>
      )}
    </>
  );
}

export default PhotosNavigator;
