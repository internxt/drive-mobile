// Upload transiently needs ~2x the file size in free space: the pipeline copies
// the file to cache AND writes an encrypted copy. We use 2.2x rather than 2x
// because RNFS.getFSInfo().freeSpace reads slightly higher than actually-usable
// space (reserved blocks), so 2x let a borderline upload slip through on-device.
// Repro: a 493MB file failed at ~965MB free (~1.96x) and succeeded above ~1.1GB
// (~2.23x), so 2.2x sits at the safe edge.
export const UPLOAD_FREE_SPACE_MULTIPLIER = 2.2;

const NATIVE_IO_ERROR_SIGNATURES = [
  'cannot convert argument of type class java.io.ioexception',
  'java.io.ioexception',
  'enospc',
  'no space left',
];

export const isNativeIOError = (error: unknown): boolean => {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return NATIVE_IO_ERROR_SIGNATURES.some((signature) => message.includes(signature));
};
