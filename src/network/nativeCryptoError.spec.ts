import { wrapNativeCryptoError } from './nativeCryptoError';

describe('Reporting a native encryption error', () => {
  test('when the native side reports the error as text, then it becomes an error with that message', () => {
    const wrappedError = wrapNativeCryptoError('/tmp/file.enc: open failed: ENOENT');

    expect(wrappedError).toBeInstanceOf(Error);
    expect(wrappedError.message).toBe('/tmp/file.enc: open failed: ENOENT');
  });

  test('when the native side already reports an error, then that same error is kept', () => {
    const nativeError = new Error('Hash mismatch');

    expect(wrapNativeCryptoError(nativeError)).toBe(nativeError);
  });
});
