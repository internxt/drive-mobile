import { useState } from 'react';

import { useNavigation, useRoute } from '@react-navigation/native';
import strings from '../../assets/lang/strings';
import notificationsService from '../services/NotificationsService';
import { useAppDispatch } from '../store/hooks';
import { driveActions, driveThunks } from '../store/slices/drive';
import { uiActions } from '../store/slices/ui';
import { NotificationType } from '../types';
import { DriveItemData, DriveItemStatus } from '../types/drive/item';
import { SharedFiles, SharedFolders } from '../types/drive/shared';
import { useOpenFilePreview } from './drive/useOpenFilePreview';

type SharedItem = SharedFiles & SharedFolders;

interface UseDriveItemProps {
  data: DriveItemData;
  status: DriveItemStatus;
  isSharedLinkItem?: boolean;
  shareLink?: SharedItem;
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
  const openFilePreview = useOpenFilePreview();
  const [isDisabled, setIsDisabled] = useState(false);
  const isFolder = props.data.isFolder;
  const isIdle = props.status === DriveItemStatus.Idle;
  const isUploading = props.status === DriveItemStatus.Uploading;
  const isDownloading = props.status === DriveItemStatus.Downloading;
  const onFolderPressed = () => {
    if (route.name === 'Home') {
      navigation.navigate('Drive' as any);
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
    const downloadPromise = openFilePreview(props.data);

    downloadPromise.then(() => {
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
        folderUuid: props.data.folderUuid ?? undefined,
        bucket: props.data?.bucket ?? undefined,
        shareId: props.data.shareId,
        size: props.data.size,
        updatedAt: props.data.updatedAt,
        isFolder: props.data.isFolder,
      }),
    );

    if (props.isSharedLinkItem && props.shareLink) {
      dispatch(
        driveActions.setFocusedShareItem({
          id: props.shareLink.uuid,
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
