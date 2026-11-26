import drive from '@internxt-mobile/services/drive';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import type { DrivePreviewSourceFolder } from '../../types/navigation';
import type { AppDispatch } from '../../store';
import { useAppDispatch } from '../../store/hooks';
import { driveActions, driveThunks } from '../../store/slices/drive';

/**
 * Cancels the previous download if it is still running, focuses the file, starts its download for the preview and
 * registers the download abort.
 * Returns the download promise, which can be aborted or awaited.
 */
export const startFilePreview = (dispatch: AppDispatch, driveFile: DriveItemData) => {
  const isPreviousDownloadRunning = dispatch((_, getState) => {
    const previousDownload = getState().drive.downloadingFile;
    return !!previousDownload && !previousDownload.downloadedFilePath && !previousDownload.error;
  });
  if (isPreviousDownloadRunning) {
    dispatch(driveThunks.cancelDownloadThunk());
  }

  dispatch(
    driveActions.setFocusedItem({
      ...driveFile,
      folderUuid: driveFile.folderUuid ?? undefined,
      bucket: driveFile.bucket ?? undefined,
    }),
  );

  const downloadPromise = dispatch(
    driveThunks.downloadFileThunk({
      uuid: driveFile.uuid,
      size: driveFile.size as number,
      bucketId: driveFile.bucket as string,
      folderUuid: driveFile.folderUuid ?? undefined,
      name: driveFile.name,
      type: driveFile.type as string,
      fileId: driveFile.fileId as string,
      updatedAt: new Date(driveFile.updatedAt).toISOString(),
      openFileViewer: false,
    }),
  );

  drive.events.setDownloadAbort(() => {
    downloadPromise.abort();
  });

  return downloadPromise;
};

/**
 * Returns a function that starts the preview of the file and opens the preview screen with the files to swipe
 * through. When the file is not in that list, the preview opens with that file alone.
 */
export const useOpenFilePreview = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  return useCallback(
    (
      driveFile: DriveItemData,
      previewFiles: DriveItemData[] = [driveFile],
      sourceFolder?: DrivePreviewSourceFolder,
    ) => {
      const openedFileIndex = previewFiles.findIndex((previewFile) => previewFile.uuid === driveFile.uuid);
      const isOpenedFileInList = openedFileIndex !== -1;
      const swipeableFiles = isOpenedFileInList ? previewFiles : [driveFile];
      const initialIndex = isOpenedFileInList ? openedFileIndex : 0;

      const downloadPromise = startFilePreview(dispatch, driveFile);
      navigation.navigate('DrivePreview', {
        files: swipeableFiles,
        initialIndex,
        sourceFolder: isOpenedFileInList ? sourceFolder : undefined,
      });
      return downloadPromise;
    },
    [dispatch, navigation],
  );
};
