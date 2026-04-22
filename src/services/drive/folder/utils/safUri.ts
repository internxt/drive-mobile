// Matches SAF storage volume prefixes
export const SAF_VOLUME_PREFIX_RE =
  /^(primary|secondary|home|downloads|raw|[0-9a-f]{4}-[0-9a-f]{4}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):/i;

/**
 * Extracts the display name from a SAF child document URI.
 */
export const getNameFromSafUri = (childUri: string): string => {
  const documentPart = childUri.split('/document/').pop() ?? '';
  const decoded = decodeURIComponent(documentPart);
  const withoutVolume = decoded.replace(SAF_VOLUME_PREFIX_RE, '');
  return withoutVolume.split('/').pop() || withoutVolume;
};

/**
 * Extracts the display name from a SAF tree root URI returned by the directory picker.
 *
 */
export const getSafTreeName = (treeUri: string, fallback: string): string => {
  const decoded = decodeURIComponent(treeUri);
  const rawName = decoded.replace(/\/$/, '').split('/').pop() ?? '';
  return rawName.replace(SAF_VOLUME_PREFIX_RE, '') || fallback;
};
