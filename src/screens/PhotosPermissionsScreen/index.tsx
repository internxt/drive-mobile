import photos from '@internxt-mobile/services/photos';
import { PhotosAnalyticsScreenKey } from '@internxt-mobile/services/photos/analytics';
import React, { useContext, useEffect, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { PhotosContext } from 'src/contexts/Photos';
import { useTailwind } from 'tailwind-rn';
import SyncIcon from '../../../assets/images/modals/sync.svg';
import strings from '../../../assets/lang/strings';
import AppButton from '../../components/AppButton';
import * as MediaLibrary from 'expo-media-library';
import { PhotosScreenProps } from '../../types/navigation';
import AppText from 'src/components/AppText';
import errorService from '@internxt-mobile/services/ErrorService';
import AppScreen from 'src/components/AppScreen';

function PhotosPermissionsScreen({ navigation }: PhotosScreenProps<'PhotosPermissions'>): JSX.Element {
  const tailwind = useTailwind();

  const photosCtx = useContext(PhotosContext);

  const handlePermissionsGranted = async () => {
    await photosCtx.enableSync(true);

    navigation.replace('PhotosGallery');
  };
  return (
    <AppScreen safeAreaBottom safeAreaTop style={tailwind('justify-center flex-1 pt-20')}>
      <PhotosPermissions onPermissionsGranted={handlePermissionsGranted} />
    </AppScreen>
  );
}

export interface PhotosPermissionsProps {
  onPermissionsGranted: () => void;
}
export const PhotosPermissions: React.FC<PhotosPermissionsProps> = (props) => {
  const tailwind = useTailwind();
  const photosCtx = useContext(PhotosContext);
  const [permissions, setPermissions] = useState<MediaLibrary.PermissionStatus>(
    MediaLibrary.PermissionStatus.UNDETERMINED,
  );
  const features = [
    strings.screens.photosPermissions.features[0],
    strings.screens.photosPermissions.features[1],
    strings.screens.photosPermissions.features[2],
  ];

  useEffect(() => {
    photosCtx.permissions
      .getPermissionsStatus()
      .then((permissions) => {
        setPermissions(permissions);
      })
      .catch((err) => {
        errorService.reportError(err);
      });
  }, []);

  useEffect(() => {
    photos.analytics.screen(PhotosAnalyticsScreenKey.PhotosGallery, { permissions: false });
  }, []);

  const featuresList = features.map((feature, index) => {
    return (
      <View style={tailwind('px-10 flex-row')} key={index.toString()}>
        <Text style={tailwind('text-sm text-gray-100 mr-2')}>{'\u2022'}</Text>
        <Text style={tailwind('text-sm text-gray-100')}>{feature}</Text>
      </View>
    );
  });
  const onPermissionsGranted = async () => {
    props.onPermissionsGranted();
  };
  const onButtonPressed = async () => {
    if (permissions === MediaLibrary.PermissionStatus.DENIED) {
      if (Platform.OS === 'ios') {
        await Linking.openSettings();
      }
    }

    if (permissions === MediaLibrary.PermissionStatus.UNDETERMINED) {
      const granted = await photosCtx.permissions.askPermissions();
      if (granted) {
        await onPermissionsGranted();
      }
    }
  };

  return (
    <View style={tailwind('justify-center items-center px-6 pb-14')}>
      <SyncIcon style={tailwind('mb-6')} width={100} height={100} />

      <AppText semibold style={[tailwind('mb-5 text-center text-3xl text-gray-100')]}>
        {strings.screens.photosPermissions.title}
      </AppText>

      <View style={tailwind('mb-5')}>{featuresList}</View>

      {permissions === MediaLibrary.PermissionStatus.DENIED && (
        <View style={tailwind('mb-2 rounded-lg w-full p-3 bg-primary/10')}>
          <Text style={tailwind('text-primary-dark text-center')}>
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
      <AppText style={tailwind('text-center text-xs text-gray-50')}>{strings.screens.photosPermissions.access}</AppText>
    </View>
  );
};
export default PhotosPermissionsScreen;
