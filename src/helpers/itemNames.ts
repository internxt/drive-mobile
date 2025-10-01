import { DriveItemDataProps } from '../types/drive';

/**
 * Generates a display name for a drive item (file or folder).
 * For folders, returns the name as-is.
 * For files, appends the extension if it's not already present in the name.
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
 * // File with extension already in name
 * getDisplayName({ name: 'report.pdf', type: 'pdf', isFolder: false }) // 'report.pdf'
 *
 * @example
 * // File without type
 * getDisplayName({ name: 'unknown', isFolder: false }) // 'unknown'
 */
export const getDisplayName = (item: DriveItemDataProps): string => {
  if (item.isFolder || !item.type) {
    return item.name;
  }

  const normalizedExtension = item.type.trim().toLowerCase();
  const normalizedName = item.name.toLowerCase();

  const expectedEnding = `.${normalizedExtension}`;
  if (normalizedName.endsWith(expectedEnding)) {
    return item.name;
  }

  return `${item.name}.${item.type}`;
};
