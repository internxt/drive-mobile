import * as RNFS from '@dr.pogodin/react-native-fs';
import { useCallback, useRef, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import { EmptyFileNotAllowedError, HttpUploadError, MissingFileUriError, UploadNetworkError } from '../errors';
import {
  ShareUploadCredentials,
  ShareUploadSession,
  createShareUploadSession,
  shareUploadFile,
} from '../services/shareUploadService';
import {
  CollisionState,
  NameCollisionAction,
  SharedFile,
  UploadErrorType,
  UploadProgress,
  UploadStatus,
} from '../types';
import { getFileExtension, getFileNameWithoutExtension, toDisplayUri } from '../utils';
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
  PAYMENT_REQUIRED: 402,
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
  uploadedCount: number;
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
  if (error instanceof EmptyFileNotAllowedError) return 'payment_required';
  if (error instanceof HttpUploadError) {
    if (error.status === HTTP_STATUS.UNAUTHORIZED || error.status === HTTP_STATUS.FORBIDDEN) return 'session_expired';
    if (error.status === HTTP_STATUS.CONFLICT) return 'file_already_exists';
    if (error.status === HTTP_STATUS.PAYMENT_REQUIRED) return 'payment_required';
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

interface ProcessFileParams {
  index: number;
  filesTotal: number;
  isSingleFile: boolean;
  renamedFileName: string | undefined;
  renameMap: Map<number, string>;
  folderUuid: string;
  credentials: ShareUploadCredentials;
  shareUploadSession: ShareUploadSession;
}

interface ProcessFileCallbacks {
  onProgress: (fields: Partial<UploadProgress>) => void;
  onFileUploaded?: (file: SharedFile) => void;
}

const prepareSharedFileToUpload = async (file: SharedFile): Promise<SharedFile> => {
  if (!file.uri && !file.phAssetId) throw new MissingFileUriError();
  if (Platform.OS === 'ios' && file.phAssetId) {
    const exported = await exportPhAsset(file.phAssetId);
    return { ...file, uri: exported.uri, size: exported.size, fileName: exported.fileName };
  }
  return file;
};

const uploadFile = async (
  sharedFile: SharedFile,
  {
    index,
    filesTotal,
    isSingleFile,
    renamedFileName,
    renameMap,
    folderUuid,
    credentials,
    shareUploadSession,
  }: ProcessFileParams,
  { onProgress, onFileUploaded }: ProcessFileCallbacks,
): Promise<string | null> => {
  const fileToUpload = await prepareSharedFileToUpload(sharedFile);

  onProgress({
    currentFile: index + 1,
    totalFiles: filesTotal,
    bytesUploaded: 0,
    currentFileSize: fileToUpload.size ?? 0,
  });

  const baseFileName = isSingleFile && renamedFileName ? renamedFileName : (fileToUpload.fileName ?? '');
  const uploadPlainName = renameMap.get(index) ?? getFileNameWithoutExtension(baseFileName);

  const result = await shareUploadFile({
    filePath: fileToUpload.uri,
    fileName: uploadPlainName,
    fileExtension: getFileExtension(baseFileName),
    fileSize: fileToUpload.size,
    folderUuid,
    credentials,
    shareUploadSession,
    onFileResolved: (resolvedFileSize) => onProgress({ currentFileSize: resolvedFileSize, bytesUploaded: 0 }),
    onProgress: (bytesUploaded) => onProgress({ bytesUploaded }),
  });

  try {
    onFileUploaded?.(sharedFile);
  } catch (error) {
    console.error('onFileUploaded callback threw an error: ', error);
  }

  return isSingleFile ? result.thumbnailLocalUri : null;
};

export const useShareUpload = ({ onFileUploaded }: UseShareUploadOptions = {}): UseShareUploadResult => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorType, setErrorType] = useState<UploadErrorType | null>(null);
  const [uploadError, setUploadError] = useState<unknown>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
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
    setUploadedCount(0);
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
        let actualUploadedCount = 0;
        let skippedPaymentRequired = 0;

        for (let i = 0; i < files.length; i++) {
          try {
            const thumbnailLocalUri = await uploadFile(
              files[i],
              {
                index: i,
                filesTotal: files.length,
                isSingleFile,
                renamedFileName,
                renameMap,
                folderUuid,
                credentials,
                shareUploadSession,
              },
              {
                onProgress: (fields: Partial<UploadProgress>) => setProgress(buildProgressState(fields)),
                onFileUploaded,
              },
            );
            actualUploadedCount++;
            if (isSingleFile) {
              thumbnailUriRef.current = thumbnailLocalUri;
              setThumbnailUri(thumbnailLocalUri ? toDisplayUri(thumbnailLocalUri) : null);
            }
          } catch (error) {
            const uploadErrorType = classifyError(error);
            const isPaymentRequiredFeature = uploadErrorType === 'payment_required';
            const isMultiupload = files.length > 1;
            if (isPaymentRequiredFeature && isMultiupload) {
              skippedPaymentRequired++;
              continue;
            }
            failedFiles.push({ index: i, errorType: uploadErrorType, uploadError: error });
            if (uploadErrorType === 'session_expired') break;
          }
        }

        setUploadedCount(actualUploadedCount);

        if (failedFiles.length === 0) {
          if (actualUploadedCount === 0 && skippedPaymentRequired > 0) {
            // All files were empty — treat as payment_required error
            setErrorType('payment_required');
            setUploadError(new EmptyFileNotAllowedError());
            setStatus('error');
          } else {
            setStatus('success');
          }
        } else {
          const { errorType: firstErrorType, uploadError: firstUploadError } = failedFiles[0];
          setErrorType(firstErrorType);
          setUploadError(firstUploadError);
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

  return {
    status,
    errorType,
    uploadError,
    progress,
    thumbnailUri,
    uploadedCount,
    collisionState,
    uploadFiles,
    handleCollisionAction,
    reset,
  };
};
