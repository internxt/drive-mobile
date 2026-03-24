import { FolderAncestor } from '../../../services/drive/folder/driveFolder.service';
import { DriveItemData, DriveItemStatus, DriveListItem } from '../../../types/drive';
import { FolderUploadState } from '../../../types/drive/folderUpload';
import { DriveStackParamList } from '../../../types/navigation';

export type DriveFolderRoute = {
  name: 'DriveFolder';
  params: DriveStackParamList['DriveFolder'];
};

export const buildDeepLinkRoutes = (folderUuid: string, ancestors: FolderAncestor[]): DriveFolderRoute[] | null => {
  if (ancestors.length === 0) return null;
  const [targetFolder, ...ancestorFolders] = ancestors;

  if (targetFolder.uuid !== folderUuid) return null;

  const nameByUuid = new Map(ancestors.map((ancestor) => [ancestor.uuid, ancestor.plainName ?? undefined]));
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

export const buildFolderUploadListItem = (state: FolderUploadState): DriveListItem => ({
  id: `folder-upload-${state.uploadId}`,
  status: DriveItemStatus.Uploading,
  progress: state.totalFiles > 0 ? state.uploadedFiles / state.totalFiles : 0,
  folderUploadProgress: {
    uploadedFiles: state.uploadedFiles,
    totalFiles: state.totalFiles,
    failedFiles: state.failedFiles,
  },
  data: {
    id: -1,
    uuid: state.uploadId,
    name: state.folderName,
    isFolder: true,
    createdAt: new Date(state.startedAt).toISOString(),
    updatedAt: new Date(state.startedAt).toISOString(),
    thumbnails: [],
    currentThumbnail: null,
  } as DriveItemData,
});
