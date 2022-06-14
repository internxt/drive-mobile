import { CheckCircle, Pause, Play } from 'phosphor-react-native';
import React from 'react';
import { Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

import strings from '../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosThunks } from '../../store/slices/photos';
import { PhotosSyncStatus } from '../../types/photos';
import LoadingSpinner from '../LoadingSpinner';
import AppText from '../AppText';
import { PhotosService } from '../../services/PhotosService';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';

const PhotosSyncStatusWidget = (): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const { syncStatus } = useAppSelector((state) => state.photos);
  const onSyncNowPressed = () => {
    const syncThunk = dispatch(photosThunks.syncThunk());
    PhotosService.instance.setSyncAbort(() => syncThunk.abort());
  };
  const contentByStatus = {
    [PhotosSyncStatus.Unknown]: (
      <View style={tailwind('flex-row items-center')}>
        <LoadingSpinner style={tailwind('mr-2')} size={14} />
        <Text style={tailwind('text-sm text-neutral-100')}>{strings.generic.preparing}</Text>
      </View>
    ),
    [PhotosSyncStatus.Calculating]: (
      <View style={tailwind('flex-row items-center')}>
        <LoadingSpinner style={tailwind('mr-2')} size={14} />
        <Text style={tailwind('text-sm text-neutral-100')}>{strings.generic.preparing}</Text>
      </View>
    ),
    [PhotosSyncStatus.Pending]: (
      <View style={tailwind('flex-row items-center')}>
        <Text style={tailwind('text-sm text-yellow-30')}>{strings.messages.photosSyncPending}</Text>
        <TouchableWithoutFeedback onPress={onSyncNowPressed}>
          <Text style={tailwind('ml-2 text-sm text-blue-60')}>{strings.buttons.syncNow}</Text>
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
        <Text style={tailwind('text-sm text-neutral-100')}>{strings.screens.gallery.paused}</Text>
      </View>
    ),
    [PhotosSyncStatus.InProgress]: (
      <View style={tailwind('flex-row items-center')}>
        <LoadingSpinner style={tailwind('mr-2')} size={14} />
        <Text style={tailwind('text-sm text-neutral-100')}>
          {syncStatus.totalTasks > 0
            ? strings.formatString(
                strings.screens.gallery.syncingTasks,
                syncStatus.completedTasks,
                syncStatus.totalTasks,
              )
            : strings.screens.gallery.syncing}
        </Text>
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
    dispatch(photosThunks.cancelSyncThunk());
  };
  const onResumeButtonPressed = () => {
    onSyncNowPressed();
  };
  const isCompleted = syncStatus.status === PhotosSyncStatus.Completed;
  const isPaused = syncStatus.status === PhotosSyncStatus.Paused;
  const isPausing = syncStatus.status === PhotosSyncStatus.Pausing;
  const isPending = syncStatus.status === PhotosSyncStatus.Pending;
  const showPauseResumeButton = !isCompleted && !isPending;

  return (
    <View style={tailwind('px-5 flex-row items-center justify-between')}>
      {contentByStatus[syncStatus.status]}
      {showPauseResumeButton ? (
        !isPaused && !isPausing ? (
          <TouchableOpacity onPress={onPauseButtonPressed}>
            <View style={[tailwind('py-1 flex-row items-center')]}>
              <Pause weight="fill" color={getColor('text-blue-60')} size={12} />
              <AppText style={tailwind('ml-1 text-blue-60 text-sm')}>{strings.buttons.pause}</AppText>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity disabled={isPausing} onPress={onResumeButtonPressed}>
            <View style={[tailwind('py-1 flex-row items-center'), isPausing && tailwind('opacity-30')]}>
              <Play weight="fill" color={getColor('text-blue-60')} size={12} />
              <AppText style={tailwind('ml-1 text-blue-60 text-sm')}>{strings.buttons.resume}</AppText>
            </View>
          </TouchableOpacity>
        )
      ) : null}
    </View>
  );
};

export default PhotosSyncStatusWidget;
