import { TimelinePhotoItem } from '../types';

export const isItemBacked = (item: TimelinePhotoItem): boolean =>
  item.type === 'cloud-only' || (item.type === 'local' && item.backupState === 'backed');

export const isLocalItemNotBacked = (item: TimelinePhotoItem): boolean =>
  item.type === 'local' && item.backupState === 'not-backed';
