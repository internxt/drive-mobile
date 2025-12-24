import {
  DriveFolderData,
  FetchFolderContentResponse,
  FetchTrashContentResponse,
  SearchResult,
} from '@internxt/sdk/dist/drive/storage/types';
import { DeleteItemsPermanentlyPayload } from '@internxt/sdk/dist/drive/trash/types';

export type {
  DeleteItemsPermanentlyPayload,
  DriveFolderData,
  FetchFolderContentResponse,
  FetchTrashContentResponse,
  SearchResult,
};

/**
 * Base type for a Drive folder
 * Extends SDK's DriveFolderData with mobile-specific fields
 */
export type DriveFolder = DriveFolderData & {
  isFolder: true;
  plainName: string;
};

/**
 * Simplified folder type for tree/hierarchy operations
 * Omits heavy metadata not needed for navigation
 */
export type DriveFolderForTree = Pick<
  DriveFolder,
  'id' | 'uuid' | 'parentId' | 'parentUuid' | 'name' | 'plainName' | 'updatedAt' | 'createdAt' | 'isFolder'
>;

/**
 * Response from modified folders endpoint
 */
export interface ModifiedFolder {
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

/**
 * Folder record stored in SQLite
 */
export interface SqliteFolderRecord {
  id: number;
  uuid: string;
  parent_id: number;
  parent_uuid: string;
  name: string;
  updated_at: string;
  date: string;
}

/**
 * Navigation stack item representing a folder in the breadcrumb trail
 */
export interface FolderNavigationItem {
  id: number;
  parentId: number;
  name: string;
  updatedAt: string;
  uuid: string;
  isFolder: true;
}
