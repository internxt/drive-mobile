import { logger } from '@internxt-mobile/services/common';
import prettysize from 'prettysize';

import strings from '../../../../../assets/lang/strings';
import { NotificationType } from '../../../../types';
import fileSystemService from '../../../FileSystemService';
import notificationsService from '../../../NotificationsService';
import { LARGE_DOWNLOAD_WARNING_BYTES, MAX_SIZE_TO_DOWNLOAD } from '../../constants';

const DOWNLOAD_DISK_SPACE_MULTIPLIER = 2;
const DOWNLOAD_SIZE_NOTICE_VISIBILITY_MS = 10000;

export type DownloadSizeCheck = 'allowed' | 'large' | 'tooLarge' | 'notEnoughSpace';

const hasDeviceSpaceForDownload = (fileSize: number): Promise<boolean> =>
  fileSystemService.checkAvailableStorage(fileSize * DOWNLOAD_DISK_SPACE_MULTIPLIER).catch(() => true);

/**
 * Classifies a file for download by its size and the free space on the device. When the free space
 * cannot be read, the file counts as fitting.
 */
export const checkDownloadSize = async (fileSize: number): Promise<DownloadSizeCheck> => {
  if (fileSize > MAX_SIZE_TO_DOWNLOAD['10GB']) {
    return 'tooLarge';
  }

  const hasDeviceSpace = await hasDeviceSpaceForDownload(fileSize);
  if (!hasDeviceSpace) {
    return 'notEnoughSpace';
  }

  if (fileSize > LARGE_DOWNLOAD_WARNING_BYTES) {
    return 'large';
  }

  return 'allowed';
};

export const isDownloadBlocked = (downloadSizeCheck: DownloadSizeCheck): boolean =>
  downloadSizeCheck === 'tooLarge' || downloadSizeCheck === 'notEnoughSpace';

export const getDownloadSizeMessage = (downloadSizeCheck: DownloadSizeCheck): string | undefined => {
  switch (downloadSizeCheck) {
    case 'tooLarge':
      return strings.formatString(strings.messages.downloadLimit, prettysize(MAX_SIZE_TO_DOWNLOAD['10GB'])) as string;
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
