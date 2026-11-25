import { logger } from '@internxt-mobile/services/common';
import { isThumbnailSupported } from '@internxt-mobile/services/common/media/thumbnail.constants';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import errorService from '@internxt-mobile/services/ErrorService';
import { Thumbnail } from '@internxt-mobile/types/drive/file';
import { useEffect, useRef } from 'react';

interface ThumbnailRegenerationParams {
  downloadedFilePath?: string;
  fileExtension?: string;
  fileUuid?: string;
  hasThumbnails: boolean;
}

interface ThumbnailRegenerationCallbacks {
  onSuccess: (thumbnail: Thumbnail, fileUuid: string) => void;
}

export const canGenerateThumbnail = isThumbnailSupported;

export const shouldRegenerateThumbnail = (params: ThumbnailRegenerationParams): boolean => {
  const { downloadedFilePath, fileExtension, hasThumbnails } = params;

  if (!downloadedFilePath || hasThumbnails || !fileExtension) {
    return false;
  }

  return canGenerateThumbnail(fileExtension);
};

export const regenerateThumbnail = async (
  fileUuid: string,
  downloadedFilePath: string,
  fileExtension: string,
): Promise<Thumbnail | null> => {
  try {
    const thumbnail = await driveFileService.regenerateThumbnail(
      fileUuid,
      downloadedFilePath,
      fileExtension.toLowerCase(),
    );
    logger.info('Thumbnail regenerated successfully', { thumbnail });
    return thumbnail;
  } catch (error) {
    logger.info('Thumbnail regeneration error', { error });
    errorService.reportError(error);
    return null;
  }
};

export const useThumbnailRegeneration = (
  params: ThumbnailRegenerationParams,
  callbacks: ThumbnailRegenerationCallbacks,
) => {
  const attemptedFileUuids = useRef(new Set<string>());

  useEffect(() => {
    const { downloadedFilePath, fileExtension, fileUuid } = params;

    if (!fileUuid || attemptedFileUuids.current.has(fileUuid)) {
      return;
    }

    if (!shouldRegenerateThumbnail(params)) {
      return;
    }

    if (!downloadedFilePath || !fileExtension) {
      return;
    }

    attemptedFileUuids.current.add(fileUuid);

    regenerateThumbnail(fileUuid, downloadedFilePath, fileExtension).then((thumbnail) => {
      if (thumbnail) {
        callbacks.onSuccess(thumbnail, fileUuid);
      }
    });
  }, [params.fileUuid, params.downloadedFilePath, params.hasThumbnails]);
};
