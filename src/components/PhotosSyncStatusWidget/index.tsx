import { CheckCircle, CloudArrowDown, Pause, Play, Warning } from 'phosphor-react-native';
import React, { useContext } from 'react';
import { Text, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native';

import strings from '../../../assets/lang/strings';
import { PhotosEventKey, PhotosSyncStatus } from '../../types/photos';
import LoadingSpinner from '../LoadingSpinner';
import AppText from '../AppText';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import { PhotosContext } from 'src/contexts/Photos';
import photos from '@internxt-mobile/services/photos';
import appService from '@internxt-mobile/services/AppService';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { SettingsStackParamList } from '@internxt-mobile/types/navigation';

const PhotosSyncStatusWidget = () => {
  const navigation = useNavigation<NavigationProp<SettingsStackParamList, 'SettingsHome'>>();
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const photosCtx = useContext(PhotosContext);
  const { width: windowWidth } = useWindowDimensions();
  const getProgressWidth = () => {
    if (photosCtx.sync.status === PhotosSyncStatus.PullingRemotePhotos) {
      const progress = (photosCtx.sync.photosInLocalDB * 100) / photosCtx.sync.photosInRemote;
      return (progress * windowWidth) / 100;
    }
    const pendingPhotos = photosCtx.sync.pendingTasks;
    const syncedPhotos = photosCtx.sync.completedTasks;
    if (photosCtx.sync.status === PhotosSyncStatus.InProgress || photosCtx.sync.status === PhotosSyncStatus.Paused) {
      if (!photosCtx.sync.photosInDevice) return 0;

      const syncedPhotos = photosCtx.sync.photosInDevice - photosCtx.sync.pendingTasks;

      const progress = (syncedPhotos * 100) / photosCtx.sync.photosInDevice;

      return (progress * windowWidth) / 100;
    }

    if (!photosCtx.sync.photosInLocalDB) return 0;
    if (!photosCtx.sync.photosInDevice) return 0;

    const total = pendingPhotos + syncedPhotos;

    if (total === 0) return total;

    const progress = (syncedPhotos * 100) / total;

    return (windowWidth * progress) / 100;
  };

  const onResumeSyncPressed = () => {
    photos.events.emit({
      event: PhotosEventKey.ResumeSync,
    });
  };

  const renderPending = () => {
    if (!photosCtx.sync.pendingTasks || photosCtx.sync.pendingTasks < 0) return '';
    return `${photosCtx.sync.pendingTasks} ${strings.screens.gallery.items_left}`;
  };
  const contentByStatus = {
    [PhotosSyncStatus.Unknown]: (
      <View style={tailwind('flex-row items-center')}>
        <AppText semibold style={tailwind('text-base mr-2 mb-0.5')}>
          {strings.generic.preparing}
        </AppText>
      </View>
    ),
    [PhotosSyncStatus.Calculating]: (
      <View style={tailwind('flex-row items-center')}>
        <LoadingSpinner style={tailwind('mr-2')} size={14} />
        <AppText style={tailwind('text-sm text-neutral-100')}>{strings.generic.preparing}</AppText>
      </View>
    ),
    [PhotosSyncStatus.Pending]: (
      <View style={tailwind('flex-row items-center')}>
        <Text style={tailwind('text-sm text-yellow')}>{strings.messages.photosSyncPending}</Text>
        <TouchableWithoutFeedback onPress={onResumeSyncPressed}>
          <AppText style={tailwind('ml-2 text-sm text-primary')}>{strings.buttons.syncNow}</AppText>
        </TouchableWithoutFeedback>
      </View>
    ),
    [PhotosSyncStatus.Pausing]: (
      <View style={tailwind('flex-row items-center')}>
        <Text style={tailwind('text-sm text-neutral-100')}>{strings.screens.gallery.paused}</Text>
      </View>
    ),
    [PhotosSyncStatus.Paused]: (
      <View style={tailwind('flex-row items-center')}>
        <AppText semibold style={tailwind('text-base mr-2 mb-0.5')}>
          {strings.screens.gallery.paused}
        </AppText>
        <AppText style={tailwind('text-sm text-neutral-100')}>{renderPending()}</AppText>
      </View>
    ),
    [PhotosSyncStatus.InProgress]: (
      <View style={tailwind('flex-row items-center')}>
        <AppText semibold style={tailwind('text-base mr-2 mb-0.5')}>
          {strings.screens.gallery.syncing}
        </AppText>
        <AppText style={tailwind('text-sm text-neutral-100')}>{renderPending()}</AppText>
      </View>
    ),
    [PhotosSyncStatus.Completed]: (
      <View style={tailwind('flex-row items-center')}>
        <CheckCircle weight="fill" style={tailwind('mr-1')} color={getColor('text-green')} size={14} />
        <AppText style={tailwind('text-gray-100 text-sm')}>{strings.messages.photosSyncCompleted}</AppText>
      </View>
    ),
    [PhotosSyncStatus.PullingRemotePhotos]: (
      <View style={tailwind('flex-row items-center')}>
        <CloudArrowDown style={tailwind('mr-2')} color={getColor('text-gray-100')} size={18} />
        <AppText medium style={tailwind('text-gray-100 text-sm')}>
          {strings.messages.gettingCloudPhotos}
        </AppText>
      </View>
    ),
    [PhotosSyncStatus.NoPhotosToSync]: (
      <View style={tailwind('flex-row items-center')}>
        <CloudArrowDown style={tailwind('mr-2')} color={getColor('text-gray-100')} size={18} />
        <AppText medium style={tailwind('text-gray-100 text-sm')}>
          {strings.messages.gettingCloudPhotos}
        </AppText>
      </View>
    ),
  };
  const onPauseButtonPressed = () => {
    photos.events.emit({
      event: PhotosEventKey.PauseSync,
    });
  };
  const onResumeButtonPressed = () => {
    onResumeSyncPressed();
  };

  const shouldRenderProgress = () => {
    if (photosCtx.sync.status === PhotosSyncStatus.InProgress) {
      return true;
    }

    if (photosCtx.sync.status === PhotosSyncStatus.PullingRemotePhotos) {
      return true;
    }

    if (photosCtx.sync.status === PhotosSyncStatus.Paused) {
      return true;
    }

    return false;
  };
  const isCompleted = photosCtx.sync.status === PhotosSyncStatus.Completed;
  const isPaused = photosCtx.sync.status === PhotosSyncStatus.Paused;
  const isPausing = photosCtx.sync.status === PhotosSyncStatus.Pausing;
  const isPending = photosCtx.sync.status === PhotosSyncStatus.Pending;
  const showPauseResumeButton =
    !isCompleted &&
    !isPending &&
    photosCtx.sync.status !== PhotosSyncStatus.Unknown &&
    photosCtx.sync.status !== PhotosSyncStatus.PullingRemotePhotos;

  const renderDisabledMessage = () => {
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        style={[tailwind('p-4'), { backgroundColor: 'rgba(255, 204, 0, 0.15)' }]}
        onPress={() => {
          // Date.now will trigger route.params updates, if we set a boolean
          // it will trigger only once
          navigation.navigate('SettingsHome', { focusEnablePhotosSync: Date.now() });
        }}
      >
        <View style={tailwind('flex flex-row w-full')}>
          <View style={tailwind('mr-2')}>
            <Warning color="#FFCC00" weight="fill" size={18} />
          </View>
          <View style={tailwind('flex-1')}>
            <AppText style={[tailwind('text-xs text-[#997A00]'), { lineHeight: 14.4 }]}>
              {strings.screens.gallery.photosDisabled}
              <AppText style={[tailwind('text-xs text-[#997A00]'), { lineHeight: 14.4 }]} semibold>
                {' '}
                {strings.screens.gallery.photosDisabledBold}
              </AppText>
            </AppText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!photosCtx.syncEnabled) return renderDisabledMessage();

  return (
    <View>
      <View style={tailwind('h-10 flex-row items-center justify-between')}>
        <View style={tailwind('pl-5 flex-1')}>{contentByStatus[photosCtx.sync.status]}</View>
        {appService.isDevMode ? (
          <AppText style={tailwind('text-red text-xs ml-auto mr-2')}>{photosCtx.sync.failedTasks} Failed</AppText>
        ) : null}
        {showPauseResumeButton ? (
          !isPaused && !isPausing ? (
            <TouchableOpacity
              onPress={onPauseButtonPressed}
              activeOpacity={0.7}
              style={tailwind('h-full flex items-end justify-center px-5')}
            >
              <View style={tailwind('h-5 w-5 rounded-full flex-row items-center justify-center bg-primary')}>
                <Pause weight="fill" color={getColor('text-white')} size={10} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              disabled={isPausing}
              onPress={onResumeButtonPressed}
              activeOpacity={0.7}
              style={tailwind('h-full flex items-end justify-center px-5')}
            >
              <View style={tailwind('h-5 w-5 rounded-full flex-row items-center justify-center bg-primary')}>
                <Play
                  weight="fill"
                  color={getColor('text-white')}
                  style={tailwind('h-5 w-5 rounded-full flex-row items-center justify-center bg-primary')}
                  size={10}
                />
              </View>
            </TouchableOpacity>
          )
        ) : null}
      </View>
      {shouldRenderProgress() ? (
        <View
          style={[
            tailwind(`w-full ${photosCtx.sync.status === PhotosSyncStatus.Paused ? 'bg-gray-50' : 'bg-primary'}`),
            { width: isNaN(getProgressWidth()) ? 0 : getProgressWidth(), height: 3 },
          ]}
        />
      ) : (
        <View style={{ height: 3, width: '100%' }} />
      )}
    </View>
  );
};

export default PhotosSyncStatusWidget;
