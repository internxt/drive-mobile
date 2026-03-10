import { StorageAccessFramework } from 'expo-file-system/legacy';
import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import uuid from 'react-native-uuid';

import { useDrive } from '@internxt-mobile/hooks/drive';
import { logger } from '@internxt-mobile/services/common';
import errorService from '@internxt-mobile/services/ErrorService';
import { DriveFileData } from '@internxt-mobile/types/drive/file';
import strings from '../../../../../assets/lang/strings';
import analytics, { DriveAnalyticsEvent } from '../../../../services/AnalyticsService';
import { driveFolderService } from '../../../../services/drive/folder/driveFolder.service';
import {
  createFolderWithMerge,
  getMaxDepth,
  uploadFolderContents,
} from '../../../../services/drive/folder/folderOrchestration.service';
import { FolderTooLargeError, folderTraversalService } from '../../../../services/drive/folder/folderTraversal.service';
import { folderUploadService } from '../../../../services/drive/folder/folderUpload.service';
import { folderUploadCancellationService } from '../../../../services/drive/folder/folderUploadCancellation.service';
import { getUniqueFolderName } from '../../../../services/drive/folder/utils/getUniqueFolderName';
import { driveTrashService } from '../../../../services/drive/trash/driveTrash.service';
import fileSystemService from '../../../../services/FileSystemService';
import notificationsService from '../../../../services/NotificationsService';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { driveActions, driveThunks } from '../../../../store/slices/drive';
import { uiActions } from '../../../../store/slices/ui';
import { NotificationType, ProgressCallback } from '../../../../types';
import { FolderTreeNode } from '../../../../types/drive/folderUpload';
import { NameCollisionAction } from '../../NameCollisionModal';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noopProgress: ProgressCallback = () => {};

const showFolderUploadResult = (
  result: { cancelled: boolean; failedFiles: number; uploadedFiles: number; totalFiles: number },
  folderName: string,
) => {
  if (result.cancelled) {
    notificationsService.show({ type: NotificationType.Info, text1: strings.messages.folderUploadCancelled });
  } else if (result.failedFiles === 0) {
    notificationsService.show({
      type: NotificationType.Success,
      text1: strings.formatString(strings.messages.folderUploadCompleted, result.uploadedFiles, folderName) as string,
    });
  } else {
    notificationsService.show({
      type: NotificationType.Warning,
      text1: strings.formatString(
        strings.messages.folderUploadPartial,
        result.uploadedFiles,
        result.totalFiles,
        result.failedFiles,
      ) as string,
    });
  }
};

const getFileExtensionAndPlainName = (name: string): { extension: string; plainName: string } => {
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0) return { extension: '', plainName: name };
  return { extension: name.slice(lastDot + 1).toLowerCase(), plainName: name.slice(0, lastDot) };
};

type UploadFileEntryFn = (
  filePath: string,
  fileName: string,
  fileExtension: string,
  currentFolderId: string,
  progressCallback: ProgressCallback,
  modificationTime?: string,
  creationTime?: string,
) => Promise<DriveFileData>;

export interface FolderUploadCollisionModalState {
  isOpen: boolean;
  folderName: string;
  onConfirm: (action: NameCollisionAction) => void;
  onClose: () => void;
}

