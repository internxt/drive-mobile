import prettysize from 'prettysize';
import { useRef, useState } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';

import Portal from '@burstware/react-native-portal';
import { useDrive } from '@internxt-mobile/hooks/drive';
import AuthService from '@internxt-mobile/services/AuthService';
import errorService from '@internxt-mobile/services/ErrorService';
import fileSystemService, { fs } from '@internxt-mobile/services/FileSystemService';
import notificationsService, { notifications } from '@internxt-mobile/services/NotificationsService';
import { logger } from '@internxt-mobile/services/common';
import { time } from '@internxt-mobile/services/common/time';
import drive from '@internxt-mobile/services/drive';
import { driveLocalDB } from '@internxt-mobile/services/drive/database';
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
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { checkIsFolder, FolderIcon, getFileSize, getFileTypeIcon, isEmptyFile } from '../../../helpers';
import useGetColor from '../../../hooks/useColor';
import { MAX_SIZE_TO_DOWNLOAD } from '../../../services/drive/constants';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { driveActions } from '../../../store/slices/drive';
import { uiActions } from '../../../store/slices/ui';
import globalStyle from '../../../styles/global';
import BottomModalOption from '../../BottomModalOption';
import BottomModal from '../BottomModal';
import CenterModal from '../CenterModal';
import { SharedLinkSettingsModal } from '../SharedLinkSettingsModal';

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

  const isFolder = checkIsFolder(item);

  const handleRenameItem = () => {
    dispatch(uiActions.setShowItemModal(false));
    dispatch(uiActions.setShowRenameModal(true));
  };

  const handleMoveItem = () => {
    dispatch(uiActions.setShowItemModal(false));
    dispatch(uiActions.setShowMoveModal(true));
    dispatch(driveActions.setItemToMove(item));
  };

  const isFileDownloadable = (): boolean => {
    if (parseInt(item.size?.toString() ?? '0') > MAX_SIZE_TO_DOWNLOAD['10GB']) {
      notificationsService.info(strings.messages.downloadLimit);
      return false;
    }
    return true;
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
    if (success && driveCtx.focusedFolder?.id) {
      await SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET(500);
      driveCtx.loadFolderContent(driveCtx.focusedFolder.uuid, { pullFrom: ['network'], resetPagination: true });
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
          uuid: item?.uuid,
          type: isFolder ? 'folder' : 'file',
        },
      ],

      () => handleUndoMoveToTrash(),
    );

    if (success && dbItem?.id) {
      await driveLocalDB.deleteItem({ id: dbItem.id });
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

  const downloadItem = async (fileId: string, bucketId: string, decryptedFilePath: string, fileSize: number) => {
    const { credentials } = await AuthService.getAuthCredentials();
    try {
      const hasEnoughSpace = await fileSystemService.checkAvailableStorage(fileSize);
      if (!hasEnoughSpace) {
        notifications.error(strings.errors.notEnoughSpaceOnDevice);
        throw new Error(strings.errors.notEnoughSpaceOnDevice);
      }
    } catch (error) {
      logger.error('Error on downloadItem function:', JSON.stringify(error));
      errorService.reportError(error);
    }

    const { downloadPath } = await drive.file.downloadFile(
      credentials.user,
      bucketId,
      fileId,
      {
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
      },
      fileSize,
    );

    return downloadPath;
  };

  const handleExportFile = async () => {
    try {
      const fileSize = getFileSize(item);
      if (!item.fileId && fileSize !== 0) {
        throw new Error('Item fileID not found');
      }
      const canDownloadFile = isFileDownloadable();
      if (!canDownloadFile) {
        dispatch(uiActions.setShowItemModal(false));
        return;
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

      let downloadPath: string;

      if (isEmptyFile(item)) {
        await drive.file.createEmptyDownloadedFile(decryptedFilePath);
        downloadPath = decryptedFilePath;
      } else {
        if (!item.fileId) {
          throw new Error('Item fileID not found for non-empty file');
        }
        downloadPath = await downloadItem(item.fileId, item.bucket as string, decryptedFilePath, fileSize);
      }

      setExporting(false);
      await fs.shareFile({
        title: item.name,
        fileUri: downloadPath,
      });
    } catch (error) {
      notifications.error(strings.errors.generic.message);
      logger.error('Error on handleExportFile function:', JSON.stringify(error));
      errorService.reportError(error);
    } finally {
      setExporting(false);
      dispatch(uiActions.setShowItemModal(false));
    }
  };

  const handleAbortDownload = () => {
    setExporting(false);
    dispatch(uiActions.setShowItemModal(false));

    if (!downloadAbortableRef.current) return;

    downloadAbortableRef.current('User requested abort');
  };

  const handleAndroidDownloadFile = async () => {
    try {
      setDownloadProgress({ totalBytes: 0, progress: 0, bytesReceived: 0 });
      const fileSize = getFileSize(item);
      if (!item.fileId && fileSize !== 0) {
        throw new Error('Item fileID not found');
      }
      const canDownloadFile = isFileDownloadable();
      if (!canDownloadFile) {
        dispatch(uiActions.setShowItemModal(false));
        return;
      }

      const decryptedFilePath = drive.file.getDecryptedFilePath(item.name, item.type);

      // 1. Check if file exists already
      const existsDecrypted = await drive.file.existsDecrypted(item.name, item.type);

      dispatch(uiActions.setShowItemModal(false));

      // 2. If the file doesn't exists, download it
      if (!existsDecrypted) {
        setExporting(true);
        if (isEmptyFile(item)) {
          await drive.file.createEmptyDownloadedFile(decryptedFilePath);
        } else {
          await downloadItem(item.fileId as string, item.bucket as string, decryptedFilePath, fileSize);
        }
        setExporting(false);
      }

      // 3. Copy the decrypted file (is a tmp, so this will dissapear, that's why we copy it)
      await fs.moveToAndroidDownloads(decryptedFilePath);

      notifications.success(strings.messages.driveDownloadSuccess);
    } catch (error) {
      notifications.error(strings.errors.generic.message);
      logger.error('Error on handleAndroidDownloadFile function:', JSON.stringify(error));
      errorService.reportError(error);
    } finally {
      setExporting(false);
    }
  };

  const handleiOSSaveToFiles = async () => {
    try {
      setDownloadProgress({ totalBytes: 0, progress: 0, bytesReceived: 0 });
      const fileSize = getFileSize(item);
      if (!item.fileId && fileSize !== 0) {
        throw new Error('Item fileID not found');
      }
      const canDownloadFile = isFileDownloadable();
      if (!canDownloadFile) {
        dispatch(uiActions.setShowItemModal(false));
        return;
      }

      const decryptedFilePath = drive.file.getDecryptedFilePath(item.name, item.type);

      // 1. Check if file exists already
      const existsDecrypted = await drive.file.existsDecrypted(item.name, item.type);

      dispatch(uiActions.setShowItemModal(false));

      // 2. If the file doesn't exists, download it
      if (!existsDecrypted) {
        if (isEmptyFile(item)) {
          await drive.file.createEmptyDownloadedFile(decryptedFilePath);
        } else {
          setExporting(true);

          await downloadItem(item.fileId as string, item.bucket as string, decryptedFilePath, fileSize);
          setExporting(false);
        }
      }

      // 3. Share to iOS files app
      await fs.shareFile({
        title: item.name,
        fileUri: decryptedFilePath,
        saveToiOSFiles: true,
      });
    } catch (error) {
      notifications.error(strings.errors.generic.message);
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
    <View style={tailwind('flex-row')}>
      <View style={tailwind('mr-3')}>
        {isFolder ? <FolderIcon width={40} height={40} /> : <FileIcon width={40} height={40} />}
      </View>

      <View style={tailwind('flex-shrink w-full')}>
        <AppText
          numberOfLines={1}
          ellipsizeMode="middle"
          style={[tailwind('text-base'), { color: getColor('text-gray-100') }, globalStyle.fontWeight.medium]}
        >
          {item?.name}
          {item?.type ? '.' + item.type : ''}
        </AppText>
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
    <Portal>
      <BottomModal
        safeAreaColor={getColor('bg-surface')}
        style={{ backgroundColor: getColor('bg-gray-5') }}
        isOpen={showItemModal}
        onClosed={() => dispatch(uiActions.setShowItemModal(false))}
        header={header}
      >
        <View style={tailwind('p-4')}>
          <View style={[tailwind('rounded-2xl overflow-hidden'), { backgroundColor: getColor('bg-surface') }]}>
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
            <AppText medium style={[tailwind('text-lg text-center'), { color: getColor('text-gray-100') }]}>
              {strings.modals.downloadingFile.title}
            </AppText>

            <AppText style={[tailwind('text-center mt-1'), { color: getColor('text-gray-50') }]}>
              {getDownloadProgressMessage()}
            </AppText>
          </View>
          <View style={tailwind('mx-6 mb-6')}>
            <AppProgressBar totalValue={1} height={4} currentValue={downloadProgress.progress} />
          </View>
          <TouchableOpacity
            onPress={handleAbortDownload}
            style={[
              tailwind('h-14 flex items-center justify-center border-t'),
              { borderTopColor: getColor('border-gray-10') },
            ]}
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
