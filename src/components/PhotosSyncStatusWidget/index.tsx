import { CheckCircle, Pause, Play } from 'phosphor-react-native';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

import strings from '../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosThunks } from '../../store/slices/photos';
import { PhotosEventKey, PhotosSyncStatus } from '../../types/photos';
import LoadingSpinner from '../LoadingSpinner';
import AppText from '../AppText';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import { PhotosCommonServices } from '../../services/photos/PhotosCommonService';

const PhotosSyncStatusWidget = () => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [photosSyncStatus, setPhotosSyncStatus] = useState(PhotosSyncStatus.Unknown);
  useEffect(() => {
    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.PhotoSyncDone,
      listener([photosSynced]) {
        setCompletedTasks(photosSynced);
      },
    });

    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.SyncTasksCalculated,
      listener([photosToSync]) {
        setTotalTasks(photosToSync);
      },
    });

    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.PauseSync,
      listener: () => {
        setPhotosSyncStatus(PhotosSyncStatus.Paused);
      },
    });

    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.ResumeSync,
      listener: () => {
        setPhotosSyncStatus(PhotosSyncStatus.InProgress);
      },
    });

    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.SyncCompleted,
      listener: () => {
        setPhotosSyncStatus(PhotosSyncStatus.Completed);
      },
    });

    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.RunningSync,
      listener: () => {
        setPhotosSyncStatus(PhotosSyncStatus.InProgress);
      },
    });
  }, []);
  const onResumeSyncPressed = () => {
    dispatch(photosThunks.resumeSyncThunk());
  };
  const contentByStatus = {
    [PhotosSyncStatus.Unknown]: (
      <View style={tailwind('flex-row items-center')}>
        <LoadingSpinner style={tailwind('mr-2')} size={14} />
        <AppText style={tailwind('text-sm text-neutral-100')}>{strings.generic.preparing}</AppText>
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
        <Text style={tailwind('text-sm text-neutral-100')}>{strings.screens.gallery.paused}</Text>
      </View>
    ),
    [PhotosSyncStatus.InProgress]: (
      <View style={tailwind('flex-row items-center')}>
        <LoadingSpinner style={tailwind('mr-2')} size={14} />
        <Text style={tailwind('text-sm text-neutral-100')}>
          {completedTasks > 0
            ? strings.formatString(strings.screens.gallery.syncingTasks, completedTasks, totalTasks)
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
    dispatch(photosThunks.pauseSyncThunk());
  };
  const onResumeButtonPressed = () => {
    onResumeSyncPressed();
  };
  const isCompleted = photosSyncStatus === PhotosSyncStatus.Completed;
  const isPaused = photosSyncStatus === PhotosSyncStatus.Paused;
  const isPausing = photosSyncStatus === PhotosSyncStatus.Pausing;
  const isPending = photosSyncStatus === PhotosSyncStatus.Pending;
  const showPauseResumeButton = !isCompleted && !isPending;

  return (
    <View style={tailwind('px-5 flex-row items-center justify-between')}>
      {contentByStatus[photosSyncStatus]}
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
