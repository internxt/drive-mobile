import { DriveItemData, DriveItemStatus, DriveListItem } from '../../../types/drive';
import { FolderUploadState } from '../../../types/drive/folderUpload';

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
