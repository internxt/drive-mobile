const ICLOUD_URI_SCHEME = 'ph://';
const FILE_URI_SCHEME = 'file://';
const ANDROID_CONTENT_URI_SCHEME = 'content://';
const FALLBACK_EXTENSION = 'tmp';

export { ANDROID_CONTENT_URI_SCHEME, ICLOUD_URI_SCHEME };

export const stripFileSchemeAndFragment = (uri: string): string =>
  decodeURIComponent(
    uri.startsWith(FILE_URI_SCHEME) ? uri.slice(FILE_URI_SCHEME.length).split('#')[0] : uri.split('#')[0],
  );

export const stripFileScheme = (uri: string): string =>
  decodeURIComponent(uri.startsWith(FILE_URI_SCHEME) ? uri.slice(FILE_URI_SCHEME.length) : uri);

export const extractExtensionFromContentUri = (uri: string): string => {
  const segment = uri.split('/').pop()?.split('?')[0] ?? '';
  const dotIndex = segment.lastIndexOf('.');
  if (dotIndex < 0) {
    return FALLBACK_EXTENSION;
  }
  return segment.slice(dotIndex + 1) || FALLBACK_EXTENSION;
};

export const splitFileNameAndExtension = (fileName: string): { plainName: string; fileExtension: string } => {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) {
    return { plainName: fileName, fileExtension: '' };
  }
  return { plainName: fileName.slice(0, dotIndex), fileExtension: fileName.slice(dotIndex + 1) };
};
