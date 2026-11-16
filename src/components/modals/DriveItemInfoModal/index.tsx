import prettysize from 'prettysize';
import { useRef, useState } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';

import Portal from '@burstware/react-native-portal';
import { useDrive } from '@internxt-mobile/hooks/drive';
import { NotEnoughSpaceOnDeviceError } from '@internxt-mobile/services/common/filesystem/errors';
import errorService from '@internxt-mobile/services/ErrorService';
import { fs } from '@internxt-mobile/services/FileSystemService';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import { logger } from '@internxt-mobile/services/common';
import { time } from '@internxt-mobile/services/common/time';
import { notifyParentChanged } from '@internxt-mobile/services/native/InternxtSignalingModule';
import { Abortable } from '@internxt-mobile/types/index';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import {
  ArrowsOutCardinal,
  ArrowSquareOut,
  DownloadSimple,
  Eye,
  Link,
  PencilSimple,
  Trash,
} from 'phosphor-react-native';
import AppProgressBar from 'src/components/AppProgressBar';
import AppText from 'src/components/AppText';
import { SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET } from 'src/helpers/services';
import strings from '../../../../assets/lang/strings';
import { checkIsFolder, FolderIcon, getFileTypeIcon } from '../../../helpers';
import useGetColor from '../../../hooks/useColor';
import { getFileSize } from '../../../helpers/driveItems';
import { isLargeDownload, notifyDownloadSizeCheck } from '../../../services/drive/file/utils/downloadSizeCheck';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { driveActions } from '../../../store/slices/drive';
import { uiActions } from '../../../store/slices/ui';
import globalStyle from '../../../styles/global';
import BottomModalOption from '../../BottomModalOption';
import BottomModal from '../BottomModal';
import CenterModal from '../CenterModal';
import { SharedLinkSettingsModal } from '../SharedLinkSettingsModal';

