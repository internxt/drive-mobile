import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import {
  ShareUploadCredentials,
  createShareUploadSession,
  isIosTotalSizeTooLargeForUpload,
  shareUploadFile,
} from '../services/shareUploadService';
import { SharedFile } from '../types';
import { getFileExtension, getFileNameWithoutExtension } from '../utils';

const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  PAYMENT_REQUIRED: 402,
  INSUFFICIENT_STORAGE: 507,
} as const;

class MissingFileUriError extends Error {
  constructor() {
    super('Shared file is missing a URI — cannot upload');
    this.name = 'MissingFileUriError';
  }
}

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';
export type UploadErrorType =
  | 'general'
  | 'no_internet'
  | 'no_space'
  | 'session_expired'
  | 'prep_failed'
  | 'file_too_large';

export interface UploadProgress {
  currentFile: number;
  totalFiles: number;
  bytesUploaded: number;
  currentFileSize: number;
}

interface UseShareUploadResult {
  status: UploadStatus;
  errorType: UploadErrorType | null;
  progress: UploadProgress | null;
  uploadFiles: (
    files: SharedFile[],
    folderUuid: string,
    credentials: ShareUploadCredentials,
    renamedFileName?: string,
  ) => Promise<void>;
  reset: () => void;
}

const classifyError = (error: unknown): UploadErrorType => {
  const errorMessageLowercase = error instanceof Error ? error.message.toLowerCase() : '';
  const isNetworkRelatedError =
    errorMessageLowercase.includes('network') ||
    errorMessageLowercase.includes('connection') ||
    errorMessageLowercase.includes('timeout');

  if (isNetworkRelatedError) {
    return 'no_internet';
  }

  const httpStatusCode =
    error && typeof error === 'object' && 'status' in error ? (error as { status: number }).status : undefined;

  if (httpStatusCode === HTTP_STATUS.UNAUTHORIZED || httpStatusCode === HTTP_STATUS.FORBIDDEN) return 'session_expired';
  if (httpStatusCode === HTTP_STATUS.PAYMENT_REQUIRED || httpStatusCode === HTTP_STATUS.INSUFFICIENT_STORAGE)
    return 'no_space';
  if (error instanceof MissingFileUriError) return 'prep_failed';

  return 'general';
};

export const useShareUpload = (): UseShareUploadResult => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorType, setErrorType] = useState<UploadErrorType | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorType(null);
    setProgress(null);
  }, []);

  const uploadFiles = useCallback(
    async (files: SharedFile[], folderUuid: string, credentials: ShareUploadCredentials, renamedFileName?: string) => {
      if (!files.length) return;

      if (Platform.OS === 'ios' && isIosTotalSizeTooLargeForUpload(files)) {
        setErrorType('file_too_large');
        setStatus('error');
        return;
      }

      setStatus('uploading');
      setErrorType(null);
      const shareUploadSession = createShareUploadSession(credentials);

      try {
        for (let i = 0; i < files.length; i++) {
          const currentFileNumber = i + 1;
          const currentSharedFile = files[i];
          const sharedFileUri = currentSharedFile.uri;
          if (!sharedFileUri) {
            throw new MissingFileUriError();
          }

          let currentFileByteSize = currentSharedFile.size ?? 0;
          setProgress({
            currentFile: currentFileNumber,
            totalFiles: files.length,
            bytesUploaded: 0,
            currentFileSize: currentFileByteSize,
          });

          const rawName = files.length === 1 && renamedFileName ? renamedFileName : currentSharedFile.fileName;
          const fileExtension = getFileExtension(rawName);
          const fileNameWithoutExtension = getFileNameWithoutExtension(rawName);

          await shareUploadFile({
            filePath: sharedFileUri,
            fileName: fileNameWithoutExtension,
            fileExtension,
            fileSize: currentSharedFile.size,
            folderUuid,
            credentials,
            shareUploadSession,
            onFileResolved: (resolvedSize) => {
              currentFileByteSize = resolvedSize;
              setProgress({
                currentFile: currentFileNumber,
                totalFiles: files.length,
                bytesUploaded: 0,
                currentFileSize: currentFileByteSize,
              });
            },
            onProgress: (bytesUploaded) =>
              setProgress({
                currentFile: currentFileNumber,
                totalFiles: files.length,
                bytesUploaded,
                currentFileSize: currentFileByteSize,
              }),
          });
        }

        setStatus('success');
      } catch (error) {
        const classifiedErrorType = classifyError(error);
        setErrorType(classifiedErrorType);
        setStatus('error');
      }
    },
    [],
  );

  return { status, errorType, progress, uploadFiles, reset };
};
