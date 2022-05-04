import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

export const UPLOAD_FILE_SIZE_LIMIT = 1024 * 1024 * 1024;

export type DriveItemData = DriveFileData & DriveFolderData;

export interface DriveFolderMetadataPayload {
  itemName: string;
}
export interface DriveFileMetadataPayload {
  itemName: string;
}

export enum DriveListViewMode {
  List = 'list',
  Grid = 'grid',
}

export enum DriveListType {
  Drive = 'drive',
  Shared = 'shared',
}

export enum DriveItemStatus {
  Idle = 'idle',
  Uploading = 'uploading',
  Downloading = 'downloading',
}

export interface UploadingFile {
  id: number;
  uri: string;
  name: string;
  type: string;
  parentId: number;
  createdAt: string;
  updatedAt: string;
  size: number;
  progress: number;
}

export interface DownloadingFile {
  data: { id: number; fileId: string; name: string; type: string; size: number; updatedAt: string };
  downloadProgress: number;
  decryptProgress: number;
  status: 'idle' | 'cancelling' | 'cancelled';
}

export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc',
}

export enum SortType {
  Name = 'name',
  Size = 'size',
  UpdatedAt = 'updatedAt',
}

export type DriveItemDataProps = Pick<DriveItemData, 'id' | 'name' | 'updatedAt' | 'createdAt'> & {
  fileId?: string;
  parentId?: number;
  size?: number;
  type?: string;
};

export type DriveListItem = { status: DriveItemStatus; progress?: number; data: DriveItemDataProps };

export interface DriveItemProps {
  type: DriveListType;
  viewMode: DriveListViewMode;
  status: DriveItemStatus;
  data: DriveItemDataProps;
  isLoading?: boolean;
  nameEncrypted?: boolean;
  selectable?: boolean;
  subtitle?: JSX.Element;
  progress?: number;
}

export enum DriveEventKey {
  DownloadCompleted = 'download-completed',
  DownloadError = 'download-error',
  DownloadFinally = 'download-finally',
  CancelDownload = 'cancel-download',
  CancelDownloadEnd = 'cancel-download-end',
}

export interface DriveServiceModel {
  debug: boolean;
}
