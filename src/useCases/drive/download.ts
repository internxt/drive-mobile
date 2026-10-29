import AuthService from '@internxt-mobile/services/AuthService';
import { NotEnoughSpaceOnDeviceError } from '@internxt-mobile/services/common/filesystem/errors';
import drive from '@internxt-mobile/services/drive';
import { MAX_SIZE_TO_DOWNLOAD } from '@internxt-mobile/services/drive/constants';
import errorService from '@internxt-mobile/services/ErrorService';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { DriveItemData, FocusedItem } from '@internxt-mobile/types/drive/item';
import { Abortable } from '@internxt-mobile/types/index';
import { getFileSize, isEmptyFile } from '../../helpers/driveItems';

type DownloadableFile = DriveItemData | NonNullable<FocusedItem>;

export const isFileTooLargeToDownload = (file: DownloadableFile) => getFileSize(file) > MAX_SIZE_TO_DOWNLOAD['10GB'];

const checkDeviceHasSpaceForFile = async (fileSize: number) => {
  try {
    return await fileSystemService.checkAvailableStorage(fileSize);
  } catch (error) {
    errorService.reportError(error);
    return true;
  }
};

/**
 * Returns the path of the decrypted file on the device, downloading it when it is not there yet.
 * `onDownloadStarted` runs only before a network download.
 * Throws `NotEnoughSpaceOnDeviceError` when the device has no room for it.
 */
export const downloadFileToDevice = async ({
  file,
  onDownloadStarted,
  onProgress,
  onAbortableReady,
}: {
  file: DownloadableFile;
  onDownloadStarted?: () => void;
  onProgress?: (progress: number, bytesReceived: number, totalBytes: number) => void;
  onAbortableReady?: (abortable: Abortable) => void;
}): Promise<string> => {
  const decryptedFilePath = drive.file.getDecryptedFilePath(file.name, file.type);
  const isAlreadyDecrypted = await drive.file.existsDecrypted(file.name, file.type);
  if (isAlreadyDecrypted) {
    return decryptedFilePath;
  }

  if (isEmptyFile(file)) {
    await drive.file.createEmptyDownloadedFile(decryptedFilePath);
    return decryptedFilePath;
  }

  if (!file.fileId || !file.bucket) {
    throw new Error('Item fileID or bucket not found for non-empty file');
  }

  const fileSize = getFileSize(file);
  const hasEnoughSpace = await checkDeviceHasSpaceForFile(fileSize);
  if (!hasEnoughSpace) {
    throw new NotEnoughSpaceOnDeviceError('Not enough space on the device for the download');
  }

  onDownloadStarted?.();
  const { credentials } = await AuthService.getAuthCredentials();
  const { downloadPath } = await drive.file.downloadFile(
    credentials.user,
    file.bucket,
    file.fileId,
    { downloadPath: decryptedFilePath, downloadProgressCallback: onProgress, onAbortableReady },
    fileSize,
  );
  return downloadPath;
};
