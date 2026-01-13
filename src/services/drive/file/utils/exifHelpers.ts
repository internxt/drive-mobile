import drive from '../..';

const generatedNamesCache = new Map<string, number>();
const CACHE_CLEANUP_INTERVAL = 60000; // 1 minute

if (typeof jest === 'undefined') {
  setInterval(() => {
    generatedNamesCache.clear();
  }, CACHE_CLEANUP_INTERVAL);
}

/**
 * Parses EXIF date string (format: "YYYY:MM:DD HH:MM:SS") to ISO string
 * @param exifDate - EXIF date string
 * @returns ISO date string or undefined if parsing fails
 * @note Invalid dates are handled by returning undefined (no error thrown)
 */
export const parseExifDate = (exifDate: string | undefined): string | undefined => {
  if (!exifDate) return undefined;

  try {
    const fixedDate = exifDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const parsedDate = new Date(fixedDate);
    return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString();
  } catch {
    return undefined;
  }
};

/**
 * Checks if filename is a temporary numeric name
 * @param fileName - Original filename
 * @returns true if it's a temporary name
 */
export const isTemporaryFileName = (fileName: string | undefined | null): boolean => {
  if (!fileName) return true;
  return /^\d+\.\w+$/i.test(fileName);
};

/**
 * Clears the generated filenames cache
 * @note This function is primarily used for testing purposes
 */
export const clearGeneratedNamesCache = (): void => {
  generatedNamesCache.clear();
};

/**
 * Resolves timestamp from provided dates or falls back to current time
 * @param creationTime - ISO string of creation time
 * @param modificationTime - ISO string of modification time
 * @returns Valid Date object, never returns invalid date
 */
const resolveTimestamp = (creationTime?: string, modificationTime?: string): Date => {
  try {
    const dateString = modificationTime || creationTime;
    const timestamp = dateString ? new Date(dateString) : new Date();

    if (Number.isNaN(timestamp.getTime())) {
      return new Date();
    }

    return timestamp;
  } catch {
    return new Date();
  }
};

/**
 * Formats timestamp into clean date and time strings without separators
 * @param timestamp - Date object to format
 * @returns Object with formatted dateStr, timeStr, and msStr
 */
const formatTimestampParts = (timestamp: Date): { dateStr: string; timeStr: string; msStr: string } => {
  const isoString = timestamp.toISOString();
  const [datePart, timePart] = isoString.split('T');
  const [timeWithSeconds, milliseconds] = timePart.split('.');

  return {
    dateStr: datePart.replaceAll('-', ''),
    timeStr: timeWithSeconds.replaceAll(':', ''),
    msStr: milliseconds.slice(0, 3),
  };
};

/**
 * Builds filename variants with and without milliseconds
 * @param dateStr - Formatted date string (YYYYMMDD)
 * @param timeStr - Formatted time string (HHMMSS)
 * @param msStr - Milliseconds string (mmm)
 * @param extension - File extension
 * @returns Object with base name variants
 */
const buildFileNameVariants = (
  dateStr: string,
  timeStr: string,
  msStr: string,
  extension: string,
): { withoutMs: string; withMs: string } => {
  const prefix = getFilePrefix(extension);
  return {
    withoutMs: `${prefix}_${dateStr}_${timeStr}.${extension}`,
    withMs: `${prefix}_${dateStr}_${timeStr}-${msStr}.${extension}`,
  };
};

/**
 * Resolves unique filename by checking cache and adding suffixes as needed
 * @param baseNameWithoutMs - Clean filename without milliseconds
 * @param baseNameWithMs - Filename with milliseconds
 * @param dateStr - Formatted date string
 * @param timeStr - Formatted time string
 * @param msStr - Milliseconds string
 * @param extension - File extension
 * @returns Unique filename with appropriate suffix
 */
const resolveUniqueFileName = (
  baseNameWithoutMs: string,
  baseNameWithMs: string,
  dateStr: string,
  timeStr: string,
  msStr: string,
  extension: string,
): string => {
  const countWithoutMs = generatedNamesCache.get(baseNameWithoutMs) || 0;

  const firstTimeName = countWithoutMs === 0;
  if (firstTimeName) {
    generatedNamesCache.set(baseNameWithoutMs, 1);
    return baseNameWithoutMs;
  }

  const countWithMs = generatedNamesCache.get(baseNameWithMs) || 0;

  const nameWithMsNotExists = countWithMs === 0;
  if (nameWithMsNotExists) {
    generatedNamesCache.set(baseNameWithMs, 1);
    return baseNameWithMs;
  }

  const prefix = getFilePrefix(extension);
  const finalName = `${prefix}_${dateStr}_${timeStr}-${msStr}_${countWithMs + 1}.${extension}`;
  generatedNamesCache.set(baseNameWithMs, countWithMs + 1);
  return finalName;
};

const VIDEO_EXTENSIONS = [
  'mp4',
  'mov',
  'avi',
  'mkv',
  'webm',
  'm4v',
  '3gp',
  'flv',
  'wmv',
  'mpeg',
  'mpg',
  'ogv',
  'mts',
  'm2ts',
  'ts',
  'vob',
  'asf',
];

/**
 * Checks if the file extension corresponds to a video format
 * Based on video extensions defined in helpers/filetypes.ts plus common video formats
 * @param extension - File extension
 * @returns true if video format, false otherwise
 */
export const isVideoExtension = (extension: string): boolean => {
  return VIDEO_EXTENSIONS.includes(extension.toLowerCase());
};

/**
 * Gets the appropriate file prefix based on extension
 * @param extension - File extension
 * @returns 'VID' for videos, 'IMG' for images and others
 */
const getFilePrefix = (extension: string): string => {
  return isVideoExtension(extension) ? 'VID' : 'IMG';
};

/**
 * Generates fallback filename when main generation fails
 * @param uri - File URI to extract extension
 * @returns Simple fallback filename
 */
const generateFallbackFileName = (uri: string): string => {
  const extension = drive.file.getExtensionFromUri(uri)?.toLowerCase() ?? 'jpg';
  const prefix = getFilePrefix(extension);
  const { dateStr, timeStr } = formatTimestampParts(new Date());
  return `${prefix}_${dateStr}_${timeStr}.${extension}`;
};

/**
 * Generates a descriptive filename for media files
 * @param uri - File URI to extract extension
 * @param creationTime - ISO string of creation time
 * @param modificationTime - ISO string of modification time
 * @returns Generated filename in format:
 *          - IMG_YYYYMMDD_HHMMSS.extension (for images)
 *          - VID_YYYYMMDD_HHMMSS.extension (for videos)
 *          With -mmm suffix if duplicate, or -mmm_N if multiple duplicates
 * @note Uses cache to prevent duplicates during bulk uploads
 */
export const generateFileName = (uri: string, creationTime?: string, modificationTime?: string): string => {
  try {
    const timestamp = resolveTimestamp(creationTime, modificationTime);
    const { dateStr, timeStr, msStr } = formatTimestampParts(timestamp);
    const extension = drive.file.getExtensionFromUri(uri)?.toLowerCase() ?? 'jpg';

    const { withoutMs, withMs } = buildFileNameVariants(dateStr, timeStr, msStr, extension);

    return resolveUniqueFileName(withoutMs, withMs, dateStr, timeStr, msStr, extension);
  } catch {
    return generateFallbackFileName(uri);
  }
};
