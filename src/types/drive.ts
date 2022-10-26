import { DriveFileData, DriveFolderData, Thumbnail } from '@internxt/sdk/dist/drive/storage/types';

const GB = 1024 * 1024 * 1024;
export const UPLOAD_FILE_SIZE_LIMIT = 5 * GB;

export interface DriveNavigationStackItem {
  id: number;
  parentId: number;
  name: string;
  item: DriveItemDataProps;
  updatedAt: string;
}
export type DriveNavigationStack = DriveNavigationStackItem[];

export type DriveItemData = DriveFileData & DriveFolderData;

export type DriveItemFocused = {
  id: number;
  name: string;
  parentId?: number;
  fileId?: string;
  type?: string;
  size?: string | number;
  updatedAt: string;
  folderId?: number;
  code?: string;
  token?: string;
  shareId?: string;
} | null;

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

export type DriveItemDataProps = Pick<
  DriveItemData,
  'id' | 'name' | 'updatedAt' | 'createdAt' | 'currentThumbnail' | 'thumbnails'
> & {
  fileId?: string;
  parentId?: number | null;
  code?: string;
  token?: string;
  size?: string | number;
  type?: string;
  shareId?: string;
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
  UploadCompleted = 'upload-completed',
  SharedLinksUpdated = 'shared-links-updated',
  DriveItemDeleted = 'drive-item-deleted',
}

export interface DriveServiceModel {
  debug: boolean;
}

export const DRIVE_DB_NAME = 'drive.db';

export interface SqliteDriveItemRow {
  id: number;
  bucket: string | null;
  color: string | null;
  encrypt_version: string | null;
  icon: string | null;
  icon_id: number | null;
  is_folder: boolean;
  name: string;
  parent_id: number | null;
  user_id: number;
  file_id: string | null;
  size: number | null;
  type: string | null;
  created_at: string;
  updated_at: string;
  thumbnails: Array<Thumbnail>;
  currentThumbnail: Thumbnail | null;
}

export interface SqliteDriveFolderRecord {
  id: number;
  parent_id: number;
  name: string;
  updated_at: string;
  date: string;
}

export type InsertSqliteDriveItemRowData = Pick<
  SqliteDriveItemRow,
  | 'id'
  | 'bucket'
  | 'color'
  | 'encrypt_version'
  | 'icon'
  | 'icon_id'
  | 'is_folder'
  | 'name'
  | 'parent_id'
  | 'user_id'
  | 'file_id'
  | 'size'
  | 'type'
  | 'created_at'
  | 'updated_at'
>;

export interface DriveNavigableItemProps extends DriveItemProps {
  isLoading?: boolean;
  disabled?: boolean;
  onItemPressed?: (item: DriveItemDataProps) => void;
}

export interface DriveCurrentFolderContent {
  scope: string;
  focusedItem: DriveItemFocused;
  folderContent: DriveItemData[];
}
