import drive from '../..';

/**
 * Parses EXIF date string (format: "YYYY:MM:DD HH:MM:SS") to ISO string
 * @param exifDate - EXIF date string
 * @returns ISO date string or undefined if parsing fails
 * @note Invalid dates are handled by returning undefined (no error thrown)
 */
export function parseExifDate(exifDate: string | undefined): string | undefined {
  if (!exifDate) return undefined;

  try {
    const fixedDate = exifDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const parsedDate = new Date(fixedDate);
    return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Checks if filename is a temporary numeric name
 * @param fileName - Original filename
 * @returns true if it's a temporary name
 */
export function isTemporaryFileName(fileName: string | undefined | null): boolean {
  if (!fileName) return true;
  return /^\d+\.\w+$/i.test(fileName);
}

/**
 * Generates a descriptive filename for media files
 * @param uri - File URI to extract extension
 * @param creationTime - ISO string of creation time
 * @param modificationTime - ISO string of modification time
 * @returns Generated filename in format IMG_YYYY-MM-DD_HH-MM-SS.extension
 * @note Invalid dates fallback to current timestamp. Errors during formatting
 *       fallback to timestamp-based names (IMG_<timestamp>.<ext>)
 */
export function generateFileName(uri: string, creationTime?: string, modificationTime?: string): string {
  let timestamp: Date;

  try {
    const dateString = modificationTime || creationTime;
    timestamp = dateString ? new Date(dateString) : new Date();

    if (Number.isNaN(timestamp.getTime())) {
      timestamp = new Date();
    }
  } catch {
    timestamp = new Date();
  }

  try {
    const isoString = timestamp.toISOString();
    const [datePart, timePart] = isoString.split('T');
    const timeStr = timePart.split('.')[0].replaceAll(':', '');
    const extension = drive.file.getExtensionFromUri(uri)?.toLowerCase();

    const generatedName = `IMG_${datePart}_${timeStr}.${extension}`;

    return generatedName;
  } catch {
    const fallbackExtension = drive.file.getExtensionFromUri(uri)?.toLowerCase();
    return `IMG_${Date.now()}.${fallbackExtension}`;
  }
}
