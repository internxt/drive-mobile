import drive from '@internxt-mobile/services/drive';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import type { AppDispatch } from '../../store';
import { useAppDispatch } from '../../store/hooks';
import { driveActions, driveThunks } from '../../store/slices/drive';

/**
 * Focuses the file, starts its download for the preview and registers the download abort.
 * Returns the download promise, which can be aborted or awaited.
 */
export const startFilePreview = (dispatch: AppDispatch, driveFile: DriveItemData) => {
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

export const useOpenFilePreview = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  return useCallback(
    (driveFile: DriveItemData) => {
      const downloadPromise = startFilePreview(dispatch, driveFile);
      navigation.navigate('DrivePreview');
      return downloadPromise;
    },
    [dispatch, navigation],
  );
};
