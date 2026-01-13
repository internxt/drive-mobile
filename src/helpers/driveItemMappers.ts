import { DriveFileData } from '@internxt-mobile/types/drive/file';
import { SharedFiles, SharedFolders } from '@internxt-mobile/types/drive/shared';
import { TrashItem } from '../services/drive/trash';

/**
 * Adds isFolder field to a file item
 */
export const mapFileWithIsFolder = <T extends object>(file: T): T & { isFolder: false } => ({
  ...file,
  isFolder: false,
});

/**
 * Adds isFolder field to a folder item
 */
export const mapFolderWithIsFolder = <T extends object>(folder: T): T & { isFolder: true } => ({
  ...folder,
  isFolder: true,
});

/**
 * Maps an array of files adding isFolder: false to each
 */
export const mapFilesWithIsFolder = <T extends object>(files: T[]): (T & { isFolder: false })[] =>
  files.map(mapFileWithIsFolder);

/**
 * Maps an array of folders adding isFolder: true to each
 */
export const mapFoldersWithIsFolder = <T extends object>(folders: T[]): (T & { isFolder: true })[] =>
  folders.map(mapFolderWithIsFolder);

/**
 * Maps recent files (which are always files)
 */
export const mapRecentFile = (file: DriveFileData) => ({
  ...file,
  name: file.plainName ?? file.name,
  isFolder: false,
});

/**
 * Maps trash files
 */
export const mapTrashFile = (file: TrashItem) => ({
  ...file,
  name: file.plainName,
  isFolder: false,
});

/**
 * Maps trash folders
 */
export const mapTrashFolder = (folder: TrashItem) => ({
  ...folder,
  isFolder: true,
});

/**
 * Maps shared files
 */
export const mapSharedFile = (file: SharedFiles) => ({
  ...file,
  isFolder: false,
});

/**
 * Maps shared folders
 */
export const mapSharedFolder = (folder: SharedFolders) => ({
  ...folder,
  isFolder: true,
});
