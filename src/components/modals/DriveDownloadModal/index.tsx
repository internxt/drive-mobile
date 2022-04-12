import React from 'react';
import { View } from 'react-native';

import { tailwind } from '../../../helpers/designSystem';
import { FolderIcon, getFileTypeIcon } from '../../../helpers';
import strings from '../../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import CenterModal from '../CenterModal';
import AppButton from '../../AppButton';
import ProgressBar from '../../ProgressBar';
import AppText from '../../AppText';

function DriveDownloadModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const iconSize = 80;
  const FileIcon = getFileTypeIcon('');
  const { isDriveDownloadModalOpen } = useAppSelector((state) => state.ui);
  const onClosed = () => {
    dispatch(uiActions.setIsDriveDownloadModalOpen(false));
  };
  const onCancelButtonPressed = () => {
    dispatch(uiActions.setIsDriveDownloadModalOpen(false));
  };

  return (
    <CenterModal isOpen={isDriveDownloadModalOpen} onClosed={onClosed}>
      <View style={tailwind('w-full px-4')}>
        <View style={tailwind('w-full px-10 pt-7 pb-2 flex-grow justify-center items-center')}>
          <FileIcon width={iconSize} height={iconSize} />
        </View>

        <AppText style={tailwind('text-center text-sm')}>{'FILE NAME'}</AppText>

        <AppText style={tailwind('text-center text-sm')}>{'2.7MB · Updated Feb 9 2022'}</AppText>

        <ProgressBar currentValue={0.5} totalValue={1} />

        <AppText style={tailwind('mb-7 text-center text-sm text-blue-60')}>
          {strings.formatString(strings.screens.drive.downloadingPercent, 0)}
        </AppText>

        <AppButton title={strings.components.buttons.cancel} type="cancel" onPress={onCancelButtonPressed} />
      </View>
    </CenterModal>
  );
}

export default DriveDownloadModal;
