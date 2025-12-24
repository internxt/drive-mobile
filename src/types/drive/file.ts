import type { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
export { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
export type { DriveFileData, FileEntryByUuid, FileMeta, Thumbnail } from '@internxt/sdk/dist/drive/storage/types';

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
  | 'id'
  | 'uuid'
  | 'fileId'
  | 'name'
  | 'plainName'
  | 'type'
  | 'size'
  | 'bucket'
  | 'folderId'
  | 'folderUuid'
  | 'updatedAt'
  | 'createdAt'
  | 'isFolder'
  | 'thumbnails'
>;

/**
 * File from recent files list
 * Ensures plainName is always available
 */
export type RecentFile = DriveFile & {
  plainName: string;
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
  status: 'EXISTS' | 'TRASHED' | 'REMOVED';
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
}
