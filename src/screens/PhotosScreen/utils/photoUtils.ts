import strings from 'assets/lang/strings';
import { Platform } from 'react-native';
import { FILE_URI_PREFIX } from 'src/services/common/uri/uriHelpers';
import { TimelinePhotoItem } from '../types';

const THUMBNAIL_VERSION_PARAM = 'v';

export interface ThumbnailSource {
  uri: string;
  cacheKey?: string;
}

export const isItemBacked = (item: TimelinePhotoItem): boolean =>
  item.type === 'cloud-only' || (item.type === 'local' && item.backupState === 'backed');

export const isLocalItemNotBacked = (item: TimelinePhotoItem): boolean =>
  item.type === 'local' && item.backupState === 'not-backed';

export const isItemCloudDeleted = (item: TimelinePhotoItem): boolean =>
  item.type === 'local' && item.backupState === 'cloud-deleted';

export const isItemSelectable = (item: TimelinePhotoItem): boolean => !isItemCloudDeleted(item);

/**
 * Image source for a thumbnail. Local items get a cache key that changes when the asset is modified. On Android,
 * expo-image ignores the cache key for local files, so a `file://` URI also gets the modification time as a query.
 */
export const getThumbnailSource = (item: TimelinePhotoItem, uri: string): ThumbnailSource => {
  if (item.type !== 'local') {
    return { uri };
  }
  const cacheKey = `${item.id}-${item.modificationTime}`;
  const isAndroidFileUri = Platform.OS === 'android' && uri.startsWith(FILE_URI_PREFIX);
  if (!isAndroidFileUri) {
    return { uri, cacheKey };
  }
  return { uri: `${uri}?${THUMBNAIL_VERSION_PARAM}=${item.modificationTime}`, cacheKey };
};

const isVideo = (item: TimelinePhotoItem): boolean => item.mediaType === 'video';

export const getSavedNotificationMessage = (item: TimelinePhotoItem): string =>
  isVideo(item) ? strings.screens.photos.notifications.videoSaved : strings.screens.photos.notifications.photoSaved;

export const getTrashNotificationMessage = (count: number): string =>
  count === 1
    ? strings.screens.photos.notifications.itemMovedToTrash
    : strings.screens.photos.notifications.itemsMovedToTrash(count);
