import React, { useEffect } from 'react';
import { NavigationParams, NavigationRoute, NavigationRouteConfigMap } from 'react-navigation';
import { StackNavigationOptions, StackNavigationProp } from 'react-navigation-stack/lib/typescript/src/vendor/types';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PhotosPermissionsScreen from './PhotosPermissionsScreen';
import PhotosGalleryScreen from './PhotosGalleryScreen';
import PhotosPreviewScreen from './PhotosPreviewScreen';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosSelectors, photosThunks } from '../../store/slices/photos';
import strings from '../../../assets/lang/strings';
import { Text, View } from 'react-native';
import { tailwind } from '../../helpers/designSystem';
import BaseButton from '../../components/BaseButton';
import { PhotosScreen } from '../../types/photos';

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
  const { isInitialized, initializeError } = useAppSelector((state) => state.photos);
  const arePermissionsGranted = useAppSelector(photosSelectors.arePermissionsGranted);
  const dispatch = useAppDispatch();
  const onTryAgainInitializeButtonPressed = () => {
    dispatch(photosThunks.initializeThunk());
  };

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

      {initializeError && (
        <View style={tailwind('flex-1 items-center justify-center')}>
          <View style={tailwind('px-5')}>
            <Text style={tailwind('text-red-60')}>
              {strings.formatString(strings.errors.photosInitialize, initializeError)}
            </Text>
            <BaseButton
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
