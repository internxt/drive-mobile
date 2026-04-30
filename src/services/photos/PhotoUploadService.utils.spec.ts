import {
  extractExtensionFromContentUri,
  splitFileNameAndExtension,
  stripFileScheme,
  stripFileSchemeAndFragment,
} from './PhotoUploadService.utils';

describe('stripFileSchemeAndFragment', () => {
  test('when a file URI has no fragment, then it returns the decoded path', () => {
    expect(stripFileSchemeAndFragment('file:///var/mobile/Media/DCIM/photo.jpg')).toBe(
      '/var/mobile/Media/DCIM/photo.jpg',
    );
  });

  test('when a video URI has an iOS metadata fragment, then it strips the fragment', () => {
    expect(stripFileSchemeAndFragment('file:///var/mobile/Media/DCIM/video.mov#t=0.0')).toBe(
      '/var/mobile/Media/DCIM/video.mov',
    );
  });

  test('when the path contains percent-encoded characters, then it decodes them', () => {
    expect(stripFileSchemeAndFragment('file:///var/mobile/My%20Photos/photo.jpg')).toBe(
      '/var/mobile/My Photos/photo.jpg',
    );
  });
});

describe('stripFileScheme', () => {
  test('when a file URI is provided, then it returns the decoded path without the scheme', () => {
    expect(stripFileScheme('file:///data/user/0/com.app/photo.jpg')).toBe('/data/user/0/com.app/photo.jpg');
  });

  test('when the path contains percent-encoded characters, then it decodes them', () => {
    expect(stripFileScheme('file:///data/My%20Camera/photo.jpg')).toBe('/data/My Camera/photo.jpg');
  });

  test('when a plain path without scheme is provided, then it returns it unchanged', () => {
    expect(stripFileScheme('/data/user/0/com.app/photo.jpg')).toBe('/data/user/0/com.app/photo.jpg');
  });
});

describe('extractExtensionFromContentUri', () => {
  test('when a standard content URI with an extension is provided, then it returns the extension', () => {
    expect(extractExtensionFromContentUri('content://media/external/images/media/12345.jpg')).toBe('jpg');
  });

  test('when the URI has a query string after the extension, then it returns the extension without the query', () => {
    expect(extractExtensionFromContentUri('content://media/external/images/media/photo.jpg?size=large')).toBe('jpg');
  });

  test('when the URI has no extension, then it falls back to tmp', () => {
    expect(extractExtensionFromContentUri('content://media/external/images/media/12345')).toBe('tmp');
  });

  test('when the URI has no path segments, then it falls back to tmp', () => {
    expect(extractExtensionFromContentUri('content://')).toBe('tmp');
  });
});

describe('splitFileNameAndExtension', () => {
  test('when a filename with an extension is provided, then it splits correctly', () => {
    expect(splitFileNameAndExtension('photo.jpg')).toEqual({ plainName: 'photo', fileExtension: 'jpg' });
  });

  test('when a filename has multiple dots, then it uses the last dot as the separator', () => {
    expect(splitFileNameAndExtension('my.vacation.photo.jpg')).toEqual({
      plainName: 'my.vacation.photo',
      fileExtension: 'jpg',
    });
  });

  test('when a filename has no extension, then it returns the full name and an empty extension', () => {
    expect(splitFileNameAndExtension('photo')).toEqual({ plainName: 'photo', fileExtension: '' });
  });

  test('when a filename starts with a dot and has no other dots, then it returns the full name and an empty extension', () => {
    expect(splitFileNameAndExtension('.hidden')).toEqual({ plainName: '', fileExtension: 'hidden' });
  });
});
