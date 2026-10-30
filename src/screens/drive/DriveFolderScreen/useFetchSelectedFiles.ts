import {
  FileTooLargeToDownloadError,
  NotEnoughSpaceOnDeviceError,
} from '@internxt-mobile/services/common/filesystem/errors';
import errorService from '@internxt-mobile/services/ErrorService';
import { fs } from '@internxt-mobile/services/FileSystemService';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import { DriveItemData, DriveListItem } from '@internxt-mobile/types/drive/item';
import { Abortable } from '@internxt-mobile/types/index';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import strings from 'assets/lang/strings';
import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { getDisplayName } from 'src/helpers/itemNames';
import { getFileSize } from '../../../helpers/driveItems';

const DOWNLOAD_ABORT_REASON = 'User requested abort';
export const FILE_COMPLETE_PROGRESS = 1;
const SAVE_PICKER_CANCELLED_CODE = 'CANCELLED';

export interface SelectionDownloadProgress {
  currentFileIndex: number;
  fileCount: number;
  currentFile: DriveItemData;
  currentFileProgress: number;
  currentFileBytesReceived: number;
  currentFileTotalBytes: number;
  isCurrentFileComplete: boolean;
}

interface UseFetchSelectedFilesParams {
  onFinished: () => void;
}

interface FetchedFiles {
  filePaths: string[];
  failedFiles: DriveItemData[];
  hasNoSpaceFailure: boolean;
}

const isSavePickerCancelled = (error: unknown) => (error as { code?: string })?.code === SAVE_PICKER_CANCELLED_CODE;

const getDownloadFailureText = ({ filePaths, failedFiles, hasNoSpaceFailure }: FetchedFiles) => {
  if (hasNoSpaceFailure) {
    return strings.errors.notEnoughSpaceOnDevice;
  }
  const [firstFailedFile] = failedFiles;
  if (failedFiles.length === 1) {
    return strings.formatString(strings.messages.fileCouldNotBeDownloaded, getDisplayName(firstFailedFile)).toString();
  }
  if (filePaths.length === 0) {
    return strings.formatString(strings.messages.filesCouldNotBeDownloaded, failedFiles.length).toString();
  }
  return strings
    .formatString(strings.messages.filesPartiallyDownloaded, filePaths.length, failedFiles.length)
    .toString();
};

const showFailedFilesNotification = (fetchedFiles: FetchedFiles) => {
  if (fetchedFiles.failedFiles.length > 0) {
    notifications.error(getDownloadFailureText(fetchedFiles));
  }
};

const showDownloadResultNotification = (fetchedFiles: FetchedFiles) => {
  if (fetchedFiles.failedFiles.length > 0) {
    showFailedFilesNotification(fetchedFiles);
    return;
  }
  notifications.success(
    fetchedFiles.filePaths.length === 1
      ? strings.messages.driveDownloadSuccess
      : strings.formatString(strings.messages.filesDownloaded, fetchedFiles.filePaths.length).toString(),
  );
};

