import { UPLOAD_FREE_SPACE_MULTIPLIER, isNativeIOError } from './deviceStorageErrors';

describe('isNativeIOError', () => {
  const nativeIOSignatures = [
    'Cannot convert argument of type class java.io.IOException',
    'java.io.IOException: write failed',
    'ENOSPC: no space left on device',
    'No space left on device',
  ];

  test.each(nativeIOSignatures)(
    'when the error is a native IOException/ENOSPC (%s), then isNativeIOError recognizes it',
    (signature) => {
      expect(isNativeIOError(new Error(signature))).toBe(true);
      expect(isNativeIOError(signature)).toBe(true);
    },
  );

  test('when the signature casing differs, then isNativeIOError still recognizes it', () => {
    expect(isNativeIOError(new Error('WRITE FAILED: JAVA.IO.IOEXCEPTION'))).toBe(true);
  });

  test('when the error is a normal network error, then isNativeIOError is false', () => {
    expect(isNativeIOError(new Error('Network request failed'))).toBe(false);
    expect(isNativeIOError({ status: 500, message: 'Internal Server Error' })).toBe(false);
    expect(isNativeIOError(null)).toBe(false);
  });
});

describe('UPLOAD_FREE_SPACE_MULTIPLIER', () => {
  test('when reserving space for an upload, then it requires ~2.2x the file size', () => {
    expect(UPLOAD_FREE_SPACE_MULTIPLIER).toBe(2.2);
  });
});
