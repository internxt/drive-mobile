import { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { driveActions, driveThunks } from '../store/slices/drive';
import { uiActions } from '../store/slices/ui';
import { DriveItemDataProps, DriveItemStatus } from '../types/drive';
import analytics, { AnalyticsEventKey } from '../services/analytics';
import driveEventEmitter from '../services/DriveEventEmitter';

interface UseDriveItemProps {
  data: DriveItemDataProps;
  status: DriveItemStatus;
}

const useDriveItem = (props: UseDriveItemProps) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [isDisabled, setIsDisabled] = useState(false);
  const isFolder = !props.data.type;
  const isIdle = props.status === DriveItemStatus.Idle;
  const isUploading = props.status === DriveItemStatus.Uploading;
  const isDownloading = props.status === DriveItemStatus.Downloading;
  function trackFolderOpened() {
    return analytics.track(AnalyticsEventKey.FolderOpened, {
      folder_id: props.data.id,
      email: user?.email || null,
      userId: user?.uuid || null,
    });
  }
  function onFolderPressed() {
    trackFolderOpened();
    dispatch(driveThunks.getFolderContentThunk({ folderId: props.data.id }));
    dispatch(driveActions.addDepthAbsolutePath([props.data.name]));
  }
  const onFilePressed = () => {
    if (!isIdle) {
      return;
    }

    if (!props.data.fileId) {
      return;
    }

    setIsDisabled(true);

    const thunk = dispatch(
      driveThunks.downloadFileThunk({
        ...props.data,
        size: props.data.size as number,
        parentId: props.data.parentId as number,
        name: props.data.name,
        type: props.data.type as string,
        fileId: props.data.fileId as string,
      }),
    );
    const downloadAbort = () => {
      thunk.abort();
    };

    driveEventEmitter.setDownloadAbort(downloadAbort);

    thunk.then(() => {
      setIsDisabled(false);

      dispatch(driveActions.downloadSelectedFileStart());
    });
  };
  const onItemPressed = () => {
    if (isDisabled) {
      return;
    }

    isFolder ? onFolderPressed() : onFilePressed();
  };
  const onItemLongPressed = () => {
    dispatch(driveActions.focusItem(props.data));
    dispatch(uiActions.setShowItemModal(true));
  };
  const onActionsButtonPressed = () => {
    dispatch(driveActions.focusItem(props.data));
    dispatch(uiActions.setShowItemModal(true));
  };

  return {
    isFolder,
    isIdle,
    isUploading,
    isDownloading,
    onItemPressed,
    onItemLongPressed,
    onActionsButtonPressed,
  };
};

export default useDriveItem;
