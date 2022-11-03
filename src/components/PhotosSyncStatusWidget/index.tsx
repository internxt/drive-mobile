import { CheckCircle, Pause, Play } from 'phosphor-react-native';
import React, { useContext } from 'react';
import { Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

import strings from '../../../assets/lang/strings';
import { PhotosEventKey, PhotosSyncStatus } from '../../types/photos';
import LoadingSpinner from '../LoadingSpinner';
import AppText from '../AppText';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import { PhotosContext } from 'src/contexts/Photos';
import photos from '@internxt-mobile/services/photos';
import appService from '@internxt-mobile/services/AppService';

const PhotosSyncStatusWidget = () => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const photosCtx = useContext(PhotosContext);

  const onResumeSyncPressed = () => {
    photos.events.emit({
      event: PhotosEventKey.ResumeSync,
    });
  };

  const renderPending = () => {
    if (!photosCtx.sync.pendingTasks) return '';
    return `${photosCtx.sync.pendingTasks} ${strings.screens.gallery.items_left}`;
  };
  const contentByStatus = {
    [PhotosSyncStatus.Unknown]: (
      <View style={tailwind('flex-row items-center justify-center')}>
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
        <Text style={tailwind('text-sm text-yellow-30')}>{strings.messages.photosSyncPending}</Text>
        <TouchableWithoutFeedback onPress={onResumeSyncPressed}>
          <AppText style={tailwind('ml-2 text-sm text-blue-60')}>{strings.buttons.syncNow}</AppText>
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
      <View style={tailwind('flex-row items-center justify-center')}>
        <AppText semibold style={tailwind('text-base mr-2 mb-0.5')}>
          {strings.screens.gallery.syncing}
        </AppText>
        <AppText style={tailwind('text-sm text-neutral-100')}>{renderPending()}</AppText>
      </View>
    ),
    [PhotosSyncStatus.Completed]: (
      <View style={tailwind('flex-row items-center')}>
        <CheckCircle weight="fill" style={tailwind('mr-1')} color={getColor('text-green-40')} size={14} />
        <Text style={tailwind('text-neutral-100 text-sm')}>{strings.messages.photosSyncCompleted}</Text>
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
  const isCompleted = photosCtx.sync.status === PhotosSyncStatus.Completed;
  const isPaused = photosCtx.sync.status === PhotosSyncStatus.Paused;
  const isPausing = photosCtx.sync.status === PhotosSyncStatus.Pausing;
  const isPending = photosCtx.sync.status === PhotosSyncStatus.Pending;
  const showPauseResumeButton = !isCompleted && !isPending && photosCtx.sync.status !== PhotosSyncStatus.Unknown;

  return (
    <View>
      <View style={tailwind('h-10 flex-row items-center justify-between')}>
        <View style={tailwind('pl-5')}>{contentByStatus[photosCtx.sync.status]}</View>
        {appService.isDevMode ? (
          <AppText style={tailwind('text-red-50 text-xs ml-auto mr-2')}>{photosCtx.sync.failedTasks} Failed</AppText>
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
    </View>
  );
};

export default PhotosSyncStatusWidget;
