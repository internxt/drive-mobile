export const wrapNativeCryptoError = (nativeError: unknown): Error =>
  nativeError instanceof Error ? nativeError : new Error(String(nativeError));