export const useFetchSelectedFiles = ({ onFinished }: UseFetchSelectedFilesParams) => {
  const [downloadProgress, setDownloadProgress] = useState<SelectionDownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const isFetchingRef = useRef(false);
  const isDownloadCancelledRef = useRef(false);
  const currentDownloadAbortRef = useRef<Abortable>();

  const fetchFile = async (file: DriveItemData) => {
    if (driveUseCases.isFileTooLargeToDownload(file)) {
      throw new FileTooLargeToDownloadError('File exceeds the download size limit');
    }
    return driveUseCases.downloadFileToDevice({
      file,
      onProgress: (currentFileProgress, currentFileBytesReceived, currentFileTotalBytes) => {
        setDownloadProgress(
          (previousProgress) =>
            previousProgress && {
              ...previousProgress,
              currentFileProgress,
              currentFileBytesReceived,
              currentFileTotalBytes,
            },
        );
      },
      onAbortableReady: (abortable) => {
        currentDownloadAbortRef.current = abortable;
        if (isDownloadCancelledRef.current) {
          abortable(DOWNLOAD_ABORT_REASON);
        }
      },
    });
  };

  const downloadAndSaveFile = async (file: DriveItemData) => {
    const decryptedFilePath = await fetchFile(file);
    if (Platform.OS === 'android') {
      await fs.moveToAndroidDownloads(decryptedFilePath);
    }
    return decryptedFilePath;
  };

  const runExclusively = async (action: () => Promise<void>) => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    setIsDownloading(true);
    try {
      await action();
    } finally {
      isFetchingRef.current = false;
      setIsDownloading(false);
    }
  };

  const fetchFiles = async (
    items: DriveListItem[],
    getFilePath: (file: DriveItemData) => Promise<string>,
  ): Promise<FetchedFiles | null> => {
    isDownloadCancelledRef.current = false;
    const files = items.map((item) => item.data);
    const filePaths: string[] = [];
    const failedFiles: DriveItemData[] = [];
    let hasNoSpaceFailure = false;

    for (const [fileIndex, file] of files.entries()) {
      if (isDownloadCancelledRef.current) {
        break;
      }
      currentDownloadAbortRef.current = undefined;
      setDownloadProgress({
        currentFileIndex: fileIndex,
        fileCount: files.length,
        currentFile: file,
        currentFileProgress: 0,
        currentFileBytesReceived: 0,
        currentFileTotalBytes: 0,
        isCurrentFileComplete: false,
      });
      try {
        filePaths.push(await getFilePath(file));
        const fileSize = getFileSize(file);
        setDownloadProgress(
          (previousProgress) =>
            previousProgress && {
              ...previousProgress,
              currentFileProgress: FILE_COMPLETE_PROGRESS,
              currentFileBytesReceived: fileSize,
              currentFileTotalBytes: fileSize,
              isCurrentFileComplete: true,
            },
        );
      } catch (error) {
        if (isDownloadCancelledRef.current) {
          break;
        }
        const isNoSpaceError = error instanceof NotEnoughSpaceOnDeviceError;
        hasNoSpaceFailure = hasNoSpaceFailure || isNoSpaceError;
        if (!isNoSpaceError && !(error instanceof FileTooLargeToDownloadError)) {
          errorService.reportError(error);
        }
        failedFiles.push(file);
      }
    }
    currentDownloadAbortRef.current = undefined;

    return isDownloadCancelledRef.current ? null : { filePaths, failedFiles, hasNoSpaceFailure };
  };

  const downloadItems = (items: DriveListItem[]) =>
    runExclusively(async () => {
      const fetchedFiles = await fetchFiles(items, downloadAndSaveFile);
      if (!fetchedFiles) {
        return;
      }
      if (fetchedFiles.filePaths.length === 0) {
        showFailedFilesNotification(fetchedFiles);
        return;
      }
      if (Platform.OS === 'ios') {
        try {
          await fs.saveFilesToiOSFiles(fetchedFiles.filePaths);
        } catch (error) {
          if (isSavePickerCancelled(error)) {
            showFailedFilesNotification(fetchedFiles);
            onFinished();
            return;
          }
          errorService.reportError(error);
          notifications.error(strings.messages.filesCouldNotBeSaved);
          return;
        }
      }
      showDownloadResultNotification(fetchedFiles);
      onFinished();
    });

  const exportItems = (items: DriveListItem[]) =>
    runExclusively(async () => {
      const fetchedFiles = await fetchFiles(items, fetchFile);
      if (!fetchedFiles) {
        return;
      }
      if (fetchedFiles.filePaths.length === 0) {
        showFailedFilesNotification(fetchedFiles);
        return;
      }
      try {
        await fs.shareFiles(fetchedFiles.filePaths);
      } catch (error) {
        errorService.reportError(error);
        notifications.error(strings.messages.filesCouldNotBeShared);
        return;
      }
      showFailedFilesNotification(fetchedFiles);
      onFinished();
    });

  const cancelDownload = () => {
    isDownloadCancelledRef.current = true;
    currentDownloadAbortRef.current?.(DOWNLOAD_ABORT_REASON);
  };

  return { downloadProgress, isDownloading, downloadItems, exportItems, cancelDownload };
};
