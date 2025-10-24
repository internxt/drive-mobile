jest.mock('../..', () => ({
  __esModule: true,
  default: {
    file: {
      getExtensionFromUri: jest.fn(),
    },
  },
}));

import drive from '../..';
import {
  clearGeneratedNamesCache,
  generateFileName,
  isTemporaryFileName,
  isVideoExtension,
  parseExifDate,
} from './exifHelpers';

const mockGetExtensionFromUri = drive.file.getExtensionFromUri as jest.MockedFunction<
  typeof drive.file.getExtensionFromUri
>;

describe('parseExifDate', () => {
  test('should parse valid EXIF date format', () => {
    const exifDate = '2024:12:25 14:30:45';
    const result = parseExifDate(exifDate);
    expect(result).toMatch(/2024-12-25T\d{2}:30:45\.\d{3}Z/);
  });

  test('should return undefined for undefined input', () => {
    const result = parseExifDate(undefined);
    expect(result).toBeUndefined();
  });

  test('should return undefined for invalid date', () => {
    const result = parseExifDate('invalid:date:format');
    expect(result).toBeUndefined();
  });

  test('should return undefined for malformed EXIF date', () => {
    const result = parseExifDate('2024:13:45 25:99:99');
    expect(result).toBeUndefined();
  });

  test('should handle partial EXIF dates', () => {
    const result = parseExifDate('2024:01:15');
    expect(result).toBeDefined();
  });
});

describe('isVideoExtension', () => {
  test('should return true for video extensions', () => {
    expect(isVideoExtension('mp4')).toBe(true);
    expect(isVideoExtension('mov')).toBe(true);
    expect(isVideoExtension('avi')).toBe(true);
  });

  test('should return false for image extensions', () => {
    expect(isVideoExtension('jpg')).toBe(false);
    expect(isVideoExtension('png')).toBe(false);
    expect(isVideoExtension('heic')).toBe(false);
    expect(isVideoExtension('gif')).toBe(false);
  });

  test('should handle uppercase extensions', () => {
    expect(isVideoExtension('MP4')).toBe(true);
    expect(isVideoExtension('MOV')).toBe(true);
    expect(isVideoExtension('JPG')).toBe(false);
  });

  test('should return false for other file types', () => {
    expect(isVideoExtension('pdf')).toBe(false);
    expect(isVideoExtension('txt')).toBe(false);
    expect(isVideoExtension('doc')).toBe(false);
  });

  test('should return true for additional video formats', () => {
    expect(isVideoExtension('mkv')).toBe(true);
    expect(isVideoExtension('webm')).toBe(true);
    expect(isVideoExtension('m4v')).toBe(true);
    expect(isVideoExtension('3gp')).toBe(true);
    expect(isVideoExtension('flv')).toBe(true);
  });

  test('should return false for unsupported extensions', () => {
    expect(isVideoExtension('xyz')).toBe(false);
    expect(isVideoExtension('unknown')).toBe(false);
    expect(isVideoExtension('abc')).toBe(false);
  });
});

describe('isTemporaryFileName', () => {
  test('should return true for numeric filenames', () => {
    expect(isTemporaryFileName('12345.jpg')).toBe(true);
    expect(isTemporaryFileName('987654321.png')).toBe(true);
    expect(isTemporaryFileName('1234.mp4')).toBe(true);
  });

  test('should return true for undefined or null', () => {
    expect(isTemporaryFileName(undefined)).toBe(true);
    expect(isTemporaryFileName(null)).toBe(true);
  });

  test('should return true for empty string', () => {
    expect(isTemporaryFileName('')).toBe(true);
  });

  test('should return false for descriptive filenames', () => {
    expect(isTemporaryFileName('IMG_20240512_143045.jpg')).toBe(false);
    expect(isTemporaryFileName('photo_2024.png')).toBe(false);
    expect(isTemporaryFileName('vacation.mp4')).toBe(false);
  });

  test('should return false for filenames with letters', () => {
    expect(isTemporaryFileName('abc123.jpg')).toBe(false);
    expect(isTemporaryFileName('12abc.png')).toBe(false);
  });

  test('should handle different file extensions', () => {
    expect(isTemporaryFileName('12345.heic')).toBe(true);
    expect(isTemporaryFileName('67890.mov')).toBe(true);
    expect(isTemporaryFileName('11111.webp')).toBe(true);
  });

  test('should return false for filenames without extension', () => {
    expect(isTemporaryFileName('12345')).toBe(false);
  });
});