export const useFolderUpload = ({ uploadAndCreateFileEntry }: { uploadAndCreateFileEntry: UploadFileEntryFn }) => {
  const dispatch = useAppDispatch();
  const { focusedFolder, loadFolderContent } = useDrive();
  const folderUploads = useAppSelector((state) => state.drive.folderUploads);

  const collisionResolverRef = useRef<((action: NameCollisionAction | null) => void) | null>(null);
  const [collisionState, setCollisionState] = useState<{
    isOpen: boolean;
    folderName: string;
    existingFolderUuid: string;
    existingFolderId: number;
  }>({ isOpen: false, folderName: '', existingFolderUuid: '', existingFolderId: 0 });

  const waitForCollisionResolution = (
    folderName: string,
    existingFolderUuid: string,
    existingFolderId: number,
  ): Promise<NameCollisionAction | null> => {
    return new Promise((resolve) => {
      collisionResolverRef.current = resolve;
      setCollisionState({ isOpen: true, folderName, existingFolderUuid, existingFolderId });
    });
  };

  const closedCollisionState = { isOpen: false, folderName: '', existingFolderUuid: '', existingFolderId: 0 };

  const handleCollisionConfirm = (action: NameCollisionAction) => {
    setCollisionState(closedCollisionState);
    collisionResolverRef.current?.(action);
  };

  const handleCollisionClose = () => {
    setCollisionState(closedCollisionState);
    collisionResolverRef.current?.(null);
  };

  const handleUploadFolder = async () => {
    dispatch(uiActions.setShowUploadFileModal(false));

    const uploadFolderFileIOS = async (fileNode: FolderTreeNode, parentUuid: string): Promise<void> => {
      const filePath = fileNode.uri.replace('file://', '');
      const { extension, plainName } = getFileExtensionAndPlainName(fileNode.name);
      await uploadAndCreateFileEntry(filePath, plainName, extension, parentUuid, noopProgress);
    };

    const uploadFolderFileAndroid = async (
      fileNode: FolderTreeNode,
      parentUuid: string,
      signal: AbortSignal,
      uploadId: string,
    ): Promise<void> => {
      const { extension, plainName } = getFileExtensionAndPlainName(fileNode.name);
      // Prefix with uploadId to isolate temp files across concurrent uploads
      const tempPath = fileSystemService.tmpFilePath(`${uploadId}_${fileNode.name}`);
      const tempUri = fileSystemService.pathToUri(tempPath);
      try {
        await StorageAccessFramework.copyAsync({ from: fileNode.uri, to: tempUri });
        if (signal.aborted) return;
        await uploadAndCreateFileEntry(tempPath, plainName, extension, parentUuid, noopProgress);
      } finally {
        await fileSystemService.unlinkIfExists(tempPath).catch((e) => {
          logger.warn('[useFolderUpload] Failed to unlink temp file: ' + (e as Error).message);
        });
      }
    };

    const uploadId = uuid.v4().toString();

    try {
      // 1. Pick folder
      const picked = await folderUploadService.pickFolder();
      if (!picked) return;
      logger.info(`[useFolderUpload][${uploadId}] Folder: "${picked.name}" (${picked.uri})`);

      // 2. Traverse
      const tree = await folderTraversalService.traverseFolder(picked.uri);
      logger.info(`[useFolderUpload][${uploadId}] Tree: ${tree.files.length} files, ${tree.dirs.length} dirs`);

      // 3. Storage quota check
      const totalSize = tree.files.reduce((sum, file) => sum + file.size, 0);
      const hasStorage = await fileSystemService.checkAvailableStorage(totalSize).catch(() => true);
      if (!hasStorage) {
        dispatch(uiActions.setShowRunOutSpaceModal(true));
        return;
      }

      if (!focusedFolder?.uuid) {
        throw new Error('No focused folder UUID');
      }

      // Name collision check
      const { existentFolders } = await driveFolderService.checkDuplicatedFolders(focusedFolder.uuid, [picked.name]);
      if (existentFolders.length > 0) {
        const existing = existentFolders[0];
        const action = await waitForCollisionResolution(picked.name, existing.uuid, existing.id);
        if (action === null) return;
        if (action === 'replace') {
          await driveTrashService.moveToTrash([{ uuid: existing.uuid, id: existing.id, type: 'folder' }]);
        } else {
          picked.name = await getUniqueFolderName(picked.name, focusedFolder.uuid);
        }
      }

      // 4. Create the root folder (merge if already exists)
      const rootFolderUuid = await createFolderWithMerge(focusedFolder.uuid, picked.name);
      logger.info(`[useFolderUpload][${uploadId}] Root folder "${picked.name}" - ${rootFolderUuid}`);

      // 5. Initialize progress state + AbortController
      const startedAt = Date.now();
      dispatch(
        driveActions.addFolderUpload({
          uploadId,
          folderName: picked.name,
          totalFiles: tree.files.length,
          uploadedFiles: 0,
          failedFiles: 0,
          status: 'uploading',
          startedAt,
        }),
      );
      const abortController = new AbortController();
      folderUploadCancellationService.register(uploadId, abortController);

      // 6. Log upload start
      analytics.track(DriveAnalyticsEvent.FolderUploadStarted, {
        fileCount: tree.files.length,
        folderDepth: getMaxDepth(tree.dirs),
        totalSizeBytes: totalSize,
        platform: Platform.OS,
        concurrentUploads: Object.keys(folderUploads).length + 1,
      });

      // 7. Run orchestration — throttle progress dispatches to max 1 per 300ms
      let lastDispatchDate = 0;
      const MIN_PROGRESS_DISPATCH_INTERVAL = 300;
      const result = await uploadFolderContents({
        tree,
        rootParentUuid: rootFolderUuid,
        signal: abortController.signal,
        onProgress: (uploaded, failed) => {
          const now = Date.now();
          const differenceBetweenLastDispatch = now - lastDispatchDate;
          const shouldDispatchProgress = differenceBetweenLastDispatch >= MIN_PROGRESS_DISPATCH_INTERVAL;
          if (shouldDispatchProgress) {
            lastDispatchDate = now;
            dispatch(driveActions.updateFolderUpload({ uploadId, uploadedFiles: uploaded, failedFiles: failed }));
          }
        },
        uploadFile: async (fileNode, parentUuid, signal) => {
          if (Platform.OS === 'android' && fileNode.uri.startsWith('content://')) {
            await uploadFolderFileAndroid(fileNode, parentUuid, signal, uploadId);
          } else {
            await uploadFolderFileIOS(fileNode, parentUuid);
          }
        },
      });

      logger.info(
        `[useFolderUpload][${uploadId}] Folder upload done: ${result.uploadedFiles}/${result.totalFiles}, failed=${result.failedFiles}, cancelled=${result.cancelled}`,
      );

      // 8. Log upload completed
      analytics.track(DriveAnalyticsEvent.FolderUploadCompleted, {
        durationMs: Date.now() - startedAt,
        uploadedFiles: result.uploadedFiles,
        failedFiles: result.failedFiles,
        totalFiles: result.totalFiles,
        cancelled: result.cancelled,
        successRate: result.totalFiles > 0 ? result.uploadedFiles / result.totalFiles : 1,
      });

      // 9. Display result
      showFolderUploadResult(result, picked.name);
    } catch (err) {
      const error = err as Error;
      if (!(err instanceof FolderTooLargeError)) {
        errorService.reportError(error);
        analytics.track(DriveAnalyticsEvent.FolderUploadError, {
          errorType: error.name,
          errorMessage: error.message,
        });
        const castedError = errorService.castError(error, 'upload');
        notificationsService.show({ type: NotificationType.Error, text1: castedError.message });
      }
    } finally {
      folderUploadCancellationService.clear(uploadId);
      dispatch(driveActions.removeFolderUpload(uploadId));
      dispatch(driveThunks.loadUsageThunk());
      if (focusedFolder?.uuid) {
        loadFolderContent(focusedFolder.uuid, { pullFrom: ['network'], resetPagination: true });
      }
    }
  };

  const nameCollisionModal: FolderUploadCollisionModalState = {
    isOpen: collisionState.isOpen,
    folderName: collisionState.folderName,
    onConfirm: handleCollisionConfirm,
    onClose: handleCollisionClose,
  };

  return { handleUploadFolder, nameCollisionModal };
};
