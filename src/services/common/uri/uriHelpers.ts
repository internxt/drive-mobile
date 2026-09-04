export const FILE_URI_PREFIX = 'file://';

/**
 * Removes a URL fragment (everything from the first `#`), preserving the scheme and path.
 * A literal `#` inside a path is always percent-encoded as `%23`, so any bare `#` is a
 * fragment delimiter and safe to strip.
 */
export const stripUriFragment = (uri: string): string => {
  const hashIndex = uri.indexOf('#');
  return hashIndex === -1 ? uri : uri.slice(0, hashIndex);
};

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
