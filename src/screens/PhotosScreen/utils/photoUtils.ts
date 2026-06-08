import strings from 'assets/lang/strings';
import { TimelinePhotoItem } from '../types';

export const isItemBacked = (item: TimelinePhotoItem): boolean =>
  item.type === 'cloud-only' || (item.type === 'local' && item.backupState === 'backed');

export const isLocalItemNotBacked = (item: TimelinePhotoItem): boolean =>
  item.type === 'local' && item.backupState === 'not-backed';

const isVideo = (item: TimelinePhotoItem): boolean => item.mediaType === 'video';

export const getSavedNotificationMessage = (item: TimelinePhotoItem): string =>
  isVideo(item) ? strings.screens.photos.notifications.videoSaved : strings.screens.photos.notifications.photoSaved;

export const getTrashNotificationMessage = (count: number): string =>
  count === 1
    ? strings.screens.photos.notifications.itemMovedToTrash
    : strings.screens.photos.notifications.itemsMovedToTrash(count);
