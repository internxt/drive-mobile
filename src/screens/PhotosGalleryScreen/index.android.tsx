import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, BackHandler, Dimensions, DeviceEventEmitter } from 'react-native';

import globalStyle from '../../styles/global';
import ScreenTitle from '../../components/AppScreenTitle';
import strings from '../../../assets/lang/strings';
import AppScreen from '../../components/AppScreen';
import { useTailwind } from 'tailwind-rn';
import { PhotoSyncStatus, PhotosItem, PhotosSyncStatus } from '@internxt-mobile/types/photos';
import photos from '@internxt-mobile/services/photos';
import { PhotosAnalyticsEventKey, PhotosAnalyticsScreenKey } from '@internxt-mobile/services/photos/analytics';
import { PhotosContext } from 'src/contexts/Photos/Photos.context';

import { NativePhotosGalleryView, PhotosProcessProgressUpdate, internxtMobilePhotosSdk } from '@internxt/mobile-sdk';
import errorService from '@internxt-mobile/services/ErrorService';
import PhotosSyncStatusWidget from 'src/components/PhotosSyncStatusWidget/index.android';
import { PhotosBackupsPausedMessage } from 'src/components/photos/PhotosBackupsPausedMessage/PhotosBackupsPausedMessage';
import { useNavigation } from '@react-navigation/native';
import { PhotosScreenNavigationProp } from '@internxt-mobile/types/navigation';
import { PhotosItemType } from '@internxt/sdk/dist/photos';
import { logger } from '@internxt-mobile/services/common';
import { usePowerState } from 'react-native-device-info';
function PhotosGalleryAndroidScreen(): JSX.Element {
  const photosCtx = useContext(PhotosContext);
  const tailwind = useTailwind();
  const navigation = useNavigation<PhotosScreenNavigationProp<'PhotosGallery'>>();
  const powerState = usePowerState();
  const [backupsPausedDueToMissingConstraints, setBackupsPausedDueToMissingConstraints] = useState(
    powerState.batteryState === 'charging' ? false : true,
  );

  const [photosProcessState, setPhotosProcessState] = useState<PhotosProcessProgressUpdate>({
    status: 'IDLE',
    failedSyncs: 0,
    successfulSyncs: 0,
    totalPhotosInDevice: 0,
    totalPhotosInRemote: 0,
    pendingSyncs: 0,
  });

  useEffect(() => {
    const photosProgressUpdateSubscription = DeviceEventEmitter.addListener('PHOTOS_PROGRESS_UPDATE', (update) => {
      setPhotosProcessState(update);
    });

    const pressedItemSubscription = DeviceEventEmitter.addListener('PHOTOS_ITEM_PRESS', (pressedItem) => {
      internxtMobilePhotosSdk
        .getPhotosItem(pressedItem.name, pressedItem.type)
        .then((item) => {
          const photosItem: PhotosItem = {
            photoId: item.photoId ?? null,
            photoFileId: item.fileId,
            previewFileId: item.previewId,
            name: item.name,
            takenAt: new Date(item.takenAt).getTime(),
            updatedAt: new Date(item.updatedAt).getTime(),
            width: item.width,
            height: item.height,
            format: item.type,
            type: item.itemType === 'IMAGE' ? PhotosItemType.PHOTO : PhotosItemType.VIDEO,
            localPreviewPath: pressedItem.previewPath ?? '',
            localFullSizePath: pressedItem.previewPath ?? '',
            status: PhotoSyncStatus.DEVICE_AND_IN_SYNC,
            localUri: null,
            bucketId: item.bucketId,
            getSize: async () => {
              return item.size;
            },
            getDisplayName: function (): string {
              return `${item.name}.${item.type}`;
            },
          };
          navigation.navigate('PhotosPreview', {
            photosItem,
          });
        })
        .catch((err) => {
          errorService.reportError(err);
          logger.error(`Failed to get photo item when receiving press event: ${JSON.stringify(err)}`);
        });
    });

    return () => {
      photosProgressUpdateSubscription.remove();
      pressedItemSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (
      (powerState as any) === 'charging' ||
      (powerState as any) === 'full' ||
      powerState.batteryState === 'charging' ||
      powerState.batteryState === 'full'
    ) {
      setBackupsPausedDueToMissingConstraints(false);
    } else {
      setBackupsPausedDueToMissingConstraints(true);
    }
  }, [powerState]);

  useEffect(() => {
    photos.analytics.screen(PhotosAnalyticsScreenKey.PhotosGallery, { permissions: true });
    return () => {
      photosCtx.selection.resetSelectionMode();
    };
  }, []);

  useEffect(() => {
    if (photosCtx.syncEnabled) {
      initPhotosMobileSdk().then(startPhotosMobileSdk);
    } else {
      stopPhotosMobileSdk();
    }
  }, [photosCtx.syncEnabled]);

  const initPhotosMobileSdk = async () => {
    try {
      if (!photosCtx.syncEnabled) {
        return logger.info('Photos sync is disabled');
      }
      const { user, device } = await photos.user.init();

      await internxtMobilePhotosSdk.initialize({
        photosBucketId: user.bucketId,
        photosDeviceId: device.id,
        photosUserId: user.id,
      });
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const startPhotosMobileSdk = async () => {
    try {
      await internxtMobilePhotosSdk.startPhotos();
    } catch (error) {
      logger.error(`Failed to start Photos native processor: ${JSON.stringify(error)}`);
      errorService.reportError(error);
    }
  };

  const stopPhotosMobileSdk = async () => {
    try {
      if (photosCtx.syncEnabled) {
        return logger.info('Photos sync is enabled');
      }
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const onSelectButtonPressed = () => {
    photos.analytics.track(PhotosAnalyticsEventKey.MultipleSelectionActivated);
    photosCtx.selection.setSelectionModeActivated(true);
  };
  const onCancelSelectButtonPressed = () => {
    photosCtx.selection.resetSelectionMode();
  };

  const onBackButtonPressed = () => {
    onCancelSelectButtonPressed();

    return false;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackButtonPressed);

    return () => {
      backHandler.remove();
    };
  }, []);

  const getPhotosSyncStatus = (status: string): PhotosSyncStatus => {
    if (status === 'IDLE') {
      return PhotosSyncStatus.Unknown;
    }

    if (status === 'RUNNING') {
      return PhotosSyncStatus.InProgress;
    }

    if (status === 'FINISHED') {
      return PhotosSyncStatus.Completed;
    }

    return PhotosSyncStatus.Unknown;
  };

  return (
    <AppScreen safeAreaTop style={tailwind('mt-0')}>
      <View style={tailwind('h-10 flex-row justify-between items-end')}>
        <ScreenTitle text={strings.screens.gallery.title} showBackButton={false} containerStyle={tailwind('py-0')} />

        {photosCtx.ready && (
          <View style={tailwind('flex-row items-center justify-between pr-5')}>
            <TouchableOpacity style={tailwind('bg-primary/10 px-3.5 py-1 rounded-3xl')} onPress={onSelectButtonPressed}>
              <Text style={[tailwind('text-primary'), globalStyle.fontWeight.medium]}>{strings.buttons.select}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {backupsPausedDueToMissingConstraints && photosCtx.syncEnabled ? (
        <View style={tailwind('px-5 my-4')}>
          <PhotosBackupsPausedMessage />
        </View>
      ) : (
        <PhotosSyncStatusWidget
          syncEnabled={photosCtx.syncEnabled}
          pendingSyncs={photosProcessState.pendingSyncs}
          failedSyncs={photosProcessState.failedSyncs}
          successfulSyncs={photosProcessState.successfulSyncs}
          photosInDevice={photosProcessState.totalPhotosInDevice}
          status={getPhotosSyncStatus(photosProcessState.status)}
        />
      )}
      <View style={tailwind('bg-white')}>
        <NativePhotosGalleryView
          width={Dimensions.get('screen').width}
          height={Dimensions.get('screen').height - 200}
        />
      </View>
    </AppScreen>
  );
}

export default PhotosGalleryAndroidScreen;
