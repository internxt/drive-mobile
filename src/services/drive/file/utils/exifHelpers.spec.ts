jest.mock('../..', () => ({
  default: {
    file: {
      getExtensionFromUri: jest.fn(),
    },
  },
}));

import { isTemporaryAndroidFileName, parseExifDate } from './exifHelpers';

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

describe('isTemporaryAndroidFileName', () => {
  test('should return true for numeric filenames', () => {
    expect(isTemporaryAndroidFileName('12345.jpg')).toBe(true);
    expect(isTemporaryAndroidFileName('987654321.png')).toBe(true);
    expect(isTemporaryAndroidFileName('1234.mp4')).toBe(true);
  });

  test('should return true for undefined or null', () => {
    expect(isTemporaryAndroidFileName(undefined)).toBe(true);
    expect(isTemporaryAndroidFileName(null)).toBe(true);
  });

  test('should return true for empty string', () => {
    expect(isTemporaryAndroidFileName('')).toBe(true);
  });

  test('should return false for descriptive filenames', () => {
    expect(isTemporaryAndroidFileName('IMG_20240512_143045.jpg')).toBe(false);
    expect(isTemporaryAndroidFileName('photo_2024.png')).toBe(false);
    expect(isTemporaryAndroidFileName('vacation.mp4')).toBe(false);
  });

  test('should return false for filenames with letters', () => {
    expect(isTemporaryAndroidFileName('abc123.jpg')).toBe(false);
    expect(isTemporaryAndroidFileName('12abc.png')).toBe(false);
  });

  test('should handle different file extensions', () => {
    expect(isTemporaryAndroidFileName('12345.heic')).toBe(true);
    expect(isTemporaryAndroidFileName('67890.mov')).toBe(true);
    expect(isTemporaryAndroidFileName('11111.webp')).toBe(true);
  });

  test('should return false for filenames without extension', () => {
    expect(isTemporaryAndroidFileName('12345')).toBe(false);
  });
});
