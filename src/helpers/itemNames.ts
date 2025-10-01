import { DriveItemDataProps } from '../types/drive';

/**
 * Generates a display name for a drive item (file or folder).
 * For folders, returns the name as-is.
 * For files, always appends the type extension if present.
 *
 * @param {DriveItemDataProps} item - The drive item (file or folder)
 * @returns {string} The formatted display name
 *
 * @example
 * // Folder
 * getDisplayName({ name: 'Documents', isFolder: true }) // 'Documents'
 *
 * @example
 * // File without extension in name
 * getDisplayName({ name: 'report', type: 'pdf', isFolder: false }) // 'report.pdf'
 *
 * @example
 * // File with extension in name (always appends type)
 * getDisplayName({ name: 'backup.tar', type: 'tar', isFolder: false }) // 'backup.tar.tar'
 *
 * @example
 * // File without type
 * getDisplayName({ name: 'unknown', isFolder: false }) // 'unknown'
 */
export const getDisplayName = (item: DriveItemDataProps): string => {
  if (item.isFolder || !item.type) return item.name;

  return `${item.name}.${item.type}`;
};
