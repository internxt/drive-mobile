import { useState } from 'react';

import { useAppDispatch } from '../store/hooks';
import { driveActions, driveThunks } from '../store/slices/drive';
import { uiActions } from '../store/slices/ui';
import { DriveItemDataProps, DriveItemStatus } from '../types/drive';
import drive from '@internxt-mobile/services/drive';

interface UseDriveItemProps {
  data: DriveItemDataProps;
  status: DriveItemStatus;
}

const useDriveItem = (props: UseDriveItemProps) => {
  const dispatch = useAppDispatch();
  const [isDisabled, setIsDisabled] = useState(false);
  const isFolder = !props.data.type;
  const isIdle = props.status === DriveItemStatus.Idle;
  const isUploading = props.status === DriveItemStatus.Uploading;
  const isDownloading = props.status === DriveItemStatus.Downloading;
  const onFolderPressed = () => {
    dispatch(
      driveThunks.navigateToFolderThunk({ ...props.data, parentId: props.data.parentId as number, item: props.data }),
    );
  };
  const onFilePressed = () => {
    if (!isIdle) {
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

    drive.events.setDownloadAbort(downloadAbort);

    thunk.then(() => {
      setIsDisabled(false);
    });
  };
  const onItemPressed = () => {
    if (isDisabled) {
      return;
    }

    isFolder ? onFolderPressed() : onFilePressed();
  };
  const onActionsButtonPressed = () => {
    dispatch(
      driveActions.setFocusedItem({
        ...props.data,
        parentId: props.data.parentId as number,
        size: props.data.size,
        updatedAt: props.data.updatedAt,
      }),
    );
    dispatch(uiActions.setShowItemModal(true));
  };
  const onItemLongPressed = () => {
    onActionsButtonPressed();
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
