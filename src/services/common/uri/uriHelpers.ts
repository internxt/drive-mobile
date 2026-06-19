export const FILE_URI_PREFIX = 'file://';

export const toFileUri = (path: string): string => {
  if (path.startsWith(FILE_URI_PREFIX)) return path;
  const absolutePath = path.startsWith('/') ? path : `/${path}`;
  return `${FILE_URI_PREFIX}${encodeURI(decodeURIComponent(absolutePath))}`;
};

export const stripFileUri = (path: string): string =>
  path.startsWith(FILE_URI_PREFIX) ? decodeURIComponent(path.slice(FILE_URI_PREFIX.length)) : path;
