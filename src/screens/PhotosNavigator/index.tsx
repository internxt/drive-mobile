import React, { useEffect } from 'react';
import { NavigationParams, NavigationRoute, NavigationRouteConfigMap } from 'react-navigation';
import { StackNavigationOptions, StackNavigationProp } from 'react-navigation-stack/lib/typescript/src/vendor/types';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PhotosScreen } from '../../types';
import PhotosPermissionsScreen from './PhotosPermissionsScreen';
import PhotosGalleryScreen from './PhotosGalleryScreen';
import PhotosPreviewScreen from './PhotosPreviewScreen';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosSelectors, photosThunks } from '../../store/slices/photos';

type RouteConfig = NavigationRouteConfigMap<
  StackNavigationOptions,
  StackNavigationProp<NavigationRoute<NavigationParams>, NavigationParams>,
  any
>;

const routeConfig: RouteConfig = {
  [PhotosScreen.Permissions]: { screen: PhotosPermissionsScreen },
  [PhotosScreen.Gallery]: { screen: PhotosGalleryScreen },
  [PhotosScreen.Preview]: { screen: PhotosPreviewScreen },
};

const StackNav = createNativeStackNavigator();

function PhotosNavigator(): JSX.Element {
  const { isInitialized } = useAppSelector((state) => state.photos);
  const arePermissionsGranted = useAppSelector(photosSelectors.arePermissionsGranted);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(photosThunks.initializeThunk());
  }, []);

  return (
    <>
      {isInitialized && (
        <StackNav.Navigator
          initialRouteName={arePermissionsGranted ? PhotosScreen.Gallery : PhotosScreen.Permissions}
          screenOptions={{ headerShown: false, statusBarHidden: false }}
        >
          {Object.entries(routeConfig).map(([name, component]: [string, any]) => (
            <StackNav.Screen key={name} name={name} component={component.screen} />
          ))}
        </StackNav.Navigator>
      )}
    </>
  );
}

export default PhotosNavigator;
