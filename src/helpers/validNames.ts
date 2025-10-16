export function isValidFilename(filename: string) {
  const EXCLUDED = ['..'];
  if (EXCLUDED.includes(filename)) {
    return false;
  }
  // eslint-disable-next-line no-control-regex
  return !/[<>:"/\\|?*\u0000-\u001F]/g.test(filename);
}
