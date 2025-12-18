import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { TrashItem } from '../services/drive/trash';
import { DriveItemData, DriveItemDataProps, DriveItemFocused } from '../types/drive';

/**
 * Checks if a Drive item is a folder
 *
 * @param item - Drive item to check
 * @returns true if the item is a folder, false if it's a file
 */
export const checkIsFolder = (
  item: DriveItemData | DriveItemDataProps | DriveItemFocused | DriveFileData | TrashItem,
): boolean => {
  if (!item) return false;

  if ('isFolder' in item) {
    return !!item.isFolder;
  }
  // Only folders have parentUuid
  if ('parentUuid' in item && item.parentUuid) return true;

  return false;
};

/**
 * Checks if a file has zero bytes (empty file)
 *
 * @param item - Drive item to check
 * @returns true if the file size is 0, false otherwise
 */
export const isEmptyFile = (item: DriveItemData | DriveItemFocused): boolean => {
  if (!item || !('size' in item)) return false;

  const { size } = item;
  if (size === undefined || size === null) return false;

  const sizeNumber = Number(size);
  return sizeNumber === 0;
};

/**
 * Gets the numeric size of a file
 *
 * @param item - Drive item
 * @returns The size as a number, or 0 if size is undefined/null
 */
export const getFileSize = (item: DriveItemData | DriveItemFocused): number => {
  if (!item || !('size' in item)) return 0;

  const { size } = item;

  if (size === undefined || size === null) return 0;

  return typeof size === 'number' ? size : Number(size);
};

/**
 * Checks if a file is a file (not a folder)
 *
 * @param item - Drive item to check
 * @returns true if the item is a file, false if it's a folder
 */
export const checkIsFile = (item: DriveItemData | DriveItemFocused): boolean => {
  return !checkIsFolder(item);
};
