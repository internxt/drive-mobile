import * as MediaLibrary from 'expo-media-library';
import { isVideoExtension } from 'src/services/drive/file/utils/exifHelpers';
import { CloudAssetEntry } from 'src/services/photos/database/photosLocalDB';
import { PhotoSyncStatus } from 'src/store/slices/photos';
import { GroupSyncStatus } from '../components/GroupHeader/PhotosGroupHeader';
import { TimelineDateGroup } from '../components/PhotosTimeline';
import { CloudPhotoItem, PhotoBackupState, PhotoDateGroup, PhotoItem, TimelinePhotoItem } from '../types';

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
    type: 'local',
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
    case 'fetching-cloud':
      return { type: 'fetching' };
    default:
      return { type: 'count', count: group.photos.length };
  }
};

export const cloudEntryToPhotoItem = (entry: CloudAssetEntry): CloudPhotoItem => ({
  id: entry.remoteFileId,
  type: 'cloud-only',
  mediaType: isVideoExtension(entry.fileName.split('.').pop() ?? '') ? 'video' : 'photo',
  thumbnailPath: entry.thumbnailPath,
  thumbnailBucketId: entry.thumbnailBucketId,
  thumbnailBucketFile: entry.thumbnailBucketFile,
  thumbnailType: entry.thumbnailType,
  deviceId: entry.deviceId,
  createdAt: entry.createdAt,
  fileName: entry.fileName,
});

export const mergeCloudIntoGroups = (localGroups: PhotoDateGroup[], cloudItems: CloudPhotoItem[]): PhotoDateGroup[] => {
  if (cloudItems.length === 0) return localGroups;

  const now = new Date();
  const groupMap = new Map<string, PhotoDateGroup>(localGroups.map((g) => [g.id, { ...g, photos: [...g.photos] }]));

  for (const item of cloudItems) {
    const date = new Date(item.createdAt);
    const key = date.toDateString();
    let group = groupMap.get(key);
    if (!group) {
      group = { id: key, label: getDateLabel(date, now), photos: [] };
      groupMap.set(key, group);
    }
    group.photos.push(item);
  }

  return Array.from(groupMap.values()).sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());
};

export type FlatItem =
  | { type: 'header'; id: string; label: string; syncStatus: GroupSyncStatus; count: number; isFirst: boolean }
  | { type: 'photo'; photo: TimelinePhotoItem };

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
