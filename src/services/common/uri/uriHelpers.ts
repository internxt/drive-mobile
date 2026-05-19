export const FILE_URI_PREFIX = 'file://';

export const toFileUri = (path: string): string =>
  path.startsWith(FILE_URI_PREFIX) ? path : `${FILE_URI_PREFIX}${path}`;

export const stripFileUri = (path: string): string =>
  path.startsWith(FILE_URI_PREFIX) ? decodeURIComponent(path.slice(FILE_URI_PREFIX.length)) : path;
