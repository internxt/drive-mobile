import { logger } from '@internxt-mobile/services/common';
import { isThumbnailSupported } from '@internxt-mobile/services/common/media/thumbnail.constants';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import errorService from '@internxt-mobile/services/ErrorService';
import { Thumbnail } from '@internxt-mobile/types/drive/file';
import { useEffect, useRef, useState } from 'react';

interface ThumbnailRegenerationParams {
  downloadedFilePath?: string;
  fileExtension?: string;
  fileUuid?: string;
  hasThumbnails: boolean;
}

interface ThumbnailRegenerationCallbacks {
  onSuccess: (thumbnail: Thumbnail) => void;
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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const regenerationAttempted = useRef(false);

  useEffect(() => {
    const { downloadedFilePath, fileExtension, fileUuid } = params;

    if (regenerationAttempted.current || isRegenerating) {
      return;
    }

    if (!shouldRegenerateThumbnail(params)) {
      return;
    }

    if (!fileUuid || !downloadedFilePath || !fileExtension) {
      return;
    }

    regenerationAttempted.current = true;
    setIsRegenerating(true);

    regenerateThumbnail(fileUuid, downloadedFilePath, fileExtension)
      .then((thumbnail) => {
        if (thumbnail) {
          callbacks.onSuccess(thumbnail);
        }
      })
      .finally(() => {
        setIsRegenerating(false);
      });
  }, [params.downloadedFilePath, params.hasThumbnails]);

  return { isRegenerating, regenerationAttempted: regenerationAttempted.current };
};
