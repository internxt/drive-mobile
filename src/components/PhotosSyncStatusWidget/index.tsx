import { CheckCircle, Pause, PauseCircle, PlayCircle } from 'phosphor-react-native';
import React from 'react';
import { Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import usePhotos from '../../hooks/usePhotos';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosThunks } from '../../store/slices/photos';
import { PhotosSyncStatus } from '../../types/photos';
import LoadingSpinner from '../LoadingSpinner';

const PhotosSyncStatusWidget = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { syncAbort } = usePhotos();
  const { syncStatus } = useAppSelector((state) => state.photos);
  const onSyncNowPressed = () => {
    dispatch(photosThunks.syncThunk());
  };
  const contentByStatus = {
    [PhotosSyncStatus.Unknown]: (
      <View style={tailwind('flex-row')}>
        <LoadingSpinner style={tailwind('mr-1')} />
        <Text style={tailwind('text-sm text-neutral-100')}>{strings.generic.preparing}</Text>
      </View>
    ),
    [PhotosSyncStatus.Calculating]: (
      <View style={tailwind('flex-row')}>
        <LoadingSpinner style={tailwind('mr-1')} />
        <Text style={tailwind('text-sm text-neutral-100')}>{strings.generic.preparing}</Text>
      </View>
    ),
    [PhotosSyncStatus.Pending]: (
      <View style={tailwind('flex-row')}>
        <Text style={tailwind('text-sm text-yellow-30')}>{strings.messages.photosSyncPending}</Text>
        <TouchableWithoutFeedback onPress={onSyncNowPressed}>
          <Text style={tailwind('ml-2 text-sm text-blue-60')}>{strings.components.buttons.syncNow}</Text>
        </TouchableWithoutFeedback>
      </View>
    ),
    [PhotosSyncStatus.Pausing]: (
      <View style={tailwind('flex-row')}>
        <LoadingSpinner style={tailwind('mr-1')} />
        <Text style={tailwind('text-sm text-neutral-100')}>{strings.screens.gallery.pausing}</Text>
      </View>
    ),
    [PhotosSyncStatus.Paused]: (
      <View style={tailwind('flex-row')}>
        <Pause style={tailwind('mr-1')} />
        <Text style={tailwind('text-sm text-neutral-100')}>{strings.screens.gallery.paused}</Text>
      </View>
    ),
    [PhotosSyncStatus.InProgress]: (
      <View style={tailwind('flex-row')}>
        <LoadingSpinner style={tailwind('mr-1')} />
        <Text style={tailwind('text-sm text-neutral-100')}>
          {strings.formatString(strings.screens.gallery.syncing, syncStatus.completedTasks, syncStatus.totalTasks)}
        </Text>
      </View>
    ),
    [PhotosSyncStatus.Completed]: (
      <View style={tailwind('flex-row')}>
        <CheckCircle weight="fill" style={tailwind('mr-1')} color={getColor('green-40')} size={16} />
        <Text style={tailwind('text-neutral-100 text-sm')}>{strings.messages.photosSyncCompleted}</Text>
      </View>
    ),
  };
  const onPauseButtonPressed = () => {
    syncAbort?.();
  };
  const onResumeButtonPressed = () => {
    onSyncNowPressed();
  };

  return (
    <View style={tailwind('px-5 flex-row items-center justify-between')}>
      {contentByStatus[syncStatus.status]}
      {syncStatus.status !== PhotosSyncStatus.Paused ? (
        <TouchableOpacity onPress={onPauseButtonPressed}>
          <View>
            <PauseCircle color={getColor('neutral-100')} />
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onResumeButtonPressed}>
          <View>
            <PlayCircle color={getColor('neutral-100')} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default PhotosSyncStatusWidget;
