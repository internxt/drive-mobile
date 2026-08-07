import { stripFileUri, stripUriFragment, toFileUri } from './uriHelpers';

describe('stripUriFragment', () => {
  test('when a uri has no fragment, then it is returned unchanged', () => {
    expect(stripUriFragment('file:///var/mobile/DCIM/IMG_1234.JPG')).toBe('file:///var/mobile/DCIM/IMG_1234.JPG');
  });

  test('when a uri has a binary-plist fragment from a spatial video, then the fragment is stripped', () => {
    const fragmented =
      'file:///var/mobile/Media/DCIM/104APPLE/IMG_4854.MOV#YnBsaXN0MDDRAQJfEBtSZWNvbW1lbmRlZEZvckltbWVyc2l2ZU1vZGU';
    expect(stripUriFragment(fragmented)).toBe('file:///var/mobile/Media/DCIM/104APPLE/IMG_4854.MOV');
  });

  test('when a ph:// uri is passed, then it is returned unchanged', () => {
    expect(stripUriFragment('ph://ABCD-1234/L0/001')).toBe('ph://ABCD-1234/L0/001');
  });

  test('when a content:// uri is passed, then it is returned unchanged', () => {
    expect(stripUriFragment('content://media/external/images/1234')).toBe('content://media/external/images/1234');
  });
});

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
