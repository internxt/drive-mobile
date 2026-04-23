const SAF_WORD_VOLUME_RE = /^(primary|secondary|home|downloads|raw):/;
const SAF_SHORT_UUID_RE = /^[0-9a-f]{4}-[0-9a-f]{4}:/i;
const SAF_FULL_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i;

export const hasSafVolumePrefix = (safUri: string): boolean =>
  SAF_WORD_VOLUME_RE.test(safUri) || SAF_SHORT_UUID_RE.test(safUri) || SAF_FULL_UUID_RE.test(safUri);

export const stripSafVolumePrefix = (safUri: string): string =>
  safUri.replace(SAF_WORD_VOLUME_RE, '').replace(SAF_SHORT_UUID_RE, '').replace(SAF_FULL_UUID_RE, '');

/**
 * Extracts the display name from a SAF child document URI.
 */
export const getNameFromSafUri = (childUri: string): string => {
  const documentPart = childUri.split('/document/').pop() ?? '';
  const decoded = decodeURIComponent(documentPart);
  const withoutVolume = stripSafVolumePrefix(decoded);
  return withoutVolume.split('/').pop() || withoutVolume;
};

/**
 * Extracts the display name from a SAF tree root URI returned by the directory picker.
 *
 */
export const getSafTreeName = (treeUri: string, fallback: string): string => {
  const decoded = decodeURIComponent(treeUri);
  const rawName = decoded.replace(/\/$/, '').split('/').pop() ?? '';
  return stripSafVolumePrefix(rawName) || fallback;
};
