import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { SharedFiles, SharedFolders } from '@internxt-mobile/types/drive/shared';
import { SharedStackParamList } from '@internxt-mobile/types/navigation';

export type SharedFolderRouteParams = SharedStackParamList['SharedFolder'];

type SharedLink = SharedFolders & SharedFiles;

type SharedPressableItem = Pick<DriveItemData, 'isFolder' | 'uuid' | 'name'>;

/**
 * The shared-list API returns `bucket: null` on the item (network credentials
 * come separately), so files fall back to the owner's bucket — these are links
 * the user owns, so the file lives in their bucket. Without it download.ts
 * rejects with "Download error code 1".
 */
export const mapSharedLinkToDriveItemData = (sharedLink: SharedLink, userBucket?: string | null): DriveItemData => {
  const isFolder = sharedLink.type === 'folder';

  return {
    ...sharedLink,
    token: sharedLink.token === null ? undefined : sharedLink.token,
    name: sharedLink.plainName,
    type: 'folderId' in sharedLink ? sharedLink.type : undefined,
    shareId: sharedLink.id.toString(),
    fileId: isFolder ? undefined : (sharedLink as unknown as { fileId?: string }).fileId,
    bucket: isFolder ? sharedLink.bucket : (sharedLink.bucket ?? userBucket ?? undefined),
    thumbnails: [],
    currentThumbnail: null,
    code: (sharedLink as unknown as { code: string }).code,
    updatedAt: sharedLink.updatedAt,
    createdAt: sharedLink.createdAt,
    isFolder,
  } as DriveItemData;
};

/**
 * Files return undefined so DriveItem falls back to useDriveItem.onFilePressed
 * (download + DrivePreview) instead of redirecting to the Drive tab.
 */
export const buildSharedItemOnPress = (
  item: SharedPressableItem,
  navigateToSharedFolder: (params: SharedFolderRouteParams) => void,
  parentFolderName?: string,
): (() => void) | undefined => {
  if (!item.isFolder) return undefined;

  return () =>
    navigateToSharedFolder({
      folderUuid: item.uuid,
      folderName: item.name,
      parentFolderName,
    });
};
