import * as MediaLibrary from 'expo-media-library';
import { GroupSyncStatus } from '../components/GroupHeader/PhotosGroupHeader';
import { TimelineDateGroup } from '../components/PhotosTimeline';
import { PhotoBackupState, PhotoDateGroup, PhotoItem } from '../types';
import { PhotoSyncStatus } from 'src/store/slices/photos';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const formatVideoDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getDateLabel = (date: Date, now: Date): string => {
  const todayDateString = now.toDateString();
  const yesterDateString = new Date(now.getTime() - MS_PER_DAY).toDateString();

  if (date.toDateString() === todayDateString) return 'Today';
  if (date.toDateString() === yesterDateString) return 'Yesterday';

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }

  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const assetToPhotoItem = (
  asset: MediaLibrary.Asset,
  syncedIds: Set<string>,
  uploadingIdSet: Set<string>,
): PhotoItem => {
  let backupState: PhotoBackupState;
  if (uploadingIdSet.has(asset.id)) {
    backupState = 'uploading';
  } else if (syncedIds.has(asset.id)) {
    backupState = 'backed';
  } else {
    backupState = 'not-backed';
  }

  const isVideo = asset.mediaType === MediaLibrary.MediaType.video;
  return {
    id: asset.id,
    uri: asset.uri,
    backupState,
    mediaType: isVideo ? 'video' : 'photo',
    duration: isVideo ? formatVideoDuration(asset.duration) : undefined,
  };
};

export const groupAssetsByDate = (
  assets: MediaLibrary.Asset[],
  syncedIds: Set<string>,
  uploadingIdSet: Set<string>,
): PhotoDateGroup[] => {
  const now = new Date();
  const groupMap = new Map<string, { label: string; photos: PhotoItem[] }>();

  for (const asset of assets) {
    const date = new Date(asset.creationTime);
    const groupKey = date.toDateString();

    let group = groupMap.get(groupKey);
    if (!group) {
      group = { label: getDateLabel(date, now), photos: [] };
      groupMap.set(groupKey, group);
    }
    group.photos.push(assetToPhotoItem(asset, syncedIds, uploadingIdSet));
  }

  return Array.from(groupMap.entries()).map(([key, { label, photos }]) => ({
    id: key,
    label,
    photos,
  }));
};

export const getGroupSyncStatus = (
  group: PhotoDateGroup,
  syncStatus: PhotoSyncStatus,
  remainingCount: number,
  backupProgress: number | undefined,
): GroupSyncStatus => {
  switch (syncStatus) {
    case 'scanning':
      return { type: 'scanning' };
    case 'uploading':
      return { type: 'uploading', count: remainingCount, backupProgress };
    default:
      return { type: 'count', count: group.photos.length };
  }
};

export type FlatItem =
  | { type: 'header'; id: string; label: string; syncStatus: GroupSyncStatus; count: number; isFirst: boolean }
  | { type: 'photo'; photo: PhotoItem };

export const buildTimelineItems = (groups: TimelineDateGroup[]): { items: FlatItem[]; headerIndices: number[] } => {
  const items: FlatItem[] = [];
  const headerIndices: number[] = [];

  for (const [groupIndex, { group, syncStatus }] of groups.entries()) {
    const currentHeaderIndex = items.length;
    headerIndices.push(currentHeaderIndex);
    items.push({
      type: 'header',
      id: group.id,
      label: group.label,
      syncStatus,
      count: group.photos.length,
      isFirst: groupIndex === 0,
    });
    for (const photo of group.photos) {
      items.push({ type: 'photo', photo });
    }
  }
  return { items, headerIndices };
};
