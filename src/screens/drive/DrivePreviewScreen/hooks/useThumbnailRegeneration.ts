import { logger } from '@internxt-mobile/services/common';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import errorService from '@internxt-mobile/services/ErrorService';
import { FileExtension, Thumbnail } from '@internxt-mobile/types/drive/file';
import { useEffect, useRef, useState } from 'react';

const IMAGE_PREVIEW_TYPES = new Set([FileExtension.PNG, FileExtension.JPG, FileExtension.JPEG, FileExtension.HEIC]);
const VIDEO_PREVIEW_TYPES = new Set([FileExtension.MP4, FileExtension.MOV, FileExtension.AVI]);
const PDF_PREVIEW_TYPES = new Set([FileExtension.PDF]);

interface ThumbnailRegenerationParams {
  downloadedFilePath?: string;
  fileExtension?: string;
  fileUuid?: string;
  hasThumbnails: boolean;
}

interface ThumbnailRegenerationCallbacks {
  onSuccess: (thumbnail: Thumbnail) => void;
}

export const canGenerateThumbnail = (fileExtension: string): boolean => {
  const extension = fileExtension.toLowerCase() as FileExtension;
  return IMAGE_PREVIEW_TYPES.has(extension) || VIDEO_PREVIEW_TYPES.has(extension) || PDF_PREVIEW_TYPES.has(extension);
};

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
