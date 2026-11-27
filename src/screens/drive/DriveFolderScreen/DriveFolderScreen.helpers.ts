import drive from '@internxt-mobile/services/drive';
import type { DriveFoldersTreeNode } from '../../../contexts/Drive/Drive.context';
import { FolderAncestor } from '../../../types/drive/folder';
import { DriveItemData, DriveItemStatus, DriveListItem } from '../../../types/drive';
import { FolderUploadState } from '../../../types/drive/folderUpload';
import { SortMode } from '../../../types/drive/ui';
import { DriveStackParamList } from '../../../types/navigation';

export type DriveFolderRoute = {
  name: 'DriveFolder';
  params: DriveStackParamList['DriveFolder'];
};

export const buildDeepLinkRoutes = (folderUuid: string, ancestors: FolderAncestor[]): DriveFolderRoute[] | null => {
  if (ancestors.length === 0) return null;
  const [targetFolder, ...ancestorFolders] = ancestors;

  if (targetFolder.uuid !== folderUuid) return null;

  const nameByUuid = new Map(ancestors.map((ancestor) => [ancestor.uuid, ancestor.plainName]));
  const ancestorFoldersFromRoot = [...ancestorFolders].reverse();

  const routes: DriveFolderRoute[] = ancestorFoldersFromRoot.map((ancestor) => ({
    name: 'DriveFolder',
    params: {
      folderUuid: ancestor.uuid,
      folderName: ancestor.plainName,
      parentUuid: ancestor.parentUuid ?? undefined,
      parentFolderName: ancestor.parentUuid ? nameByUuid.get(ancestor.parentUuid) : undefined,
    },
  }));

  routes.push({
    name: 'DriveFolder',
    params: {
      folderUuid,
      folderName: targetFolder.plainName,
      parentUuid: targetFolder.parentUuid ?? undefined,
      parentFolderName: targetFolder.parentUuid ? nameByUuid.get(targetFolder.parentUuid) : undefined,
    },
  });

  return routes;
};

export const canLoadNextPage = (folderNode: DriveFoldersTreeNode | undefined): boolean =>
  !!folderNode && !folderNode.loading && (folderNode.nextFoldersOffset !== null || folderNode.nextFilesOffset !== null);

export const hasUnloadedPages = (folderNode: DriveFoldersTreeNode | undefined): boolean =>
  !!folderNode && (folderNode.nextFoldersOffset !== null || folderNode.nextFilesOffset !== null);

export const canSelectDriveItem = (item: DriveListItem): boolean => item.status === DriveItemStatus.Idle;

/**
 * Returns the data of the idle files in the list, in the same order, leaving out folders and uploads in progress.
 */
export const getIdleFiles = (driveListItems: DriveListItem[]): DriveItemData[] =>
  driveListItems
    .filter((driveListItem) => !driveListItem.data.isFolder && driveListItem.status === DriveItemStatus.Idle)
    .map((driveListItem) => driveListItem.data);

export const buildFileListItem = (file: DriveFoldersTreeNode['files'][number]): DriveListItem =>
  ({
    status: DriveItemStatus.Idle,
    id: file.uuid,
    data: {
      folderUuid: file.folderUuid,
      uuid: file.uuid,
      name: file.plainName,
      size: file.size,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      fileId: file.fileId,
      bucket: file.bucket,
      type: file.type,
      isFolder: false,
      currentThumbnail: null,
      thumbnails: file.thumbnails,
    },
  }) as DriveListItem;

export const matchesSearchValue = (item: DriveListItem, searchValue: string): boolean =>
  item.data.name.toLowerCase().includes(searchValue.toLowerCase());

export const getFolderPreviewFiles = (
  files: DriveFoldersTreeNode['files'],
  sortMode: SortMode,
  searchValue: string,
): DriveItemData[] =>
  getIdleFiles(
    files
      .map(buildFileListItem)
      .sort(drive.file.getSortFunction(sortMode))
      .filter((item) => matchesSearchValue(item, searchValue)),
  );

export const hasSelectedFolder = (items: DriveListItem[], selectedUuids: Set<string>): boolean =>
  items.some((item) => item.data.isFolder && selectedUuids.has(item.data.uuid));

const FOLDER_UPLOAD_ID_PREFIX = 'folder-upload-';

export const isFolderUploadItem = (item: DriveListItem): boolean => item.id.startsWith(FOLDER_UPLOAD_ID_PREFIX);

export const buildFolderUploadListItem = (state: FolderUploadState): DriveListItem => ({
  id: `${FOLDER_UPLOAD_ID_PREFIX}${state.uploadId}`,
  status: DriveItemStatus.Uploading,
  progress: state.totalFiles > 0 ? state.uploadedFiles / state.totalFiles : 0,
  folderUploadProgress:
    state.status === 'scanning'
      ? undefined
      : {
          uploadedFiles: state.uploadedFiles,
          totalFiles: state.totalFiles,
          failedFiles: state.failedFiles,
        },
  data: {
    uuid: state.uploadId,
    name: state.folderName,
    isFolder: true,
    createdAt: new Date(state.startedAt).toISOString(),
    updatedAt: new Date(state.startedAt).toISOString(),
    thumbnails: [],
    currentThumbnail: null,
  } as DriveItemData,
});
