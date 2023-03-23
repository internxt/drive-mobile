import prettysize from 'prettysize';
import React, { useRef, useState } from 'react';
import { PermissionsAndroid, Platform, TouchableOpacity, View } from 'react-native';

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
import { fs } from '@internxt-mobile/services/FileSystemService';
import errorService from '@internxt-mobile/services/ErrorService';
import drive from '@internxt-mobile/services/drive';
import AuthService from '@internxt-mobile/services/AuthService';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import { Abortable } from '@internxt-mobile/types/index';
import CenterModal from '../CenterModal';
import AppProgressBar from 'src/components/AppProgressBar';

function DriveItemInfoModal(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const driveCtx = useDrive();
  const [downloadProgress, setDownloadProgress] = useState({ progress: 0, totalBytes: 0, bytesReceived: 0 });
  const { focusedItem: item } = useAppSelector((state) => state.drive);
  const { showItemModal } = useAppSelector((state) => state.ui);
  const [sharedLinkSettingsModalOpen, setSharedLinkSettingsModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const downloadAbortableRef = useRef<Abortable>();
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

  const downloadItem = async (fileId: string, decryptedFilePath: string) => {
    const { credentials } = await AuthService.getAuthCredentials();

    const { downloadPath } = await drive.file.downloadFile(credentials.user, fileId, {
      downloadPath: decryptedFilePath,
      downloadProgressCallback(progress, bytesReceived, totalBytes) {
        setDownloadProgress({
          progress,
          bytesReceived,
          totalBytes,
        });
      },
      onAbortableReady(abortable) {
        downloadAbortableRef.current = abortable;
      },
    });

    return downloadPath;
  };
  const handleExportFile = async () => {
    try {
      if (!item.fileId) {
        throw new Error('Item fileID not found');
      }

      const decryptedFilePath = drive.file.getDecryptedFilePath(item.name, item.type);
      const exists = await drive.file.existsDecrypted(item.name, item.type);
      if (exists) {
        await fs.shareFile({
          title: item.name,
          fileUri: decryptedFilePath,
        });

        return decryptedFilePath;
      }

      setDownloadProgress({ totalBytes: 0, progress: 0, bytesReceived: 0 });
      setExporting(true);
      const downloadPath = await downloadItem(item.fileId, decryptedFilePath);
      setExporting(false);
      await fs.shareFile({
        title: item.name,
        fileUri: downloadPath,
      });
    } catch (error) {
      notifications.error(strings.errors.generic.message);
      errorService.reportError(error);
    } finally {
      setExporting(false);
    }
  };
  const handleAbortDownload = () => {
    setExporting(false);
    if (!downloadAbortableRef.current) return;

    downloadAbortableRef.current('User requested abort');
  };
  const handleAndroidDownloadFile = async () => {
    try {
      const externalStorageWritePerm = await PermissionsAndroid.check('android.permission.WRITE_EXTERNAL_STORAGE');

      if (!externalStorageWritePerm) {
        dispatch(uiActions.setShowItemModal(false));

        notifications.error(strings.errors.enableWriteExternalStoragePermissions);
        return;
      }
      setDownloadProgress({ totalBytes: 0, progress: 0, bytesReceived: 0 });
      if (!item.fileId) {
        throw new Error('Item fileID not found');
      }

      const decryptedFilePath = drive.file.getDecryptedFilePath(item.name, item.type);

      // 1. Check if file exists already
      const existsDecrypted = await drive.file.existsDecrypted(item.name, item.type);

      dispatch(uiActions.setShowItemModal(false));

      // 2. If the file doesn't exists, download it
      if (!existsDecrypted) {
        setExporting(true);
        await downloadItem(item.fileId, decryptedFilePath);
        setExporting(false);
      }

      // 3. Copy the decrypted file (is a tmp, so this will dissapear, that's why we copy it)
      await fs.moveToAndroidDownloads(decryptedFilePath);

      notifications.success(strings.messages.driveDownloadSuccess);
    } catch (error) {
      notifications.error(strings.errors.generic.message);
      errorService.reportError(error);
    } finally {
      setExporting(false);
    }
  };

  const handleiOSSaveToFiles = async () => {
    try {
      setDownloadProgress({ totalBytes: 0, progress: 0, bytesReceived: 0 });
      if (!item.fileId) {
        throw new Error('Item fileID not found');
      }

      const decryptedFilePath = drive.file.getDecryptedFilePath(item.name, item.type);

      // 1. Check if file exists already
      const existsDecrypted = await drive.file.existsDecrypted(item.name, item.type);

      dispatch(uiActions.setShowItemModal(false));

      // 2. If the file doesn't exists, download it
      if (!existsDecrypted) {
        setExporting(true);
        await downloadItem(item.fileId, decryptedFilePath);
        setExporting(false);
      }

      // 3. Share to iOS files app
      await fs.shareFile({
        title: item.name,
        fileUri: decryptedFilePath,
        saveToiOSFiles: true,
      });
    } catch (error) {
      notifications.error(strings.errors.generic.message);
      errorService.reportError(error);
    } finally {
      setExporting(false);
    }
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
      visible: !isFolder,
      icon: <ArrowSquareOut size={20} color={getColor('text-gray-100')} />,
      label: strings.components.file_and_folder_options.exportFile,
      onPress: handleExportFile,
      disabled: exporting,
    },
    {
      visible: Platform.OS === 'ios' && !isFolder,
      icon: <DownloadSimple size={20} color={getColor('text-gray-100')} />,
      label: strings.components.file_and_folder_options.saveToFiles,
      onPress: handleiOSSaveToFiles,
    },
    {
      visible: Platform.OS === 'android' && !isFolder,
      icon: <DownloadSimple size={20} color={getColor('text-gray-100')} />,
      label: strings.components.file_and_folder_options.downloadFile,
      onPress: handleAndroidDownloadFile,
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

  const getDownloadProgressMessage = () => {
    if (!downloadProgress.totalBytes) {
      return strings.generic.calculating + '...';
    }
    const bytesReceivedStr = prettysize(downloadProgress.bytesReceived);
    const totalBytesStr = prettysize(downloadProgress.totalBytes);
    return `${bytesReceivedStr} ${strings.modals.downloadingFile.of} ${totalBytesStr}`;
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
                    disabled={opt.disabled}
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
      <CenterModal
        isOpen={exporting}
        onClosed={() => {
          /** NOOP */
        }}
      >
        <>
          <View style={tailwind('mt-6 mb-4 mx-6')}>
            <AppText medium style={tailwind('text-lg text-center text-gray-100')}>
              {strings.modals.downloadingFile.title}
            </AppText>

            <AppText style={tailwind('text-center text-gray-50 mt-1')}>{getDownloadProgressMessage()}</AppText>
          </View>
          <View style={tailwind('mx-6 mb-6')}>
            <AppProgressBar totalValue={1} height={4} currentValue={downloadProgress.progress} />
          </View>
          <TouchableOpacity
            onPress={handleAbortDownload}
            style={tailwind('h-14 flex items-center justify-center border-t border-gray-10')}
          >
            <AppText medium>{strings.buttons.cancel}</AppText>
          </TouchableOpacity>
        </>
      </CenterModal>
    </Portal>
  );
}

export default DriveItemInfoModal;
