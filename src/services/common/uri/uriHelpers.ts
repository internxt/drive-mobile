export const FILE_URI_PREFIX = 'file://';

export const toFileUri = (path: string): string => {
  if (path.startsWith(FILE_URI_PREFIX)) return path;
  const absolutePath = path.startsWith('/') ? path : `/${path}`;
  return `${FILE_URI_PREFIX}${encodeURI(decodeUriSafely(absolutePath))}`;
};

export const decodeUriSafely = (uri: string): string => {
  try {
    return decodeURIComponent(uri);
  } catch {
    return uri;
  }
};

export const fromFileUri = (uri: string): string =>
  decodeUriSafely(uri.startsWith(FILE_URI_PREFIX) ? uri.slice(FILE_URI_PREFIX.length) : uri);
