import { decodeUriSafely, fromFileUri } from './uriHelpers';

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