describe('generateFileName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearGeneratedNamesCache();
    mockGetExtensionFromUri.mockReturnValue('jpg');
  });

  test('should generate filename without milliseconds for first file', () => {
    const uri = 'file:///path/to/image.jpg';
    const creationTime = '2024-12-25T14:30:45.123Z';

    const result = generateFileName(uri, creationTime);

    expect(result).toBe('IMG_20241225_143045.jpg');
    expect(mockGetExtensionFromUri).toHaveBeenCalledWith(uri);
  });

  test('should use modificationTime over creationTime', () => {
    const uri = 'file:///path/to/image.jpg';
    const creationTime = '2024-12-25T14:30:45.000Z';
    const modificationTime = '2024-12-25T15:30:45.000Z';

    const result = generateFileName(uri, creationTime, modificationTime);

    expect(result).toContain('153045');
  });

  test('should handle duplicate timestamps by adding milliseconds then counter', () => {
    const uri1 = 'file:///path/to/image1.jpg';
    const uri2 = 'file:///path/to/image2.jpg';
    const uri3 = 'file:///path/to/image3.jpg';
    const sameTimestamp = '2024-12-25T14:30:45.123Z';

    const result1 = generateFileName(uri1, sameTimestamp);
    const result2 = generateFileName(uri2, sameTimestamp);
    const result3 = generateFileName(uri3, sameTimestamp);

    expect(result1).toBe('IMG_20241225_143045.jpg');
    expect(result2).toBe('IMG_20241225_143045-123.jpg');
    expect(result3).toBe('IMG_20241225_143045-123_2.jpg');
  });

  test('should fallback to Date.now() when no time provided', () => {
    const uri = 'file:///path/to/image.jpg';

    const result = generateFileName(uri);

    expect(result).toMatch(/^IMG_\d{8}_\d{6}\.jpg$/);
  });

  test('should handle invalid dates and fallback to current time', () => {
    const uri = 'file:///path/to/image.jpg';
    const invalidTime = 'invalid-date';

    const result = generateFileName(uri, invalidTime);

    expect(result).toMatch(/^IMG_\d{8}_\d{6}\.jpg$/);
  });

  test('should handle different file extensions', () => {
    mockGetExtensionFromUri.mockReturnValue('png');
    const uri = 'file:///path/to/image.png';
    const creationTime = '2024-12-25T14:30:45.123Z';

    const result = generateFileName(uri, creationTime);

    expect(result).toMatch(/\.png$/);
  });

  test('should use VID prefix for video files', () => {
    mockGetExtensionFromUri.mockReturnValue('mp4');
    const uri = 'file:///path/to/video.mp4';
    const creationTime = '2024-12-25T14:30:45.123Z';

    const result = generateFileName(uri, creationTime);

    expect(result).toBe('VID_20241225_143045.mp4');
  });

  test('should use VID prefix for MOV files', () => {
    mockGetExtensionFromUri.mockReturnValue('mov');
    const uri = 'file:///path/to/video.mov';
    const creationTime = '2024-12-25T14:30:45.123Z';

    const result = generateFileName(uri, creationTime);

    expect(result).toBe('VID_20241225_143045.mov');
  });

  test('should use IMG prefix for image files', () => {
    mockGetExtensionFromUri.mockReturnValue('heic');
    const uri = 'file:///path/to/photo.heic';
    const creationTime = '2024-12-25T14:30:45.123Z';

    const result = generateFileName(uri, creationTime);

    expect(result).toBe('IMG_20241225_143045.heic');
  });

  test('should use fallback when formatting fails', () => {
    const uri = 'file:///path/to/image.jpg';

    const originalToISOString = Date.prototype.toISOString;
    let callCount = 0;
    Date.prototype.toISOString = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Formatting error');
      }
      return originalToISOString.call(new Date());
    });

    const result = generateFileName(uri);

    expect(result).toMatch(/^IMG_\d{8}_\d{6}\.jpg$/);

    Date.prototype.toISOString = originalToISOString;
  });

  test('should handle bulk upload scenario with 20 files', () => {
    const sameTimestamp = '2024-12-25T14:30:45.123Z';
    const results: string[] = [];

    for (let i = 0; i < 20; i++) {
      const uri = `file:///path/to/image${i}.jpg`;
      results.push(generateFileName(uri, sameTimestamp));
    }

    const uniqueNames = new Set(results);
    expect(uniqueNames.size).toBe(20);

    expect(results[0]).toBe('IMG_20241225_143045.jpg');
    expect(results[1]).toBe('IMG_20241225_143045-123.jpg');
    expect(results[2]).toBe('IMG_20241225_143045-123_2.jpg');
    expect(results[19]).toBe('IMG_20241225_143045-123_19.jpg');
  });

  test('should handle duplicate video files with VID prefix', () => {
    mockGetExtensionFromUri.mockReturnValue('mp4');
    clearGeneratedNamesCache();

    const uri1 = 'file:///path/to/video1.mp4';
    const uri2 = 'file:///path/to/video2.mp4';
    const uri3 = 'file:///path/to/video3.mp4';
    const sameTimestamp = '2024-12-25T14:30:45.456Z';

    const result1 = generateFileName(uri1, sameTimestamp);
    const result2 = generateFileName(uri2, sameTimestamp);
    const result3 = generateFileName(uri3, sameTimestamp);

    expect(result1).toBe('VID_20241225_143045.mp4');
    expect(result2).toBe('VID_20241225_143045-456.mp4');
    expect(result3).toBe('VID_20241225_143045-456_2.mp4');
  });
});
