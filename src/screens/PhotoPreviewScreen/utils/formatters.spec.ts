import { formatBytes, formatDate, formatDimensions, formatExtension, formatHeaderDate, formatHeaderTime } from './formatters';

describe('formatBytes', () => {
  test('when size is less than 1024, then it is shown in bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  test('when size is between 1 KB and 1 MB, then it is shown in kilobytes', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  test('when size is between 1 MB and 1 GB, then it is shown in megabytes', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  test('when size is 1 GB or more, then it is shown in gigabytes', () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.00 GB');
  });
});

describe('formatDate', () => {
  test('when given a timestamp, then it returns a readable date string', () => {
    const result = formatDate(new Date('2024-06-15').getTime());
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

describe('formatDimensions', () => {
  test('when given width and height, then they are joined with a times sign', () => {
    expect(formatDimensions(1920, 1080)).toBe('1920 × 1080');
  });
});

describe('formatExtension', () => {
  test('when filename has an extension, then it is returned in uppercase', () => {
    expect(formatExtension('photo.jpg')).toBe('JPG');
  });

  test('when filename has no extension, then an empty string is returned', () => {
    expect(formatExtension('noext')).toBe('');
  });

  test('when filename has multiple dots, then only the last segment is used', () => {
    expect(formatExtension('my.photo.PNG')).toBe('PNG');
  });
});

describe('formatHeaderDate', () => {
  test('when given a timestamp, then it returns a short weekday, day, month and year string', () => {
    const result = formatHeaderDate(new Date('2023-01-02T22:56:00Z').getTime());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatHeaderTime', () => {
  test('when given a timestamp, then it returns hours and minutes in 24-hour format', () => {
    const result = formatHeaderTime(new Date('2023-01-02T22:56:00').getTime());
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});
