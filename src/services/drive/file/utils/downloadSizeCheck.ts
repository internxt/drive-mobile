import { logger } from '@internxt-mobile/services/common';
import prettysize from 'prettysize';

import strings from '../../../../../assets/lang/strings';
import { NotificationType } from '../../../../types';
import errorService from '../../../ErrorService';
import fileSystemService from '../../../FileSystemService';
import notificationsService from '../../../NotificationsService';
import { LARGE_DOWNLOAD_WARNING_BYTES } from '../../constants';

const DOWNLOAD_DISK_SPACE_MULTIPLIER = 2;
const DOWNLOAD_SIZE_NOTICE_VISIBILITY_MS = 10000;

export type DownloadSizeCheck = 'allowed' | 'large' | 'notEnoughSpace';

/**
 * Resolves whether the device has free space for `DOWNLOAD_DISK_SPACE_MULTIPLIER` times the file size, plus the
 * buffer of `checkAvailableStorage`. When the free space cannot be read, reports the error and resolves true.
 */
export const hasDeviceSpaceForDownload = async (fileSize: number): Promise<boolean> => {
  try {
    return await fileSystemService.checkAvailableStorage(fileSize * DOWNLOAD_DISK_SPACE_MULTIPLIER);
  } catch (error) {
    errorService.reportError(error);
    return true;
  }
};

export const isLargeDownload = (fileSize: number): boolean => fileSize > LARGE_DOWNLOAD_WARNING_BYTES;

/**
 * Classifies a file for download by its size and the free space on the device. When the free space
 * cannot be read, the file counts as fitting.
 */
export const checkDownloadSize = async (fileSize: number): Promise<DownloadSizeCheck> => {
  const hasDeviceSpace = await hasDeviceSpaceForDownload(fileSize);
  if (!hasDeviceSpace) {
    return 'notEnoughSpace';
  }

  if (isLargeDownload(fileSize)) {
    return 'large';
  }

  return 'allowed';
};

export const isDownloadBlocked = (downloadSizeCheck: DownloadSizeCheck): boolean =>
  downloadSizeCheck === 'notEnoughSpace';

export const getDownloadSizeMessage = (downloadSizeCheck: DownloadSizeCheck): string | undefined => {
  switch (downloadSizeCheck) {
    case 'notEnoughSpace':
      return strings.errors.notEnoughSpaceOnDevice;
    case 'large':
      return strings.formatString(
        strings.messages.largeDownloadWarning,
        prettysize(LARGE_DOWNLOAD_WARNING_BYTES),
      ) as string;
    case 'allowed':
      return undefined;
  }
};

/**
 * Shows the notice for a checked file, if it has one, and logs the downloads that are blocked.
 */
export const notifyDownloadSizeCheck = (downloadSizeCheck: DownloadSizeCheck, fileSize: number): void => {
  if (isDownloadBlocked(downloadSizeCheck)) {
    logger.warn(`Download blocked: ${downloadSizeCheck}, file size ${fileSize} bytes`);
  }

  const downloadSizeMessage = getDownloadSizeMessage(downloadSizeCheck);
  if (!downloadSizeMessage) {
    return;
  }

  notificationsService.show({
    text1: downloadSizeMessage,
    type: downloadSizeCheck === 'notEnoughSpace' ? NotificationType.Error : NotificationType.Warning,
    visibilityTime: DOWNLOAD_SIZE_NOTICE_VISIBILITY_MS,
  });
};
