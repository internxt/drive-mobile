import prettysize from 'prettysize';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import { FolderIcon, getFileTypeIcon } from '../../../helpers';
import globalStyle from '../../../styles/global';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';

import BottomModalOption from '../../BottomModalOption';
import BottomModal from '../BottomModal';
import { Link, Copy, LinkBreak } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';

import { time } from '@internxt-mobile/services/common/time';
import AppText from 'src/components/AppText';
import { useUseCase } from '@internxt-mobile/hooks/common';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import CenterModal from '../CenterModal';
import AppButton from 'src/components/AppButton';
export function SharedLinkInfoModal(): JSX.Element {
  const { executeUseCase: getShareLink, loading: gettingShareLink } = useUseCase(driveUseCases.getExistingShareLink, {
    lazy: true,
  });
  const { executeUseCase: shareExistingShareLink } = useUseCase(driveUseCases.shareExistingShareLink, { lazy: true });
  const { executeUseCase: deleteShareLink, loading: deletingShareLink } = useUseCase(driveUseCases.deleteShareLink, {
    lazy: true,
  });

  const tailwind = useTailwind();

  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const { focusedItem: item } = useAppSelector((state) => state.drive);
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  const { isSharedLinkOptionsModalOpen } = useAppSelector((state) => state.ui);

  if (!item) {
    return <></>;
  }

  const isFolder = !item.fileId;

  const handleCopyLink = async () => {
    if (gettingShareLink) return;
    await getShareLink({
      token: item.token,
      code: item.code,
      copyLinkToClipboard: true,
      type: isFolder ? 'folder' : 'file',
    });
    dispatch(uiActions.setIsSharedLinkOptionsModalOpen(false));
  };

  const handleShareLink = async () => {
    if (gettingShareLink) return;
    const link = await getShareLink({
      token: item.token,
      code: item.code,
      copyLinkToClipboard: false,
      type: isFolder ? 'folder' : 'file',
    });

    if (link) {
      await shareExistingShareLink({ link });
      dispatch(uiActions.setIsSharedLinkOptionsModalOpen(false));
    }
  };

  const handleDeleteShareLink = async () => {
    if (!item.shareId) {
      throw new Error('Share ID not found');
    }
    const result = await deleteShareLink({
      shareId: item.shareId,
    });

    if (result?.deleted) {
      setConfirmDeleteModalOpen(false);
      dispatch(uiActions.setIsSharedLinkOptionsModalOpen(false));
    }
  };
  const options = [
    {
      icon: <Copy size={20} color={getColor('text-gray-100')} />,
      label: strings.buttons.copyLink,
      onPress: handleCopyLink,
    },
    {
      icon: <Link size={20} color={getColor('text-gray-100')} />,
      label: strings.components.file_and_folder_options.shareLink,
      onPress: handleShareLink,
    },
    {
      icon: <LinkBreak size={20} color={getColor('text-red-60')} />,
      textStyle: tailwind('text-red-60'),
      label: strings.components.file_and_folder_options.deleteLink,
      onPress: () => setConfirmDeleteModalOpen(true),
    },
  ];

  const FileIcon = getFileTypeIcon(item?.type || '');
  const getDisplayName = () => item.name + (item?.type ? '.' + item.type : '');

  const getUpdatedAt = () => {
    // eslint-disable-next-line quotes
    return time.getFormattedDate(item.updatedAt, "dd LLL yyyy 'at' HH:mm");
  };
  const header = (
    <View style={tailwind('flex-row')}>
      <View style={tailwind('mr-3')}>
        {isFolder ? <FolderIcon width={40} height={40} /> : <FileIcon width={40} height={40} />}
        <View
          style={[
            tailwind('absolute -bottom-1 -right-2 flex bg-gray-5 items-center justify-center rounded-full'),
            { width: 20, height: 20 },
          ]}
        >
          <View
            style={[tailwind('bg-primary rounded-full flex items-center justify-center'), { width: 16, height: 16 }]}
          >
            <Link weight="bold" size={10} color={getColor('text-white')} />
          </View>
        </View>
      </View>

      <View style={tailwind('flex-shrink w-full')}>
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          style={[tailwind('text-base text-gray-100'), globalStyle.fontWeight.medium]}
        >
          {getDisplayName()}
        </Text>
        <View style={tailwind('flex flex-row items-center')}>
          <AppText style={tailwind('text-xs text-gray-60')}>{!isFolder && <>{prettysize(item?.size || 0)}</>}</AppText>
          <View style={[tailwind('bg-gray-60 rounded-full mx-1.5'), { width: 3, height: 3 }]} />
          <AppText style={tailwind('text-xs text-gray-60')}>{getUpdatedAt()}</AppText>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <BottomModal
        isOpen={isSharedLinkOptionsModalOpen}
        onClosed={() => dispatch(uiActions.setIsSharedLinkOptionsModalOpen(false))}
        header={header}
      >
        <View style={tailwind('flex-grow')}>
          <View style={tailwind('border-t border-gray-5 overflow-hidden')}>
            {options.map((opt, index) => {
              return (
                <BottomModalOption
                  key={index}
                  leftSlot={opt.icon}
                  rightSlot={
                    <View style={tailwind('flex-grow items-center justify-center flex-row')}>
                      <Text style={[tailwind('text-lg text-neutral-500'), opt.textStyle]}>{opt.label}</Text>
                    </View>
                  }
                  hideBorderBottom={index === options.length - 1}
                  onPress={opt.onPress}
                />
              );
            })}
          </View>
        </View>
      </BottomModal>
      <CenterModal isOpen={confirmDeleteModalOpen} onClosed={() => setConfirmDeleteModalOpen(false)}>
        <View style={tailwind('bg-white rounded-xl p-4')}>
          <AppText style={tailwind('text-xl mb-4')} medium>
            {strings.modals.deleteShareLink.title}
          </AppText>
          <AppText style={tailwind('mb-6 mt-0')}>
            {strings.formatString(strings.messages.confirmDeleteSharedLink, getDisplayName())}
          </AppText>
          <View style={tailwind('flex flex-row')}>
            <AppButton
              style={tailwind('flex-1 mr-1.5')}
              type="cancel"
              onPress={() => setConfirmDeleteModalOpen(false)}
              title={strings.buttons.cancel}
            ></AppButton>
            <AppButton
              style={tailwind('flex-1 ml-1.5')}
              type="delete"
              onPress={handleDeleteShareLink}
              loading={deletingShareLink}
              title={strings.buttons.delete}
            ></AppButton>
          </View>
        </View>
      </CenterModal>
    </>
  );
}
