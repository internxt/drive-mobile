import * as RNFS from '@dr.pogodin/react-native-fs';
import { useCallback, useRef, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import { HttpUploadError, MissingFileUriError, UploadNetworkError } from '../errors';
import { ShareUploadCredentials, createShareUploadSession, shareUploadFile } from '../services/shareUploadService';
import { CollisionState, NameCollisionAction, SharedFile, UploadErrorType, UploadProgress, UploadStatus } from '../types';
import { getFileExtension, getFileNameWithoutExtension } from '../utils';
import { useNameCollision } from './useNameCollision';

interface PHAssetExportNativeModule {
  exportAsset(localIdentifier: string): Promise<PHAssetExportResult>;
}

interface PHAssetExportResult {
  uri: string;
  size: number;
  fileName: string;
}

const PHAssetExport = NativeModules.PHAssetExport as PHAssetExportNativeModule;

const exportPhAsset = (phAssetId: string): Promise<PHAssetExportResult> => PHAssetExport.exportAsset(phAssetId);

const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
} as const;

interface UseShareUploadOptions {
  onFileUploaded?: (file: SharedFile) => void;
}

interface UseShareUploadResult {
  status: UploadStatus;
  errorType: UploadErrorType | null;
  uploadError: unknown;
  progress: UploadProgress | null;
  thumbnailUri: string | null;
  collisionState: CollisionState;
  uploadFiles: (
    files: SharedFile[],
    folderUuid: string,
    credentials: ShareUploadCredentials,
    renamedFileName?: string,
  ) => Promise<void>;
  handleCollisionAction: (action: NameCollisionAction | null) => void;
  reset: () => void;
}

interface FailedFile {
  index: number;
  errorType: UploadErrorType;
  uploadError: unknown;
}

const classifyError = (error: unknown): UploadErrorType => {
  if (error instanceof HttpUploadError) {
    if (error.status === HTTP_STATUS.UNAUTHORIZED || error.status === HTTP_STATUS.FORBIDDEN) return 'session_expired';
    if (error.status === HTTP_STATUS.CONFLICT) return 'file_already_exists';
  }
  if (error instanceof MissingFileUriError) return 'prep_failed';
  if (error instanceof UploadNetworkError) return 'no_internet';
  return 'general';
};

const buildProgressState =
  (updatedFields: Partial<UploadProgress>) =>
  (prev: UploadProgress | null): UploadProgress => {
    const prevState = prev ?? {};
    return { ...prevState, ...updatedFields } as UploadProgress;
  };

export const useShareUpload = ({ onFileUploaded }: UseShareUploadOptions = {}): UseShareUploadResult => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorType, setErrorType] = useState<UploadErrorType | null>(null);
  const [uploadError, setUploadError] = useState<unknown>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const thumbnailUriRef = useRef<string | null>(null);

  const { collisionState, handleCollisionAction, resetCollisionState, resolveCollisions } = useNameCollision();

  const reset = useCallback(() => {
    if (thumbnailUriRef.current) {
      RNFS.unlink(thumbnailUriRef.current).catch(() => undefined);
      thumbnailUriRef.current = null;
    }
    setStatus('idle');
    setErrorType(null);
    setUploadError(null);
    setProgress(null);
    setThumbnailUri(null);
    resetCollisionState();
  }, [resetCollisionState]);

  const uploadFiles = useCallback(
    async (files: SharedFile[], folderUuid: string, credentials: ShareUploadCredentials, renamedFileName?: string) => {
      if (!files.length) return;

      setErrorType(null);
      setUploadError(null);
      setStatus('checking');

      try {
        const isSingleFile = files.length === 1;
        const shareUploadSession = createShareUploadSession(credentials);

        const renameMap = await resolveCollisions(files, folderUuid, isSingleFile, renamedFileName);
        if (renameMap === null) {
          setStatus('idle');
          return;
        }

        setStatus('uploading');
        setThumbnailUri(null);

        const failedFiles: FailedFile[] = [];

        for (let i = 0; i < files.length; i++) {
          const currentFileNumber = i + 1;
          const currentSharedFile = files[i];

          try {
            if (!currentSharedFile.uri && !currentSharedFile.phAssetId) {
              throw new MissingFileUriError();
            }

            let fileToUpload = currentSharedFile;
            if (Platform.OS === 'ios' && currentSharedFile.phAssetId) {
              const exported = await exportPhAsset(currentSharedFile.phAssetId);
              fileToUpload = {
                ...currentSharedFile,
                uri: exported.uri,
                size: exported.size,
                fileName: exported.fileName,
              };
            }

            setProgress(
              buildProgressState({
                currentFile: currentFileNumber,
                totalFiles: files.length,
                bytesUploaded: 0,
                currentFileSize: fileToUpload.size ?? 0,
              }),
            );

            const baseFileName = isSingleFile && renamedFileName ? renamedFileName : (fileToUpload.fileName ?? '');
            const uploadPlainName = renameMap.has(i) ? renameMap.get(i)! : getFileNameWithoutExtension(baseFileName);
            const uploadExtension = getFileExtension(baseFileName);

            const result = await shareUploadFile({
              filePath: fileToUpload.uri,
              fileName: uploadPlainName,
              fileExtension: uploadExtension,
              fileSize: fileToUpload.size,
              folderUuid,
              credentials,
              shareUploadSession,
              onFileResolved: (resolvedFileSize) => {
                setProgress(buildProgressState({ currentFileSize: resolvedFileSize, bytesUploaded: 0 }));
              },
              onProgress: (bytesUploaded) => setProgress(buildProgressState({ bytesUploaded })),
            });

            if (isSingleFile) {
              thumbnailUriRef.current = result.thumbnailLocalUri;
              setThumbnailUri(result.thumbnailLocalUri);
            }

            try {
              onFileUploaded?.(currentSharedFile);
            } catch (error) {
              console.error('onFileUploaded callback threw an error: ', error);
            }
          } catch (error) {
            const uploadErrorType = classifyError(error);
            failedFiles.push({ index: i, errorType: uploadErrorType, uploadError: error });
            if (uploadErrorType === 'session_expired') break;
          }
        }

        if (failedFiles.length === 0) {
          setStatus('success');
        } else {
          const firstFailure = failedFiles[0];
          setErrorType(firstFailure.errorType);
          setUploadError(firstFailure.uploadError);
          setStatus('error');
        }
      } catch (error) {
        const uploadErrorType = classifyError(error);
        setErrorType(uploadErrorType);
        setUploadError(error);
        setStatus('error');
      }
    },
    [onFileUploaded, resolveCollisions],
  );

  return { status, errorType, uploadError, progress, thumbnailUri, collisionState, uploadFiles, handleCollisionAction, reset };
};
