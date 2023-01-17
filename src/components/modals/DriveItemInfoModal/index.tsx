import prettysize from 'prettysize';
import React, { useState } from 'react';
import { View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import { FolderIcon, getFileTypeIcon } from '../../../helpers';
import globalStyle from '../../../styles/global';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import { driveActions } from '../../../store/slices/drive';
import BottomModalOption from '../../BottomModalOption';
import BottomModal from '../BottomModal';
import {
  Link,
  Trash,
  ArrowsOutCardinal,
  Eye,
  ArrowSquareOut,
  DownloadSimple,
  PencilSimple,
} from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';
import { time } from '@internxt-mobile/services/common/time';
import AppText from 'src/components/AppText';
import { SharedLinkSettingsModal } from '../SharedLinkSettingsModal';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import { useDrive } from '@internxt-mobile/hooks/drive';
import { driveLocalDB } from '@internxt-mobile/services/drive/database';
import { DriveItemData } from '@internxt-mobile/types/drive';
import Portal from '@burstware/react-native-portal';
function DriveItemInfoModal(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const driveCtx = useDrive();
  const { focusedItem: item } = useAppSelector((state) => state.drive);
  const { showItemModal } = useAppSelector((state) => state.ui);
  const [sharedLinkSettingsModalOpen, setSharedLinkSettingsModalOpen] = useState(false);
  if (!item) {
    return <></>;
  }

  const isFolder = !item.fileId;

  const handleRenameItem = () => {
    dispatch(uiActions.setShowItemModal(false));
    dispatch(uiActions.setShowRenameModal(true));
  };

  const handleMoveItem = () => {
    dispatch(uiActions.setShowItemModal(false));
    dispatch(uiActions.setShowMoveModal(true));
    dispatch(driveActions.setItemToMove(item));
  };

  const handleUndoMoveToTrash = async (dbItem: DriveItemData) => {
    const { success } = await driveUseCases.restoreDriveItems(
      [
        {
          fileId: item.fileId,
          folderId: isFolder ? item.folderId : undefined,
          destinationFolderId: item.parentId || (item.folderId as number),
        },
      ],
      { displayNotification: false },
    );
    if (success && driveCtx.currentFolder) {
      await driveLocalDB.saveItems([dbItem]);
      driveCtx.loadFolderContent(driveCtx.currentFolder.id, { pullFrom: ['cache'] });
    }
  };
  const handleTrashItem = async () => {
    const dbItem = await driveLocalDB.getDriveItem(item.id);
    dispatch(uiActions.setShowItemModal(false));
    const { success } = await driveUseCases.moveItemsToTrash(
      [
        {
          dbItemId: dbItem?.id || item.id,
          id: isFolder ? item.id.toString() : (item.fileId as string),
          type: isFolder ? 'folder' : 'file',
        },
      ],

      () => dbItem && handleUndoMoveToTrash(dbItem),
    );

    if (success && driveCtx.currentFolder) {
      driveCtx.loadFolderContent(driveCtx.currentFolder.id, { pullFrom: ['cache'] });
    }
  };

  const handleGenerateShareLink = async () => {
    dispatch(uiActions.setShowItemModal(false));
    setSharedLinkSettingsModalOpen(true);
  };

  const handleOpenItem = () => {
    return;
  };

  const handleExportFile = async () => {
    throw new Error('Should implement');
  };

  const handleDownloadFile = () => {
    throw new Error('Should implement');
  };
  const options = [
    {
      visible: false,
      icon: <Eye size={20} color={getColor('text-gray-100')} />,
      label: strings.components.file_and_folder_options.open,
      onPress: handleOpenItem,
    },
    {
      icon: <PencilSimple size={20} color={getColor('text-gray-100')} />,
      label: strings.buttons.rename,
      onPress: handleRenameItem,
    },
    {
      icon: <ArrowsOutCardinal size={20} color={getColor('text-gray-100')} />,
      label: strings.buttons.move,
      onPress: handleMoveItem,
    },
    {
      visible: false,
      icon: <ArrowSquareOut size={20} color={getColor('text-gray-100')} />,
      label: strings.components.file_and_folder_options.exportFile,
      onPress: handleExportFile,
    },
    {
      visible: false,
      icon: <DownloadSimple size={20} color={getColor('text-gray-100')} />,
      label: strings.components.file_and_folder_options.downloadFile,
      onPress: handleDownloadFile,
    },
    {
      icon: <Link size={20} color={getColor('text-gray-100')} />,
      label: strings.components.file_and_folder_options.getLink,
      onPress: handleGenerateShareLink,
    },
    {
      icon: <Trash size={20} color={getColor('text-red-60')} />,
      textStyle: tailwind('text-red-60'),
      label: strings.components.file_and_folder_options.delete,
      onPress: handleTrashItem,
    },
  ];

  const FileIcon = getFileTypeIcon(item?.type || '');

  const getUpdatedAt = () => {
    // eslint-disable-next-line quotes
    return time.getFormattedDate(item.updatedAt, "dd LLL yyyy 'at' HH:mm");
  };
  const header = (
    <View style={tailwind('flex-row')}>
      <View style={tailwind('mr-3')}>
        {isFolder ? <FolderIcon width={40} height={40} /> : <FileIcon width={40} height={40} />}
      </View>

      <View style={tailwind('flex-shrink w-full')}>
        <AppText
          numberOfLines={1}
          ellipsizeMode="middle"
          style={[tailwind('text-base text-gray-100'), globalStyle.fontWeight.medium]}
        >
          {item?.name}
          {item?.type ? '.' + item.type : ''}
        </AppText>
        <View style={tailwind('flex flex-row items-center')}>
          <AppText style={tailwind('text-xs text-gray-60')}>{!isFolder && <>{prettysize(item?.size || 0)}</>}</AppText>
          {!isFolder && <View style={[tailwind('bg-gray-60 rounded-full mx-1.5'), { width: 3, height: 3 }]} />}
          <AppText style={tailwind('text-xs text-gray-60')}>{getUpdatedAt()}</AppText>
        </View>
      </View>
    </View>
  );

  return (
    <Portal>
      <BottomModal isOpen={showItemModal} onClosed={() => dispatch(uiActions.setShowItemModal(false))} header={header}>
        <View style={tailwind('flex-grow')}>
          <View style={tailwind('border-t border-gray-5 overflow-hidden')}>
            {options
              .filter((opt) => opt.visible !== false)
              .map((opt, index) => {
                return (
                  <BottomModalOption
                    key={index}
                    leftSlot={opt.icon}
                    rightSlot={
                      <View style={tailwind('flex-grow items-center justify-center flex-row')}>
                        <AppText style={[tailwind('text-lg text-neutral-500'), opt.textStyle]}>{opt.label}</AppText>
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
        isCreatingShareLink
        isOpen={sharedLinkSettingsModalOpen}
        onClose={() => setSharedLinkSettingsModalOpen(false)}
      />
    </Portal>
  );
}

export default DriveItemInfoModal;
