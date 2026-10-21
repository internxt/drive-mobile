import type {
  FetchPaginatedFile as SdkFetchPaginatedFile,
  FetchPaginatedFilesContent as SdkFetchPaginatedFilesContent,
  DriveFileData as SdkDriveFileData,
  FileMeta as SdkFileMeta,
} from '@internxt/sdk/dist/drive/storage/types';
import { WithoutDeprecatedItemFields } from './deprecatedFields';
export { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
export type { FileEntryByUuid, Thumbnail } from '@internxt/sdk/dist/drive/storage/types';

export type DriveFileData = WithoutDeprecatedItemFields<SdkDriveFileData>;

export type FileMeta = WithoutDeprecatedItemFields<SdkFileMeta>;

export type FetchPaginatedFile = WithoutDeprecatedItemFields<SdkFetchPaginatedFile>;

export type FetchPaginatedFilesContent = Omit<SdkFetchPaginatedFilesContent, 'files'> & {
  files: FetchPaginatedFile[];
};

export type CheckDuplicatedFilesResponse = {
  existentFiles: DriveFileData[];
};

/**
 * Base type for a Drive file
 * Extends SDK's DriveFileData with mobile-specific fields
 */
export type DriveFile = DriveFileData & {
  isFolder: false;
  plainName: string;
  thumbnail?: DownloadedThumbnail;
};

/**
 * Simplified file type for tree/hierarchy operations
 * Omits heavy metadata not needed for navigation
 */
export type DriveFileForTree = Pick<
  DriveFile,
  | 'uuid'
  | 'fileId'
  | 'plainName'
  | 'type'
  | 'size'
  | 'bucket'
  | 'folderUuid'
  | 'updatedAt'
  | 'createdAt'
  | 'isFolder'
  | 'thumbnails'
> & { name: string };

/**
 * File from recent files list
 * Ensures plainName is always available
 */
export type RecentFile = DriveFile & {
  plainName: string;
};

/**
 * Recent file as listed, with its name taken from plainName
 */
export type RecentListFile = RecentFile & {
  name: string;
};

/**
 * Downloaded thumbnail stored locally
 */
export interface DownloadedThumbnail {
  width: number;
  height: number;
  uri: string;
}

/**
 * Response from modified files endpoint
 */
export interface ModifiedFile {
  uuid: string;
  fileId: string;
  type: string;
  size: string;
  bucket: string;
  folder: null;
  folderUuid: string;
  encryptVersion: string;
  userId: number;
  modificationTime: Date;
  createdAt: Date;
  updatedAt: string;
  plainName: string;
  status: 'EXISTS' | 'TRASHED' | 'DELETED';
}

/**
 * Supported file extensions
 */
export enum FileExtension {
  MOV = 'mov',
  MP4 = 'mp4',
  AVI = 'avi',
  JPG = 'jpg',
  JPEG = 'jpeg',
  PNG = 'png',
  HEIC = 'heic',
  PDF = 'pdf',
  DNG = 'dng',
}
