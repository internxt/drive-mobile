import React, { useEffect } from 'react';
import { View } from 'react-native';

import { getFileTypeIcon } from '../../../helpers';
import strings from '../../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import CenterModal from '../CenterModal';
import AppButton from '../../AppButton';
import ProgressBar from '../../AppProgressBar';
import AppText from '../../AppText';
import { items } from '@internxt/lib';
import prettysize from 'prettysize';
import moment from 'moment';
import { driveActions, driveSelectors, driveThunks } from '../../../store/slices/drive';
import drive from '@internxt-mobile/services/drive';
import { DriveEventKey } from '../../../types/drive';
import analytics, { AnalyticsEventKey } from '../../../services/AnalyticsService';
import asyncStorage from '../../../services/AsyncStorageService';
import { DevicePlatform, NotificationType } from '../../../types';
import notificationsService from '../../../services/NotificationsService';
import { useTailwind } from 'tailwind-rn';

function DriveDownloadModal(): JSX.Element {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const iconSize = 80;
  const { isInitialized, downloadingFile } = useAppSelector((state) => state.drive);
  const FileIcon = getFileTypeIcon(downloadingFile?.data.type || '');
  const { isDriveDownloadModalOpen } = useAppSelector((state) => state.ui);
  const onClosed = () => {
    dispatch(uiActions.setIsDriveDownloadModalOpen(false));
  };

  const { downloadProgress, decryptProgress } = downloadingFile || { downloadProgress: 0, decryptProgress: 0 };
  const currentProgress = downloadProgress * 0.5 + decryptProgress * 0.5;
  const updatedAtText = (downloadingFile && moment(downloadingFile?.data.updatedAt).format('MMMM DD YYYY')) || '';
  const isCancelling = downloadingFile?.status === 'cancelling';

  const getProgressMessage = () => {
    if (!downloadingFile) {
      return;
    }

    const progressMessage = strings.formatString(
      currentProgress < 0.5 ? strings.screens.drive.downloadingPercent : strings.screens.drive.decryptingPercent,
      (currentProgress * 100).toFixed(0),
    );

    return progressMessage;
  };
  const onCancelButtonPressed = () => {
    dispatch(driveThunks.cancelDownloadThunk());
  };
  const onDownloadCompleted = () => undefined;
  const onDownloadError = ([err]: [Error]) => {
    notificationsService.show({ type: NotificationType.Error, text1: err.message });
  };
  const onDownloadFinally = () => {
    dispatch(uiActions.setIsDriveDownloadModalOpen(false));
  };
  const onCancelStart = () => {
    dispatch(driveActions.updateDownloadingFile({ status: 'cancelling' }));
  };
  const onCancelEnd = () => {
    dispatch(uiActions.setIsDriveDownloadModalOpen(false));
    dispatch(driveActions.updateDownloadingFile({ status: 'cancelled' }));
  };

  useEffect(() => {
    if (isInitialized) {
      drive.events.addListener({
        event: DriveEventKey.DownloadCompleted,
        listener: onDownloadCompleted,
      });
      drive.events.addListener({ event: DriveEventKey.DownloadError, listener: onDownloadError });
      drive.events.addListener({
        event: DriveEventKey.DownloadFinally,
        listener: onDownloadFinally,
      });
      drive.events.addListener({ event: DriveEventKey.CancelDownload, listener: onCancelStart });
      drive.events.addListener({ event: DriveEventKey.CancelDownloadEnd, listener: onCancelEnd });
    }

    return () => {
      drive.events.removeListener({
        event: DriveEventKey.DownloadCompleted,
        listener: onDownloadCompleted,
      });
      drive.events.removeListener({
        event: DriveEventKey.DownloadError,
        listener: onDownloadError,
      });
      drive.events.removeListener({
        event: DriveEventKey.DownloadFinally,
        listener: onDownloadFinally,
      });
      drive.events.removeListener({
        event: DriveEventKey.CancelDownload,
        listener: onCancelStart,
      });
      drive.events.removeListener({
        event: DriveEventKey.CancelDownloadEnd,
        listener: onCancelEnd,
      });
    };
  }, [isInitialized]);

  return (
    <CenterModal isOpen={isDriveDownloadModalOpen} onClosed={onClosed} backdropPressToClose={false}>
      <View style={tailwind('w-full px-3 pb-3')}>
        {downloadingFile ? (
          <>
            <View style={tailwind('w-full px-10 pt-7 pb-2 flex-grow justify-center items-center')}>
              <FileIcon width={iconSize} height={iconSize} />
            </View>

            <AppText style={tailwind('mx-4 text-center text-sm')} numberOfLines={1} ellipsizeMode="middle">
              {items.getItemDisplayName(downloadingFile.data)}
            </AppText>

            <AppText style={tailwind('text-neutral-100 text-center text-sm')}>
              {`${prettysize(downloadingFile.data.size, true)} · ${strings.generic.updated} ${updatedAtText}`}
            </AppText>

            <ProgressBar
              currentValue={currentProgress}
              totalValue={1}
              height={6}
              style={tailwind('mt-4 mb-1.5 mx-4')}
            />

            <AppText style={tailwind('mb-7 text-center text-sm text-blue-60')}>{getProgressMessage()}</AppText>

            <AppButton
              disabled={downloadingFile.status !== 'idle'}
              title={isCancelling ? strings.buttons.cancelling : strings.buttons.cancel}
              type="cancel-2"
              onPress={onCancelButtonPressed}
            />
          </>
        ) : null}
      </View>
    </CenterModal>
  );
}

export default DriveDownloadModal;
