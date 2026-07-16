import { decodeUriSafely, fromFileUri, toFileUri } from './uriHelpers';

describe('toFileUri', () => {
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
