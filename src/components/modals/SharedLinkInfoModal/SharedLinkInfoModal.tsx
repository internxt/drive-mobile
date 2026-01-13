import prettysize from 'prettysize';
import { useState } from 'react';
import { Text, View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import { checkIsFolder, FolderIcon, getFileTypeIcon } from '../../../helpers';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import globalStyle from '../../../styles/global';

import { Copy, Link, LinkBreak } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';
import BottomModalOption from '../../BottomModalOption';
import BottomModal from '../BottomModal';

import { useUseCase } from '@internxt-mobile/hooks/common';
import { time } from '@internxt-mobile/services/common/time';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import { setStringAsync } from 'expo-clipboard';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import notificationsService from '../../../services/NotificationsService';
import { NotificationType } from '../../../types';
import CenterModal from '../CenterModal';
import { SharedLinkSettingsModal } from '../SharedLinkSettingsModal';

export function SharedLinkInfoModal(): JSX.Element {
  const { executeUseCase: shareExistingShareLink } = useUseCase(driveUseCases.shareExistingShareLink, { lazy: true });
  const { executeUseCase: stopShareLink, loading: deletingShareLink } = useUseCase(driveUseCases.stopShareLink, {
    lazy: true,
  });

  const tailwind = useTailwind();

  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const { focusedItem: item } = useAppSelector((state) => state.drive);
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  const [sharedLinkSettingsModalOpen, setSharedLinkSettingsModalOpen] = useState(false);
  const { isSharedLinkOptionsModalOpen } = useAppSelector((state) => state.ui);

  if (!item) {
    return <></>;
  }

  const isFolder = checkIsFolder(item);

  const handleCopyLink = async () => {
    const existingLink = await driveUseCases.generateShareLink({
      itemId: item?.uuid as string,
      fileId: item?.fileId,
      displayCopyNotification: false,
      type: isFolder ? 'folder' : 'file',
    });

    if (existingLink?.link) {
      await setStringAsync(existingLink?.link);
      notificationsService.show({
        text1: strings.modals.LinkCopied.message,
        type: NotificationType.Success,
      });
    }
  };

  const handleShareLink = async () => {
    const existingLink = await driveUseCases.generateShareLink({
      itemId: item?.uuid as string,
      fileId: item?.fileId,
      displayCopyNotification: false,
      type: isFolder ? 'folder' : 'file',
    });

    if (existingLink?.link) {
      await shareExistingShareLink({ link: existingLink.link });
      dispatch(uiActions.setIsSharedLinkOptionsModalOpen(false));
    }
  };

  const handleDeleteShareLink = async () => {
    if (!item.uuid) {
      throw new Error('Item ID not found');
    }
    const result = await stopShareLink({
      itemUUID: item?.uuid,
      itemType: isFolder ? 'folder' : 'file',
    });

    if (result) {
      setConfirmDeleteModalOpen(false);
      dispatch(uiActions.setIsSharedLinkOptionsModalOpen(false));
    }
  };

  const handleShareLinkSettingsPress = () => {
    dispatch(uiActions.setIsSharedLinkOptionsModalOpen(false));
    setSharedLinkSettingsModalOpen(true);
  };

  const options = [
    {
      icon: <Copy size={20} color={getColor('text-gray-80')} />,
      label: strings.buttons.copyLink,
      onPress: handleCopyLink,
    },
    {
      icon: <Link size={20} color={getColor('text-gray-80')} />,
      label: strings.components.file_and_folder_options.shareLink,
      onPress: handleShareLink,
    },
    // {
    //   icon: <Gear size={20} color={getColor('text-gray-100')} />,
    //   label: strings.components.file_and_folder_options.shareSettings,
    //   onPress: handleShareLinkSettingsPress,
    // },
    {
      icon: <LinkBreak size={20} color={getColor('text-red')} />,
      textStyle: { color: getColor('text-red') },
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
            tailwind('absolute -bottom-1 -right-2 flex items-center justify-center rounded-full'),
            {
              width: 20,
              height: 20,
              backgroundColor: getColor('bg-gray-5'),
            },
          ]}
        >
          <View
            style={[
              tailwind('rounded-full flex items-center justify-center'),
              {
                width: 16,
                height: 16,
                backgroundColor: getColor('text-primary'),
              },
            ]}
          >
            <Link weight="bold" size={10} color={getColor('text-white')} />
          </View>
        </View>
      </View>

      <View style={tailwind('flex-shrink w-full')}>
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          style={[tailwind('text-base'), { color: getColor('text-gray-100') }, globalStyle.fontWeight.medium]}
        >
          {getDisplayName()}
        </Text>
        <View style={tailwind('flex flex-row items-center')}>
          <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-60') }]}>
            {!isFolder && <>{prettysize(item?.size || 0)}</>}
          </AppText>
          {!isFolder && (
            <View
              style={[
                tailwind('rounded-full mx-1.5'),
                {
                  width: 3,
                  height: 3,
                  backgroundColor: getColor('bg-gray-60'),
                },
              ]}
            />
          )}
          <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-60') }]}>{getUpdatedAt()}</AppText>
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
        style={{ backgroundColor: getColor('bg-surface') }}
      >
        <View style={tailwind('flex-grow')}>
          <View style={[tailwind('border-t overflow-hidden'), { borderTopColor: getColor('border-gray-10') }]}>
            {options.map((opt, index) => {
              return (
                <BottomModalOption
                  key={index}
                  leftSlot={opt.icon}
                  rightSlot={
                    <View style={tailwind('flex-grow items-center justify-center flex-row')}>
                      <AppText style={[tailwind('text-lg'), { color: getColor('text-gray-100') }, opt.textStyle]}>
                        {opt.label}
                      </AppText>
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
      <SharedLinkSettingsModal
        isCreatingShareLink={false}
        isOpen={sharedLinkSettingsModalOpen}
        onClose={() => setSharedLinkSettingsModalOpen(false)}
      />
      <CenterModal isOpen={confirmDeleteModalOpen} onClosed={() => setConfirmDeleteModalOpen(false)}>
        <View style={[tailwind('rounded-xl p-4'), { backgroundColor: getColor('bg-surface') }]}>
          <AppText style={[tailwind('text-xl mb-4'), { color: getColor('text-gray-100') }]} medium>
            {strings.modals.deleteShareLink.title}
          </AppText>
          <AppText style={[tailwind('mb-6 mt-0'), { color: getColor('text-gray-80') }]}>
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
