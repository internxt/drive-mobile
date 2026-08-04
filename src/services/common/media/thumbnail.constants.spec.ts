import { isThumbnailSupported } from './thumbnail.constants';

describe('isThumbnailSupported', () => {
  test('when the extension is a RAW photo format, then it is supported', () => {
    expect(isThumbnailSupported('dng')).toBe(true);
    expect(isThumbnailSupported('DNG')).toBe(true);
  });

  test('when the extension is a common image format, then it is supported', () => {
    expect(isThumbnailSupported('jpg')).toBe(true);
    expect(isThumbnailSupported('png')).toBe(true);
    expect(isThumbnailSupported('heic')).toBe(true);
  });

  test('when the extension has no known thumbnail generator, then it is not supported', () => {
    expect(isThumbnailSupported('zip')).toBe(false);
  });
});
