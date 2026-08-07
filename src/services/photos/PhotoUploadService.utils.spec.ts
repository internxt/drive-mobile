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

  test('when the URI is a Live Photo photo component written to the app temp directory, then it returns the raw path', () => {
    expect(
      stripFileSchemeAndFragment(
        'file:///private/var/mobile/Containers/Data/Application/1B1254D9-CBD8-4CA4-AF75-2BB779DA86D5/tmp/597F1AAF-B2A5-418F-8FCB-5D82CBC92C2E.heic',
      ),
    ).toBe(
      '/private/var/mobile/Containers/Data/Application/1B1254D9-CBD8-4CA4-AF75-2BB779DA86D5/tmp/597F1AAF-B2A5-418F-8FCB-5D82CBC92C2E.heic',
    );
  });

  test('when the URI is a Live Photo paired video component with a time fragment, then it strips the fragment', () => {
    expect(
      stripFileSchemeAndFragment(
        'file:///private/var/mobile/Containers/Data/Application/1B1254D9-CBD8-4CA4-AF75-2BB779DA86D5/tmp/4E8A1155-3CCF-4D92-83FF-4F7B58770A79.mov#t=0.0',
      ),
    ).toBe(
      '/private/var/mobile/Containers/Data/Application/1B1254D9-CBD8-4CA4-AF75-2BB779DA86D5/tmp/4E8A1155-3CCF-4D92-83FF-4F7B58770A79.mov',
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

  test('when the extension contains a percent-encoded dot, then it decodes it', () => {
    expect(stripFileScheme('file:///downloads/photo.jpg%2Epng')).toBe('/downloads/photo.jpg.png');
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

  test('when the Live Photo photo component filename has an uppercase extension, then it splits correctly', () => {
    expect(splitFileNameAndExtension('IMG_4747.HEIC')).toEqual({ plainName: 'IMG_4747', fileExtension: 'HEIC' });
  });

  test('when the Live Photo paired video filename has an uppercase extension, then it splits correctly', () => {
    expect(splitFileNameAndExtension('IMG_4747.MOV')).toEqual({ plainName: 'IMG_4747', fileExtension: 'MOV' });
  });

  test('when the paired video drive filename includes the livephoto suffix and an uppercase extension, then it splits at the last dot', () => {
    expect(splitFileNameAndExtension('IMG_4747.livephoto.MOV')).toEqual({
      plainName: 'IMG_4747.livephoto',
      fileExtension: 'MOV',
    });
  });

  test('when the photo filename contains a UUID as Apple writes to the temp directory, then it splits correctly', () => {
    expect(splitFileNameAndExtension('597F1AAF-B2A5-418F-8FCB-5D82CBC92C2E.heic')).toEqual({
      plainName: '597F1AAF-B2A5-418F-8FCB-5D82CBC92C2E',
      fileExtension: 'heic',
    });
  });
});
