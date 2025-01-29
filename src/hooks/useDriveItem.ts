import { useState } from 'react';

import drive from '@internxt-mobile/services/drive';
import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { useNavigation, useRoute } from '@react-navigation/native';
import strings from '../../assets/lang/strings';
import notificationsService from '../services/NotificationsService';
import { useAppDispatch } from '../store/hooks';
import { driveActions, driveThunks } from '../store/slices/drive';
import { uiActions } from '../store/slices/ui';
import { NotificationType } from '../types';
import { DriveItemDataProps, DriveItemStatus } from '../types/drive';

interface UseDriveItemProps {
  data: DriveItemDataProps;
  status: DriveItemStatus;
  isSharedLinkItem?: boolean;
  shareLink?: SharedFiles & SharedFolders;
}

/**
 * Consider refactor/remove this hook.
 * It does an insane amount of things, that are not
 * related together, since each DriveItem works with this,
 * we end storing a lot of weird code here, I think a different
 * approach should be used instead, that is not item type independent
 * since files and folders are different
 *
 */
const useDriveItem = (props: UseDriveItemProps) => {
  const dispatch = useAppDispatch();
  const route = useRoute();
  const navigation = useNavigation();
  const [isDisabled, setIsDisabled] = useState(false);
  const isFolder = props.data.isFolder;
  const isIdle = props.status === DriveItemStatus.Idle;
  const isUploading = props.status === DriveItemStatus.Uploading;
  const isDownloading = props.status === DriveItemStatus.Downloading;
  const onFolderPressed = () => {
    if (route.name === 'Home') {
      navigation.navigate('Drive' as any, { sharedFolderId: props.data.parentId as number });
    }
  };

  const onFilePressed = () => {
    if (!isIdle) {
      return;
    }

    if (isDownloading) {
      dispatch(driveThunks.cancelDownloadThunk());

      notificationsService.show({
        type: NotificationType.Info,
        text1: strings.errors.fileAlreadyDownloading,
      });
      return;
    }

    setIsDisabled(true);
    dispatch(
      driveActions.setFocusedItem({
        ...props.data,
        bucket: props.data?.bucket ?? undefined,
        shareId: props.data.shareId,
        parentId: props.data.parentId as number,
        size: props.data.size,
        updatedAt: props.data.updatedAt,
        isFolder: props.data.isFolder,
      }),
    );
    const thunk = dispatch(
      driveThunks.downloadFileThunk({
        ...props.data,
        bucketId: props.data.bucket as string,
        size: props.data.size as number,
        parentId: props.data.parentId as number,
        name: props.data.name,
        type: props.data.type as string,
        fileId: props.data.fileId as string,
        openFileViewer: false,
      }),
    );

    const downloadAbort = () => {
      thunk.abort();
    };

    drive.events.setDownloadAbort(downloadAbort);

    thunk.then(() => {
      setIsDisabled(false);
    });

    navigation.navigate('DrivePreview');
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
        bucket: props.data?.bucket ?? undefined,
        shareId: props.data.shareId,
        parentId: props.data.parentId as number,
        size: props.data.size,
        updatedAt: props.data.updatedAt,
        isFolder: props.data.isFolder,
      }),
    );

    if (props.isSharedLinkItem && props.shareLink) {
      dispatch(
        driveActions.setFocusedShareItem({
          id: props.shareLink.id.toString(),
          //TODO: THIS NOT WORK WITH PUBLIC LINKS
          // hashedPassword: props.shareLink.hashed_password || undefined,
          views: 0,
        }),
      );
      dispatch(uiActions.setIsSharedLinkOptionsModalOpen(true));
    } else {
      dispatch(uiActions.setShowItemModal(true));
    }
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
