import { useState } from 'react';

import { constants } from '../services/app';
import { asyncStorage } from '../services/asyncStorage';
import { LegacyDownloadRequiredError } from '../services/network/download';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { driveActions, driveThunks } from '../store/slices/drive';
import { uiActions } from '../store/slices/ui';
import { DevicePlatform, NotificationType } from '../types';
import { DriveItemDataProps, DriveItemStatus } from '../types/drive';
import {
  createEmptyFile,
  exists,
  FileManager,
  getDocumentsDir,
  pathToUri,
  showFileViewer,
} from '../services/fileSystem';
import analytics, { AnalyticsEventKey } from '../services/analytics';
import { downloadFile } from '../services/network';
import { downloadFile as legacyDownloadFile } from '../services/download';
import notificationsService from '../services/notifications';

interface UseDriveItemProps {
  data: DriveItemDataProps;
  status: DriveItemStatus;
}

const useDriveItem = (props: UseDriveItemProps) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [isDisabled, setIsDisabled] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [decryptionProgress, setDecryptionProgress] = useState(0);
  const isFolder = !props.data.type;
  const isIdle = props.status === DriveItemStatus.Idle;
  const isUploading = props.status === DriveItemStatus.Uploading;
  const isDownloading = props.status === DriveItemStatus.Downloading;
  async function download(params: { fileId: string; to: string }) {
    const { bucket, bridgeUser, userId, mnemonic } = await asyncStorage.getUser();

    return downloadFile(
      bucket,
      params.fileId,
      {
        encryptionKey: mnemonic,
        user: bridgeUser,
        password: userId,
      },
      constants.REACT_NATIVE_BRIDGE_URL,
      {
        toPath: params.to,
        downloadProgressCallback: setDownloadProgress,
        decryptionProgressCallback: setDecryptionProgress,
      },
    ).catch((err) => {
      if (err instanceof LegacyDownloadRequiredError) {
        const fileManager = new FileManager(params.to);

        return legacyDownloadFile(params.fileId, {
          fileManager,
          progressCallback: setDownloadProgress,
        });
      } else {
        throw err;
      }
    });
  }
  function trackDownloadStart() {
    return analytics.track(AnalyticsEventKey.FileDownloadStart, {
      file_id: props.data.id,
      file_size: props.data.size || 0,
      file_type: props.data.type || '',
      folder_id: props.data.parentId || null,
      platform: DevicePlatform.Mobile,
      email: user?.email || null,
      userId: user?.uuid || null,
    });
  }
  function trackDownloadSuccess() {
    return analytics.track(AnalyticsEventKey.FileDownloadFinished, {
      file_id: props.data.id,
      file_size: props.data.size || 0,
      file_type: props.data.type || '',
      folder_id: props.data.parentId || null,
      platform: DevicePlatform.Mobile,
      email: user?.email || null,
      userId: user?.uuid || null,
    });
  }
  function trackDownloadError(err: Error) {
    return analytics.track(AnalyticsEventKey.FileDownloadError, {
      file_id: props.data.id,
      file_size: props.data.size || 0,
      file_type: props.data.type || '',
      folder_id: props.data.parentId || null,
      platform: DevicePlatform.Mobile,
      error: err.message,
      email: user?.email || null,
      userId: user?.uuid || null,
    });
  }
  function trackFolderOpened() {
    return analytics.track(AnalyticsEventKey.FolderOpened, {
      folder_id: props.data.id,
      email: user?.email || null,
      userId: user?.uuid || null,
    });
  }
  function onFolderPressed() {
    trackFolderOpened();
    dispatch(driveThunks.getFolderContentThunk({ folderId: props.data.id }));
    dispatch(driveActions.addDepthAbsolutePath([props.data.name]));
  }
  async function onFilePressed(): Promise<void> {
    if (!isIdle) {
      return;
    }

    if (!props.data.fileId) {
      return;
    }

    setIsDisabled(true);

    const { name, type } = props.data;
    const destinationDir = await getDocumentsDir();
    let destinationPath = destinationDir + '/' + name + (type ? '.' + type : '');

    trackDownloadStart();
    setDownloadProgress(0);
    dispatch(driveActions.downloadSelectedFileStart());

    const fileAlreadyExists = await exists(destinationPath);

    if (fileAlreadyExists) {
      destinationPath = destinationDir + '/' + name + '-' + Date.now().toString() + (type ? '.' + type : '');
    }

    await createEmptyFile(destinationPath);
    await download({
      fileId: props.data.fileId.toString(),
      to: destinationPath,
    })
      .then(() => {
        const uri = pathToUri(destinationPath);
        trackDownloadSuccess();

        return showFileViewer(uri);
      })
      .catch((err) => {
        trackDownloadError(err);

        notificationsService.show({ type: NotificationType.Error, text1: 'Error downloading file' });
      })
      .finally(() => {
        dispatch(driveActions.downloadSelectedFileStop());
        setDownloadProgress(0);
        setDecryptionProgress(0);
        setIsDisabled(false);
      });
  }
  const onItemPressed = async () => {
    if (isDisabled) {
      return;
    }

    if (isFolder) {
      onFolderPressed();
    } else {
      onFilePressed();
    }
  };
  const onItemLongPressed = () => {
    dispatch(driveActions.focusItem(props.data));
    dispatch(uiActions.setShowItemModal(true));
  };
  const onActionsButtonPressed = () => {
    dispatch(driveActions.focusItem(props.data));
    dispatch(uiActions.setShowItemModal(true));
  };

  return {
    isFolder,
    isIdle,
    isUploading,
    isDownloading,
    downloadProgress,
    decryptionProgress,
    onItemPressed,
    onItemLongPressed,
    onActionsButtonPressed,
  };
};

export default useDriveItem;
