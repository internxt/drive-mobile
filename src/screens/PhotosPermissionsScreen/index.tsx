import photos from '@internxt-mobile/services/photos';
import { PhotosAnalyticsScreenKey } from '@internxt-mobile/services/photos/analytics';
import { PermissionStatus } from 'expo-media-library';
import React, { useContext, useEffect, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { PhotosContext } from 'src/contexts/Photos';
import { useTailwind } from 'tailwind-rn';
import SyncIcon from '../../../assets/images/modals/sync.svg';
import strings from '../../../assets/lang/strings';
import AppButton from '../../components/AppButton';

import globalStyle from '../../styles/global';
import { PhotosScreenProps } from '../../types/navigation';

function PhotosPermissionsScreen({ navigation }: PhotosScreenProps<'PhotosPermissions'>): JSX.Element {
  const tailwind = useTailwind();
  const photosCtx = useContext(PhotosContext);
  const [permissionsStatus, setPermissionsStatus] = useState(PermissionStatus.UNDETERMINED);
  const features = [
    strings.screens.photosPermissions.features[0],
    strings.screens.photosPermissions.features[1],
    strings.screens.photosPermissions.features[2],
  ];

  useEffect(() => {
    photosCtx.permissions.getPermissionsStatus().then(setPermissionsStatus);
  }, []);

  useEffect(() => {
    photos.analytics.screen(PhotosAnalyticsScreenKey.PhotosGallery, { permissions: false });
  }, []);

  const featuresList = features.map((feature, index) => {
    return (
      <View style={tailwind('px-10 flex-row')} key={index.toString()}>
        <Text style={tailwind('text-sm text-neutral-500 mr-2')}>{'\u2022'}</Text>
        <Text style={tailwind('text-sm text-neutral-500')}>{feature}</Text>
      </View>
    );
  });
  const onPermissionsGranted = async () => {
    navigation.replace('PhotosGallery');
    photosCtx.start();
  };
  const onButtonPressed = async () => {
    if (permissionsStatus === PermissionStatus.DENIED) {
      if (Platform.OS === 'ios') {
        await Linking.openSettings();
      }
    }

    if (permissionsStatus === PermissionStatus.UNDETERMINED) {
      const granted = await photosCtx.permissions.askPermissions();
      if (granted) {
        await onPermissionsGranted();
      }
    }
  };

  return (
    <View style={tailwind('flex justify-center items-center bg-white px-6 flex-1')}>
      <SyncIcon style={tailwind('mt-14 mb-6')} width={100} height={100} />

      <Text style={[tailwind('mb-5 text-center text-3xl text-neutral-900'), globalStyle.fontWeight.semibold]}>
        {strings.screens.photosPermissions.title}
      </Text>

      <View style={tailwind('mb-5')}>{featuresList}</View>

      {permissionsStatus === PermissionStatus.DENIED && (
        <View style={tailwind('mb-2 rounded-lg w-full p-3 bg-blue-10')}>
          <Text style={tailwind('text-blue-90 text-center')}>
            {Platform.OS === 'android'
              ? strings.screens.photosPermissions.androidAdvice
              : strings.screens.photosPermissions.iosAdvice}
          </Text>
        </View>
      )}

      <AppButton
        type="accept"
        title={strings.buttons.startSyncingPhotos}
        onPress={onButtonPressed}
        style={tailwind('mb-2 w-full')}
      />
      <Text style={tailwind('text-center text-xs text-neutral-100')}>{strings.screens.photosPermissions.access}</Text>
    </View>
  );
}

export default PhotosPermissionsScreen;
