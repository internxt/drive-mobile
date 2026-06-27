import errorService from '@internxt-mobile/services/ErrorService';
import notificationsService from '@internxt-mobile/services/NotificationsService';
import { DriveFileForTree } from '@internxt-mobile/types/drive/file';
import { DriveFolderForTree } from '@internxt-mobile/types/drive/folder';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { NotificationType } from '@internxt-mobile/types/index';
import { NativeScrollEvent } from 'react-native';

const SCROLL_END_THRESHOLD = 80;

interface SharedFolderNode {
  files?: DriveFileForTree[];
  folders?: DriveFolderForTree[];
}

interface FolderContentLoader {
  loadFolderContent: (folderUuid: string, options?: { resetPagination?: boolean; focusFolder?: boolean }) => Promise<void>;
}

const mapSharedFolderNode = (folder: DriveFolderForTree): DriveItemData => ({
  id: folder.id,
  uuid: folder.uuid,
  name: folder.plainName,
  parentId: folder.parentId,
  parentUuid: folder.parentUuid,
  updatedAt: folder.updatedAt,
  createdAt: folder.createdAt,
  isFolder: true,
  currentThumbnail: null,
  thumbnails: [],
});

const mapSharedFileNode = (file: DriveFileForTree, userBucket?: string | null): DriveItemData => ({
  id: file.id,
  uuid: file.uuid,
  name: file.plainName,
  fileId: file.fileId,
  folderId: file.folderId,
  folderUuid: file.folderUuid,
  bucket: file.bucket || userBucket || undefined,
  type: file.type,
  size: file.size,
  updatedAt: file.updatedAt,
  createdAt: file.createdAt,
  isFolder: false,
  currentThumbnail: null,
  thumbnails: file.thumbnails,
});

export const buildSharedFolderItems = (folder?: SharedFolderNode, userBucket?: string | null): DriveItemData[] => {
  const folders = (folder?.folders ?? []).map(mapSharedFolderNode);
  const files = (folder?.files ?? []).map((file) => mapSharedFileNode(file, userBucket));
  return folders.concat(files);
};

export const isCloseToScrollEnd = ({ layoutMeasurement, contentOffset, contentSize }: NativeScrollEvent): boolean =>
  layoutMeasurement.height + contentOffset.y >= contentSize.height - SCROLL_END_THRESHOLD;

export const loadSharedFolderContent = (
  driveCtx: FolderContentLoader,
  folderUuid: string,
  options: { resetPagination?: boolean } = {},
): Promise<void> =>
  driveCtx
    .loadFolderContent(folderUuid, { resetPagination: options.resetPagination ?? true, focusFolder: false })
    .catch((error) => {
      errorService.reportError(error);
      const castedError = errorService.castError(error, 'content');
      notificationsService.show({ type: NotificationType.Error, text1: castedError.message });
    });