function DriveItemInfoModal(): JSX.Element {
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const driveCtx = useDrive();
  const [downloadProgress, setDownloadProgress] = useState({ progress: 0, totalBytes: 0, bytesReceived: 0 });
  const { focusedItem: item } = useAppSelector((state) => state.drive);

  const { showItemModal } = useAppSelector((state) => state.ui);
  const [sharedLinkSettingsModalOpen, setSharedLinkSettingsModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const downloadAbortableRef = useRef<Abortable>();
  const isDownloadCancelledByUserRef = useRef(false);
  if (!item) {
    return <></>;
  }

  const isFolder = checkIsFolder(item);

  const handleRenameItem = () => {
    dispatch(uiActions.setShowItemModal(false));
    dispatch(uiActions.setShowRenameModal(true));
  };

  const handleMoveItem = () => {
    dispatch(uiActions.setShowItemModal(false));
    dispatch(uiActions.setShowMoveModal(true));
    dispatch(driveActions.setItemsToMove([item]));
  };

  const handleUndoMoveToTrash = async () => {
    const { success } = await driveUseCases.restoreDriveItems(
      [
        {
          fileId: isFolder ? undefined : item.uuid,
          folderId: isFolder ? item.uuid : undefined,
          destinationFolderId: item.parentUuid ?? item.folderUuid ?? '',
        },
      ],
      { displayNotification: false },
    );
    if (success && driveCtx.focusedFolder?.uuid) {
      await SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET(500);
      driveCtx.loadFolderContent(driveCtx.focusedFolder.uuid, { pullFrom: ['network'], resetPagination: true });
    }
  };
  const handleTrashItem = async () => {
    dispatch(uiActions.setShowItemModal(false));
    const { success } = await driveUseCases.moveItemsToTrash(
      [
        {
          uuid: item.uuid,
          type: isFolder ? 'folder' : 'file',
        },
      ],

      () => handleUndoMoveToTrash(),
    );

    if (success) {
      const parentFolderUuid = isFolder ? item.parentUuid : item.folderUuid;
      if (parentFolderUuid) {
        void notifyParentChanged(parentFolderUuid);
      }
    }

    if (driveCtx.focusedFolder?.uuid) {
      await SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET(500);
      driveCtx.loadFolderContent(driveCtx.focusedFolder.uuid, { pullFrom: ['network'], resetPagination: true });
    }
  };

  const handleGenerateShareLink = async () => {
    dispatch(uiActions.setShowItemModal(false));
    setSharedLinkSettingsModalOpen(true);
  };

  const handleOpenItem = () => {
    return;
  };

  const downloadFocusedFile = (): Promise<string> => {
    const fileSize = getFileSize(item);
    return driveUseCases.downloadFileToDevice({
      file: item,
      onDownloadStarted: () => {
        if (isLargeDownload(fileSize)) {
          notifyDownloadSizeCheck('large', fileSize);
        }
        setDownloadProgress({ totalBytes: 0, progress: 0, bytesReceived: 0 });
        setExporting(true);
      },
      onProgress: (progress, bytesReceived, totalBytes) => {
        setDownloadProgress({ progress, bytesReceived, totalBytes });
      },
      onAbortableReady: (abortable) => {
        downloadAbortableRef.current = abortable;
      },
    });
  };

  const showDownloadError = (error: unknown) => {
    if (error instanceof NotEnoughSpaceOnDeviceError) {
      notifyDownloadSizeCheck('notEnoughSpace', getFileSize(item));
      return;
    }
    notifications.error(strings.errors.generic.message);
  };

  const handleExportFile = async () => {
    isDownloadCancelledByUserRef.current = false;
    try {
      const downloadPath = await downloadFocusedFile();
      setExporting(false);
      if (!downloadPath) {
        return;
      }
      await fs.shareFile({
        title: item.name,
        fileUri: downloadPath,
      });
    } catch (error) {
      if (isDownloadCancelledByUserRef.current) {
        return;
      }
      showDownloadError(error);
      if (error instanceof NotEnoughSpaceOnDeviceError) {
        return;
      }
      logger.error('Error on handleExportFile function:', JSON.stringify(error));
      errorService.reportError(error);
    } finally {
      setExporting(false);
      dispatch(uiActions.setShowItemModal(false));
    }
  };

  const handleAbortDownload = () => {
    isDownloadCancelledByUserRef.current = true;
    setExporting(false);
    dispatch(uiActions.setShowItemModal(false));

    if (!downloadAbortableRef.current) return;

    downloadAbortableRef.current('User requested abort');
  };

  const handleAndroidDownloadFile = async () => {
    isDownloadCancelledByUserRef.current = false;
    try {
      dispatch(uiActions.setShowItemModal(false));
      const decryptedFilePath = await downloadFocusedFile();
      setExporting(false);
      if (!decryptedFilePath) {
        return;
      }

      // The decrypted file lives in a temp dir that gets cleared, so it is saved to Downloads
      await fs.moveToAndroidDownloads(decryptedFilePath);

      notifications.success(strings.messages.driveDownloadSuccess);
    } catch (error) {
      if (isDownloadCancelledByUserRef.current) {
        return;
      }
      showDownloadError(error);
      if (error instanceof NotEnoughSpaceOnDeviceError) {
        return;
      }
      logger.error('Error on handleAndroidDownloadFile function:', JSON.stringify(error));
      errorService.reportError(error);
    } finally {
      setExporting(false);
    }
  };

  const handleiOSSaveToFiles = async () => {
    isDownloadCancelledByUserRef.current = false;
    try {
      dispatch(uiActions.setShowItemModal(false));
      const decryptedFilePath = await downloadFocusedFile();
      setExporting(false);
      if (!decryptedFilePath) {
        return;
      }

      await fs.shareFile({
        title: item.name,
        fileUri: decryptedFilePath,
        saveToiOSFiles: true,
      });

      notifications.success(strings.messages.driveDownloadSuccess);
    } catch (error) {
      if (isDownloadCancelledByUserRef.current) {
        return;
      }
      showDownloadError(error);
      if (error instanceof NotEnoughSpaceOnDeviceError) {
        return;
      }
      logger.error('Error on handleiOSSaveToFiles function:', JSON.stringify(error));
      errorService.reportError(error);
    } finally {
      setExporting(false);
    }
  };

  const options = [
    {
      visible: false,
      icon: <Eye size={20} color={getColor('text-gray-80')} />,
      label: strings.components.file_and_folder_options.open,
      onPress: handleOpenItem,
    },
    {
      icon: <PencilSimple size={20} color={getColor('text-gray-80')} />,
      label: strings.buttons.rename,
      onPress: handleRenameItem,
    },
    {
      icon: <ArrowsOutCardinal size={20} color={getColor('text-gray-80')} />,
      label: strings.buttons.move,
      onPress: handleMoveItem,
    },
    {
      visible: !isFolder,
      icon: <ArrowSquareOut size={20} color={getColor('text-gray-80')} />,
      label: strings.components.file_and_folder_options.exportFile,
      onPress: handleExportFile,
      disabled: exporting,
    },
    {
      visible: Platform.OS === 'ios' && !isFolder,
      icon: <DownloadSimple size={20} color={getColor('text-gray-80')} />,
      label: strings.components.file_and_folder_options.saveToFiles,
      onPress: handleiOSSaveToFiles,
    },
    {
      visible: Platform.OS === 'android' && !isFolder,
      icon: <DownloadSimple size={20} color={getColor('text-gray-80')} />,
      label: strings.components.file_and_folder_options.downloadFile,
      onPress: handleAndroidDownloadFile,
    },
    {
      icon: <Link size={20} color={getColor('text-gray-80')} />,
      label: strings.components.file_and_folder_options.getLink,
      onPress: handleGenerateShareLink,
    },
    {
      icon: <Trash size={20} color={getColor('text-red')} />,
      textStyle: { color: getColor('text-red') },
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

    if (
      (item?.size || item?.size === 0) &&
      downloadProgress?.bytesReceived &&
      downloadProgress?.bytesReceived >= parseInt(item?.size?.toString())
    ) {
      return strings.generic.decrypting + '...';
    }

    const bytesReceivedStr = prettysize(downloadProgress.bytesReceived);
    const totalBytesStr = prettysize(downloadProgress.totalBytes);
    return `${bytesReceivedStr} ${strings.modals.downloadingFile.of} ${totalBytesStr}`;
  };

  const header = (
    <View className="flex-row">
      <View className="mr-3">
        {isFolder ? <FolderIcon width={40} height={40} /> : <FileIcon width={40} height={40} />}
      </View>

      <View className="flex-shrink w-full">
        <AppText
          numberOfLines={1}
          ellipsizeMode="middle"
          className="text-base"
          style={[{ color: getColor('text-gray-100') }, globalStyle.fontWeight.medium]}
        >
          {item?.name}
          {item?.type ? '.' + item.type : ''}
        </AppText>
        <View className="flex flex-row items-center">
          <AppText className="text-xs" style={{ color: getColor('text-gray-60') }}>
            {!isFolder && <>{prettysize(item?.size || 0)}</>}
          </AppText>
          {!isFolder && (
            <View
              className="rounded-full mx-1.5"
              style={{
                width: 3,
                height: 3,
                backgroundColor: getColor('bg-gray-60'),
              }}
            />
          )}
          <AppText className="text-xs" style={{ color: getColor('text-gray-60') }}>
            {getUpdatedAt()}
          </AppText>
        </View>
      </View>
    </View>
  );

  return (
    <Portal>
      <BottomModal
        safeAreaColor={getColor('bg-surface')}
        style={{ backgroundColor: getColor('bg-gray-5') }}
        isOpen={showItemModal}
        onClosed={() => dispatch(uiActions.setShowItemModal(false))}
        header={header}
      >
        <View className="p-4">
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: getColor('bg-surface') }}>
            {options
              .filter((opt) => opt.visible !== false)
              .map((opt, index) => {
                return (
                  <BottomModalOption
                    disabled={opt.disabled}
                    key={index}
                    leftSlot={opt.icon}
                    rightSlot={
                      <View className="flex-grow items-center justify-center flex-row">
                        <AppText className="text-lg" style={[{ color: getColor('text-gray-100') }, opt.textStyle]}>
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
          <View className="mt-6 mb-4 mx-6">
            <AppText medium className="text-lg text-center" style={{ color: getColor('text-gray-100') }}>
              {strings.modals.downloadingFile.title}
            </AppText>

            <AppText className="text-center mt-1" style={{ color: getColor('text-gray-50') }}>
              {getDownloadProgressMessage()}
            </AppText>
          </View>
          <View className="mx-6 mb-6">
            <AppProgressBar totalValue={1} height={4} currentValue={downloadProgress.progress} />
          </View>
          <TouchableOpacity
            onPress={handleAbortDownload}
            className="h-14 flex items-center justify-center border-t"
            style={{ borderTopColor: getColor('border-gray-10') }}
          >
            <AppText medium style={{ color: getColor('text-gray-100') }}>
              {strings.buttons.cancel}
            </AppText>
          </TouchableOpacity>
        </>
      </CenterModal>
    </Portal>
  );
}

export default DriveItemInfoModal;
