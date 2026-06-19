import { stripFileUri, toFileUri } from './uriHelpers';

describe('toFileUri', () => {
  test('when path has no prefix, then file:// is prepended', () => {
    expect(toFileUri('/var/tmp/photo.jpg')).toBe('file:///var/tmp/photo.jpg');
  });

  test('when path already has file:// prefix, then it is returned unchanged', () => {
    expect(toFileUri('file:///var/tmp/photo.jpg')).toBe('file:///var/tmp/photo.jpg');
  });

  test('when path is relative without leading slash, then a leading slash is added and file:// is prepended', () => {
    expect(toFileUri('var/tmp/photo.jpg')).toBe('file:///var/tmp/photo.jpg');
  });

  test('when path contains spaces, then they are percent-encoded in the resulting URI', () => {
    expect(toFileUri('/var/tmp/my photo.jpg')).toBe('file:///var/tmp/my%20photo.jpg');
  });
});

describe('stripFileUri', () => {
  test('when path has file:// prefix, then prefix is removed and URI is decoded', () => {
    expect(stripFileUri('file:///var/tmp/photo.jpg')).toBe('/var/tmp/photo.jpg');
  });

  test('when path has no prefix, then it is returned unchanged', () => {
    expect(stripFileUri('/var/tmp/photo.jpg')).toBe('/var/tmp/photo.jpg');
  });

  test('when path has URL-encoded characters, then they are decoded', () => {
    expect(stripFileUri('file:///var/tmp/my%20photo%20file.jpg')).toBe('/var/tmp/my photo file.jpg');
  });
});
