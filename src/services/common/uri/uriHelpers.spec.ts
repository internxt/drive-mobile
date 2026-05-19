import { FILE_URI_PREFIX, stripFileUri, toFileUri } from './uriHelpers';

describe('toFileUri', () => {
  test('when path has no prefix, then file:// is prepended', () => {
    expect(toFileUri('/var/tmp/photo.jpg')).toBe('file:///var/tmp/photo.jpg');
  });

  test('when path already has file:// prefix, then it is returned unchanged', () => {
    expect(toFileUri('file:///var/tmp/photo.jpg')).toBe('file:///var/tmp/photo.jpg');
  });

  test('when path is empty string, then file:// prefix is added', () => {
    expect(toFileUri('')).toBe(FILE_URI_PREFIX);
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
