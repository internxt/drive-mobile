export const FILE_URI_PREFIX = 'file://';

/**
 * Converts a raw filesystem path to a file:// URI.
 * If the input already has any URI scheme (file://, ph://, content://, https://, …)
 * it is returned unchanged — callers can pass any path or URI safely.
 */
export const toFileUri = (path: string): string => {
  if (path.includes('://')) {
    return path;
  }
  const absolutePath = path.startsWith('/') ? path : `/${path}`;
  return `${FILE_URI_PREFIX}${encodeURI(decodeURIComponent(absolutePath))}`;
};

export const stripFileUri = (path: string): string =>
  path.startsWith(FILE_URI_PREFIX) ? decodeURIComponent(path.slice(FILE_URI_PREFIX.length)) : path;
