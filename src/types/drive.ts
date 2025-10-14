import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import {
  DriveFileData,
  DriveFolderData,
  FetchFolderContentResponse,
  FolderChild,
  Thumbnail,
} from '@internxt/sdk/dist/drive/storage/types';

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

export type DriveItemData = DriveFileData & DriveFolderData & { uuid?: string };

export type DriveFile = DriveFileData & { uuid?: string };

export type getModifiedItemsStatus = 'EXISTS' | 'TRASHED' | 'REMOVED';

export type DriveItemFocused = {
  id: number;
  name: string;
  parentId?: number;
  parentUuid?: string;
  folderUuid?: string;
  fileId?: string;
  type?: string;
  size?: string | number;
  updatedAt: string;
  folderId?: number;
  code?: string;
  token?: string;
  shareId?: string;
  isFromFolderActions?: boolean;
  isFolder: boolean;
  bucket?: string;
  uuid?: string;
  thumbnails?: Thumbnail[];
} | null;

export interface GetModifiedFiles {
  id: number;
  uuid: string;
  fileId: string;
  name: string;
  type: string;
  size: string;
  bucket: string;
  folderId: number;
  folder: null;
  folderUuid: string;
  encryptVersion: string;
  userId: number;
  modificationTime: Date;
  createdAt: Date;
  updatedAt: string;
  plainName: string;
  status: getModifiedItemsStatus;
}

export interface GetModifiedFolders {
  type: string;
  id: number;
  parentId: number;
  name: string;
  parent: null;
  bucket: null;
  userId: number;
  user: null;
  encryptVersion: null;
  createdAt: Date;
  updatedAt: Date;
  uuid: string;
  plainName: string;
  size: number;
  status: string;
}

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
  uuid: string;
  uri: string;
  name: string;
  type: string;
  parentId: number;
  parentUuid: string;
  createdAt: string;
  updatedAt: string;
  size: number;
  progress: number;
  uploaded: boolean;
}

export interface DownloadingFile {
  data: { id: number; fileId: string; name: string; type: string; size: number; updatedAt: string };
  downloadProgress: number;
  decryptProgress: number;
  downloadedFilePath?: string;
  error?: string;
  retry?: () => Promise<void>;
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
  isFolder: boolean;
  folderId?: number;
  folderUuid?: string | null;
  fileId?: string;
  parentId?: number | null;
  parentUuid?: string;
  code?: string;
  token?: string;
  size?: number | string;
  type?: string;
  shareId?: string;
  thumbnail?: DownloadedThumbnail;
  uuid?: string;
  bucket?: string | null;
};

export type DriveListItem = { status: DriveItemStatus; progress?: number; data: DriveItemDataProps; id: string };

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
  isSelected?: boolean;
  shareLink?: SharedFiles & SharedFolders;
  onActionsPress?: () => void;
  onPress?: () => void;
  children?: string;
  hideOptionsButton?: boolean;
}

export enum DriveEventKey {
  DownloadCompleted = 'download-completed',
  DownloadError = 'download-error',
  DownloadFinally = 'download-finally',
  CancelDownload = 'cancel-download',
  CancelDownloadEnd = 'cancel-download-end',
  UploadCompleted = 'upload-completed',
  SharedLinksUpdated = 'shared-links-updated',
  DriveItemTrashed = 'drive-item-trashed',
  DriveItemRestored = 'drive-item-restored',
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
  plain_name: string;
  uuid?: string;
  parent_uuid?: string;
  folder_uuid?: string;
}

export interface SqliteDriveFolderRecord {
  id: number;
  uuid: string;
  parent_id: number;
  parent_uuid: string;
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
  | 'uuid'
  | 'folder_uuid'
  | 'parent_uuid'
> & { plain_name: string | null };

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

export type FolderContentChild = FolderChild;

export type FolderContent = Omit<FetchFolderContentResponse, 'children'> & {
  children: FolderContentChild[];
};

export interface FetchFolderContentResponseWithThumbnails extends FolderContent {
  files: (DriveFile & { thumbnail?: DownloadedThumbnail })[];
}

export type DriveFileForTree = Omit<
  DriveFileData,
  'color' | 'encrypt_version' | 'icon' | 'iconId' | 'plain_name' | 'created_at' | 'folder_id' | 'currentThumbnail'
> & {
  uuid: string;
  plainName: string;
};

export type DriveFolderForTree = Omit<
  DriveFolderData,
  'color' | 'encrypt_version' | 'icon' | 'iconId' | 'plain_name' | 'icon_id' | 'parent_id' | 'user_id'
> & {
  uuid: string;
  folderUuid?: string;
  plainName: string;
  status: DriveFileForTree['status'];
};

export interface DownloadedThumbnail {
  width: number;
  height: number;
  uri: string;
}
export enum FileExtension {
  MOV = 'mov',
  MP4 = 'mp4',
  AVI = 'avi',
  JPG = 'jpg',
  JPEG = 'jpeg',
  PNG = 'png',
  HEIC = 'heic',
  PDF = 'pdf',
}
