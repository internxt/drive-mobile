import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';
import { FileTooLargeError, MissingFileUriError, UploadNetworkError } from '../errors';
import {
  ShareUploadCredentials,
  createShareUploadSession,
  isIosTotalSizeTooLargeForUpload,
  shareUploadFile,
} from '../services/shareUploadService';
import { SharedFile, UploadErrorType, UploadProgress, UploadStatus } from '../types';
import { getFileExtension, getFileNameWithoutExtension } from '../utils';

const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
} as const;

interface UseShareUploadResult {
  status: UploadStatus;
  errorType: UploadErrorType | null;
  progress: UploadProgress | null;
  thumbnailUri: string | null;
  uploadFiles: (
    files: SharedFile[],
    folderUuid: string,
    credentials: ShareUploadCredentials,
    renamedFileName?: string,
  ) => Promise<void>;
  reset: () => void;
}

const getHttpStatus = (error: unknown): number | undefined => {
  if (error !== null && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status;
  }
  return undefined;
};

const classifyError = (error: unknown): UploadErrorType => {
  const httpStatusCode = getHttpStatus(error);
  if (httpStatusCode === HTTP_STATUS.UNAUTHORIZED || httpStatusCode === HTTP_STATUS.FORBIDDEN) return 'session_expired';

  if (error instanceof FileTooLargeError) return 'file_too_large';
  if (error instanceof MissingFileUriError) return 'prep_failed';
  if (error instanceof UploadNetworkError) return 'no_internet';

  return 'general';
};

export const useShareUpload = (): UseShareUploadResult => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorType, setErrorType] = useState<UploadErrorType | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const thumbnailUriRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    if (thumbnailUriRef.current) {
      RNFS.unlink(thumbnailUriRef.current).catch(() => undefined);
      thumbnailUriRef.current = null;
    }
    setStatus('idle');
    setErrorType(null);
    setProgress(null);
    setThumbnailUri(null);
  }, []);

  const uploadFiles = useCallback(
    async (files: SharedFile[], folderUuid: string, credentials: ShareUploadCredentials, renamedFileName?: string) => {
      if (!files.length) return;

      setErrorType(null);

      try {
        if (Platform.OS === 'ios' && isIosTotalSizeTooLargeForUpload(files)) {
          throw new FileTooLargeError();
        }

        setStatus('uploading');
        setThumbnailUri(null);
        const isSingleFile = files.length === 1;
        const shareUploadSession = createShareUploadSession(credentials);

        for (let i = 0; i < files.length; i++) {
          const currentFileNumber = i + 1;
          const currentSharedFile = files[i];

          if (!currentSharedFile.uri) {
            throw new MissingFileUriError();
          }

          const resolvedSize = { current: currentSharedFile.size ?? 0 };

          const buildProgress = (bytesUploaded: number): UploadProgress => ({
            currentFile: currentFileNumber,
            totalFiles: files.length,
            bytesUploaded,
            currentFileSize: resolvedSize.current,
          });

          setProgress(buildProgress(0));

          const finalFileName = isSingleFile && renamedFileName ? renamedFileName : currentSharedFile.fileName;

          const result = await shareUploadFile({
            filePath: currentSharedFile.uri,
            fileName: getFileNameWithoutExtension(finalFileName),
            fileExtension: getFileExtension(finalFileName),
            fileSize: currentSharedFile.size,
            folderUuid,
            credentials,
            shareUploadSession,
            onFileResolved: (resolvedFileSize) => {
              resolvedSize.current = resolvedFileSize;
              setProgress(buildProgress(0));
            },
            onProgress: (bytesUploaded) => setProgress(buildProgress(bytesUploaded)),
          });

          if (isSingleFile) {
            thumbnailUriRef.current = result.thumbnailLocalUri;
            setThumbnailUri(result.thumbnailLocalUri);
          }
        }

        setStatus('success');
      } catch (error) {
        setErrorType(classifyError(error));
        setStatus('error');
      }
    },
    [],
  );

  return { status, errorType, progress, thumbnailUri, uploadFiles, reset };
};
