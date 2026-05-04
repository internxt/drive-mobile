import { formatBytes, getFileExtension, getFileNameWithoutExtension, getMimeTypeFromUri, toDisplayUri } from './utils';

describe('toDisplayUri', () => {
  test('when given a raw filesystem path, then it prepends file://', () => {
    expect(toDisplayUri('/data/user/0/com.internxt/cache/thumb.jpg')).toBe(
      'file:///data/user/0/com.internxt/cache/thumb.jpg',
    );
  });

  test('when given a file:// URI, then it returns it unchanged', () => {
    expect(toDisplayUri('file:///data/user/0/com.internxt/cache/thumb.jpg')).toBe(
      'file:///data/user/0/com.internxt/cache/thumb.jpg',
    );
  });

  test('when given a content:// URI, then it returns it unchanged', () => {
    expect(toDisplayUri('content://media/external/images/media/42')).toBe('content://media/external/images/media/42');
  });

  test('when given an https:// URI, then it returns it unchanged', () => {
    expect(toDisplayUri('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
  });

  test('when given an http:// URI, then it returns it unchanged', () => {
    expect(toDisplayUri('http://example.com/image.jpg')).toBe('http://example.com/image.jpg');
  });
});

describe('getFileExtension', () => {
  test('when given a filename with uppercase extension, then it returns it lowercased', () => {
    expect(getFileExtension('photo.JPG')).toBe('jpg');
  });

  test('when given a filename with no extension, then it returns empty string', () => {
    expect(getFileExtension('README')).toBe('');
  });

  test('when given null, then it returns empty string', () => {
    expect(getFileExtension(null)).toBe('');
  });

  test('when given a dotted filename, then it returns the last extension', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
  });

  test('when given a hidden file (leading dot only), then it returns empty string', () => {
    expect(getFileExtension('.gitignore')).toBe('');
  });
});

describe('getFileNameWithoutExtension', () => {
  test('when given a filename with extension, then it strips the extension', () => {
    expect(getFileNameWithoutExtension('photo.jpg')).toBe('photo');
  });

  test('when given a filename with no extension, then it returns the full name', () => {
    expect(getFileNameWithoutExtension('README')).toBe('README');
  });

  test('when given null, then it returns the fallback string', () => {
    expect(getFileNameWithoutExtension(null)).toBe('file');
  });

  test('when given a dotted filename, then it strips only the last extension', () => {
    expect(getFileNameWithoutExtension('archive.tar.gz')).toBe('archive.tar');
  });
});

describe('getMimeTypeFromUri', () => {
  test('when given a file:// URI with known extension, then it returns the MIME type', () => {
    expect(getMimeTypeFromUri('file:///storage/emulated/0/DCIM/photo.jpg')).toBe('image/jpeg');
  });

  test('when given a content:// URI with a filename segment, then it returns the MIME type', () => {
    expect(getMimeTypeFromUri('content://media/external/images/media/document.pdf')).toBe('application/pdf');
  });

  test('when given a URI with no recognizable extension, then it returns null', () => {
    expect(getMimeTypeFromUri('content://media/external/images/media/42')).toBeNull();
  });
});

describe('formatBytes', () => {
  test('when given a byte count, then it returns a non-empty human-readable string', () => {
    expect(formatBytes(1024)).toBeTruthy();
  });
});
