import { FolderChild, Thumbnail } from '@internxt/sdk/dist/drive/storage/types';
import { DownloadedThumbnail } from './file';

/**
 * Item properties needed for UI components
 * Simplified from DriveItem with all fields optional except the base ones
 */
export interface DriveItemData {
  id: number;
  name: string;
  uuid: string;
  plainName?: string | null;
  updatedAt: string;
  createdAt: string;
  isFolder: boolean;
  // File-specific fields (only present when isFolder = false)
  folderId?: number;
  folderUuid?: string | null;
  fileId?: string | null;
  type?: string;
  size?: number | string;
  bucket?: string | null;
  // Folder-specific fields (only present when isFolder = true)
  parentId?: number | null;
  parentUuid?: string;
  // Shared/Link fields
  code?: string;
  token?: string;
  shareId?: string;
  // UI fields
  currentThumbnail?: Thumbnail | null;
  thumbnails?: Thumbnail[];
  thumbnail?: DownloadedThumbnail;
}

/**
 * Focused/selected item in the UI
 * Represents the item currently being acted upon
 */
export type FocusedItem = {
  id: number;
  name: string;
  parentId?: number;
  parentUuid?: string;
  folderUuid?: string;
  fileId?: string | null;
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
  uuid: string;
  thumbnails?: Thumbnail[];
} | null;

/**
 * Item status for UI operations
 */
export enum DriveItemStatus {
  Idle = 'idle',
  Uploading = 'uploading',
  Downloading = 'downloading',
}

/**
 * List item with status and progress
 * Used in DriveList component
 */
export interface DriveListItem {
  id: string;
  status: DriveItemStatus;
  progress?: number;
  data: DriveItemData;
}

/**
 * Navigation stack type for folder breadcrumbs
 */
export interface DriveNavigationStackItem {
  id: number;
  parentId: number;
  name: string;
  item: DriveItemData;
  updatedAt: string;
}

export type DriveNavigationStack = DriveNavigationStackItem[];

/**
 * Folder content child item (from SDK)
 */
export type FolderContentChild = FolderChild;

/**
 * SQLite row representation of a drive item
 */
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

/**
 * Data needed to insert a drive item into SQLite
 */
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
