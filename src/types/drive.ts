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
