import { SharedFiles, SharedFolders } from '@internxt-mobile/types/drive/shared';
import { DriveItemStatus, DriveItemData } from '@internxt-mobile/types/drive/item';
import { DriveListType, DriveListViewMode } from '@internxt-mobile/types/drive/ui';
import React from 'react';
import DriveItem from '../../../components/drive/lists/items';
import { buildSharedItemOnPress, SharedFolderRouteParams } from './sharedNavigation';

interface SharedDriveItemProps {
  data: DriveItemData;
  navigateToSharedFolder: (params: SharedFolderRouteParams) => void;
  parentFolderName?: string;
  shareLink?: SharedFiles & SharedFolders;
}

export const SharedDriveItem: React.FC<SharedDriveItemProps> = ({
  data,
  navigateToSharedFolder,
  parentFolderName,
  shareLink,
}) => (
  <DriveItem
    type={shareLink ? DriveListType.Shared : DriveListType.Drive}
    status={DriveItemStatus.Idle}
    viewMode={DriveListViewMode.List}
    data={data}
    onPress={buildSharedItemOnPress(data, navigateToSharedFolder, parentFolderName)}
    progress={-1}
    shareLink={shareLink}
  />
);
