import React from 'react';
import { Text, TouchableWithoutFeedback, View } from 'react-native';

import strings from '../../../assets/lang/strings';
import { tailwind } from '../../helpers/designSystem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosThunks } from '../../store/slices/photos';
import { PhotosSyncStatus } from '../../types/photos';
import LoadingSpinner from '../LoadingSpinner';

const PhotosSyncStatusWidget = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { syncStatus } = useAppSelector((state) => state.photos);
  const onSyncNowPressed = () => {
    dispatch(photosThunks.syncThunk());
  };
  const contentByStatus = {
    [PhotosSyncStatus.Unknown]: (
      <>
        <LoadingSpinner style={tailwind('mr-1')} />
        <Text style={tailwind('text-sm text-neutral-100')}>{strings.generic.preparing}</Text>
      </>
    ),
    [PhotosSyncStatus.Calculating]: (
      <>
        <LoadingSpinner style={tailwind('mr-1')} />
        <Text style={tailwind('text-sm text-neutral-100')}>{strings.generic.preparing}</Text>
      </>
    ),
    [PhotosSyncStatus.Pending]: (
      <>
        <Text style={tailwind('text-sm text-yellow-30')}>{strings.messages.photosSyncPending}</Text>
        <TouchableWithoutFeedback onPress={onSyncNowPressed}>
          <Text style={tailwind('ml-2 text-sm text-blue-60')}>{strings.components.buttons.syncNow}</Text>
        </TouchableWithoutFeedback>
      </>
    ),
    [PhotosSyncStatus.InProgress]: (
      <>
        <LoadingSpinner style={tailwind('mr-1')} />
        <Text style={tailwind('text-sm text-neutral-100')}>
          {strings.formatString(strings.screens.gallery.syncing, syncStatus.completedTasks, syncStatus.totalTasks)}
        </Text>
      </>
    ),
    [PhotosSyncStatus.Completed]: (
      <Text style={tailwind('text-sm text-neutral-100')}>{strings.messages.photosSyncCompleted}</Text>
    ),
  };

  return <View style={tailwind('pl-5 flex-row items-center')}>{contentByStatus[syncStatus.status]}</View>;
};

export default PhotosSyncStatusWidget;
