import React from 'react';
import { View } from 'react-native';

import { tailwind } from '../../../helpers/designSystem';
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
import { driveThunks } from '../../../store/slices/drive';

function DriveDownloadModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const iconSize = 80;
  const { downloadingFile } = useAppSelector((state) => state.drive);
  const FileIcon = getFileTypeIcon(downloadingFile?.data.type || '');
  const { isDriveDownloadModalOpen } = useAppSelector((state) => state.ui);
  const onClosed = () => {
    dispatch(uiActions.setIsDriveDownloadModalOpen(false));
  };
  const onCancelButtonPressed = () => {
    console.log('DriveDownloadModal.onCancelButtonPressed');
    dispatch(driveThunks.cancelDownloadThunk());
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
