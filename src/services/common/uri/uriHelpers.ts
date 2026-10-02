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

const encodePathForUri = (path: string): string => encodeURI(path).replace(/#/g, '%23').replace(/\?/g, '%3F');

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
  return `${FILE_URI_PREFIX}${encodePathForUri(decodeUriSafely(absolutePath))}`;
};

export const stripFileUri = (path: string): string =>
  path.startsWith(FILE_URI_PREFIX) ? decodeURIComponent(path.slice(FILE_URI_PREFIX.length)) : path;

export const decodeUriSafely = (uri: string): string => {
  try {
    return decodeURIComponent(uri);
  } catch {
    return uri;
  }
};

/**
 * Converts a file:// URI to a filesystem path: strips the leading `file://` scheme and
 * percent-decodes the rest. Malformed percent sequences are kept as-is instead of throwing.
 */
export const fileUriToPath = (uri: string): string =>
  decodeUriSafely(uri.startsWith(FILE_URI_PREFIX) ? uri.slice(FILE_URI_PREFIX.length) : uri);
