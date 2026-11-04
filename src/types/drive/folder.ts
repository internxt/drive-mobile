import type {
  CreateFolderResponse as SdkCreateFolderResponse,
  DriveFolderData as SdkDriveFolderData,
  FetchFolderContentResponse as SdkFetchFolderContentResponse,
  FetchPaginatedFolder as SdkFetchPaginatedFolder,
  FetchPaginatedFoldersContent as SdkFetchPaginatedFoldersContent,
  FetchTrashContentResponse as SdkFetchTrashContentResponse,
  FolderAncestor as SdkFolderAncestor,
  FolderChild as SdkFolderChild,
  FolderMeta as SdkFolderMeta,
} from '@internxt/sdk/dist/drive/storage/types';
import { WithoutDeprecatedItemFields } from './deprecatedFields';
import { DriveFileData } from './file';
export type { SearchResult } from '@internxt/sdk/dist/drive/storage/types';

export type DriveFolderData = WithoutDeprecatedItemFields<SdkDriveFolderData>;

export type FolderChild = WithoutDeprecatedItemFields<SdkFolderChild>;

export type FetchFolderContentResponse = Omit<
  WithoutDeprecatedItemFields<SdkFetchFolderContentResponse>,
  'children' | 'files'
> & {
  children: FolderChild[];
  files: DriveFileData[];
};

export type FetchPaginatedFolder = WithoutDeprecatedItemFields<SdkFetchPaginatedFolder>;

export type FetchPaginatedFoldersContent = Omit<SdkFetchPaginatedFoldersContent, 'folders'> & {
  folders: FetchPaginatedFolder[];
};

export type FetchTrashContentResponse = {
  result: WithoutDeprecatedItemFields<SdkFetchTrashContentResponse['result'][number]>[];
};

export type CreateFolderResponse = WithoutDeprecatedItemFields<SdkCreateFolderResponse>;

export type FolderMeta = WithoutDeprecatedItemFields<SdkFolderMeta>;

export type FolderAncestor = WithoutDeprecatedItemFields<SdkFolderAncestor> & { parentUuid?: string | null };

export type CheckDuplicatedFoldersResponse = {
  existentFolders: DriveFolderData[];
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
  'uuid' | 'parentUuid' | 'plainName' | 'updatedAt' | 'createdAt' | 'isFolder'
> & { name: string };

/**
 * Response from modified folders endpoint
 */
export interface ModifiedFolder {
  type: string;
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
  uuid: string;
  parent_uuid: string;
  name: string;
  updated_at: string;
  date: string;
}
