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
import DriveService from '../../../services/DriveService';
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
  const { id: currentFolderId } = useAppSelector(driveSelectors.navigationStackPeek);
  const FileIcon = getFileTypeIcon(downloadingFile?.data.type || '');
  const { isDriveDownloadModalOpen } = useAppSelector((state) => state.ui);
  const onClosed = () => {
    dispatch(uiActions.setIsDriveDownloadModalOpen(false));
  };
  const getProgressMessage = () => {
    if (!downloadingFile) {
      return;
    }

    const { downloadProgress, decryptProgress } = downloadingFile;
    let progressMessage;

    if (downloadProgress < 1) {
      progressMessage = strings.formatString(
        strings.screens.drive.downloadingPercent,
        (downloadProgress * 100).toFixed(0),
      );
    } else {
      progressMessage = strings.formatString(
        strings.screens.drive.decryptingPercent,
        (decryptProgress * 100).toFixed(0),
      );
    }

    return progressMessage;
  };
  const { downloadProgress, decryptProgress } = downloadingFile || { downloadProgress: 0, decryptProgress: 0 };
  const currentProgress = downloadProgress < 1 ? downloadProgress : decryptProgress;
  const updatedAtText = (downloadingFile && moment(downloadingFile?.data.updatedAt).format('MMMM DD YYYY')) || '';
  const isCancelling = downloadingFile?.status === 'cancelling';
  const onCancelButtonPressed = () => {
    dispatch(driveThunks.cancelDownloadThunk());
  };
  const onDownloadCompleted = () => undefined;
  const onDownloadError = ([err]: [Error]) => {
    const trackDownloadError = async (err: Error) => {
      const { email, uuid } = await asyncStorage.getUser();

      return analytics.track(AnalyticsEventKey.FileDownloadError, {
        file_id: downloadingFile?.data.id || 0,
        file_size: downloadingFile?.data.size || 0,
        file_type: downloadingFile?.data.type || '',
        folder_id: currentFolderId,
        platform: DevicePlatform.Mobile,
        error: err.message || strings.errors.unknown,
        email: email || null,
        userId: uuid || null,
      });
    };

    trackDownloadError(err);
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
      DriveService.instance.eventEmitter.addListener({
        event: DriveEventKey.DownloadCompleted,
        listener: onDownloadCompleted,
      });
      DriveService.instance.eventEmitter.addListener({ event: DriveEventKey.DownloadError, listener: onDownloadError });
      DriveService.instance.eventEmitter.addListener({
        event: DriveEventKey.DownloadFinally,
        listener: onDownloadFinally,
      });
      DriveService.instance.eventEmitter.addListener({ event: DriveEventKey.CancelDownload, listener: onCancelStart });
      DriveService.instance.eventEmitter.addListener({ event: DriveEventKey.CancelDownloadEnd, listener: onCancelEnd });
    }

    return () => {
      DriveService.instance.eventEmitter.removeListener({
        event: DriveEventKey.DownloadCompleted,
        listener: onDownloadCompleted,
      });
      DriveService.instance.eventEmitter.removeListener({
        event: DriveEventKey.DownloadError,
        listener: onDownloadError,
      });
      DriveService.instance.eventEmitter.removeListener({
        event: DriveEventKey.DownloadFinally,
        listener: onDownloadFinally,
      });
      DriveService.instance.eventEmitter.removeListener({
        event: DriveEventKey.CancelDownload,
        listener: onCancelStart,
      });
      DriveService.instance.eventEmitter.removeListener({
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

            <ProgressBar currentValue={currentProgress} totalValue={1} style={tailwind('mt-4 mb-1.5 mx-4')} />

            <AppText style={tailwind('mb-7 text-center text-sm text-blue-60')}>{getProgressMessage()}</AppText>

            <AppButton
              disabled={downloadingFile.status !== 'idle'}
              title={isCancelling ? strings.generic.cancelling : strings.components.buttons.cancel}
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
