import { decodeUriSafely, fromFileUri, stripFileUri, stripUriFragment, toFileUri } from './uriHelpers';

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

  test('when the file name contains a literal percent sign, then it returns a usable uri instead of failing', () => {
    const pathWithLiteralPercent = '/cache/Nómina 100% final.pdf';

    const result = toFileUri(pathWithLiteralPercent);

    expect(result).toBe('file:///cache/N%C3%B3mina%20100%25%20final.pdf');
  });

  test('when the path is already percent-encoded, then it returns the same uri without encoding it twice', () => {
    const encodedPath = '/cache/N%C3%B3mina%2026_04.pdf';

    const result = toFileUri(encodedPath);

    expect(result).toBe('file:///cache/N%C3%B3mina%2026_04.pdf');
  });

  test('when the path has accents and spaces, then it returns the encoded uri', () => {
    const pathWithAccents = '/cache/Nómina 26_04.pdf';

    const result = toFileUri(pathWithAccents);

    expect(result).toBe('file:///cache/N%C3%B3mina%2026_04.pdf');
  });

  test('when the path has no characters to encode, then it returns the path with the scheme', () => {
    const plainPath = '/cache/plain.pdf';

    const result = toFileUri(plainPath);

    expect(result).toBe('file:///cache/plain.pdf');
  });

  test('when the path already has the scheme, then it returns it unchanged', () => {
    const fileUri = 'file:///cache/already.pdf';

    const result = toFileUri(fileUri);

    expect(result).toBe(fileUri);
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

describe('fromFileUri', () => {
  test('when the uri is percent-encoded with accents and spaces, then it returns the decoded path without the scheme', () => {
    const encodedUri = 'file:///cache/abc/N%C3%B3mina%2026_04.pdf';

    const result = fromFileUri(encodedUri);

    expect(result).toBe('/cache/abc/Nómina 26_04.pdf');
  });

  test('when the uri has no scheme, then it returns the decoded path unchanged', () => {
    const plainPath = '/cache/abc/invoice.pdf';

    const result = fromFileUri(plainPath);

    expect(result).toBe(plainPath);
  });

  test('when the uri has a malformed percent sequence, then it returns the undecoded path without the scheme', () => {
    const malformedUri = 'file:///cache/100%discount.pdf';

    const result = fromFileUri(malformedUri);

    expect(result).toBe('/cache/100%discount.pdf');
  });

  test('when the path contains the scheme beyond the start, then only the leading scheme is removed', () => {
    const nestedUri = 'file:///cache/file:///nested.pdf';

    const result = fromFileUri(nestedUri);

    expect(result).toBe('/cache/file:///nested.pdf');
  });
});

describe('decodeUriSafely', () => {
  test('when the uri is percent-encoded, then it returns the decoded value keeping the scheme', () => {
    const encodedUri = 'file:///cache/abc/N%C3%B3mina%2026_04.pdf';

    const result = decodeUriSafely(encodedUri);

    expect(result).toBe('file:///cache/abc/Nómina 26_04.pdf');
  });

  test('when the uri has a malformed percent sequence, then it returns the original value', () => {
    const malformedUri = 'file:///cache/abc/100%discount.pdf';

    const result = decodeUriSafely(malformedUri);

    expect(result).toBe(malformedUri);
  });
});
