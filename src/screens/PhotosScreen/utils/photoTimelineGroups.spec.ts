import * as MediaLibrary from 'expo-media-library';
import { GroupSyncStatus } from '../components/GroupHeader/PhotosGroupHeader';
import { TimelineDateGroup } from '../components/PhotosTimeline';
import { PhotoDateGroup, PhotoItem } from '../types';
import { CloudAssetEntry } from 'src/services/photos/database/photosLocalDB';
import {
  assetToPhotoItem,
  buildTimelineItems,
  cloudEntryToPhotoItem,
  formatVideoDuration,
  getDateLabel,
  getGroupSyncStatus,
  groupAssetsByDate,
  mergeCloudIntoGroups,
} from './photoTimelineGroups';

jest.mock('expo-media-library', () => ({
  MediaType: { photo: 'photo', video: 'video' },
}));

const makeAsset = (overrides: Partial<MediaLibrary.Asset> = {}): MediaLibrary.Asset =>
  ({
    id: 'asset-1',
    filename: 'photo.jpg',
    uri: 'file:///photo.jpg',
    mediaType: MediaLibrary.MediaType.photo,
    mediaSubtypes: [],
    width: 100,
    height: 100,
    creationTime: new Date('2024-06-15T12:00:00').getTime(),
    modificationTime: new Date('2024-06-15T12:00:00').getTime(),
    duration: 0,
    albumId: undefined,
    ...overrides,
  }) as MediaLibrary.Asset;

const makePhotoItem = (overrides: Partial<PhotoItem> = {}): PhotoItem => ({
  id: 'asset-1',
  type: 'local',
  uri: 'file:///photo.jpg',
  backupState: 'not-backed',
  mediaType: 'photo',
  ...overrides,
});

const makeDateGroup = (overrides: Partial<PhotoDateGroup> = {}): PhotoDateGroup => ({
  id: '2024-06-15',
  label: 'Today',
  photos: [makePhotoItem()],
  ...overrides,
});

const makeTimelineGroup = (
  group: PhotoDateGroup,
  syncStatus: GroupSyncStatus = { type: 'count', count: group.photos.length },
): TimelineDateGroup => ({ group, syncStatus });

describe('formatVideoDuration', () => {
  test('when the video is shorter than a minute, then formats seconds with a zero-padded two-digit field', () => {
    expect(formatVideoDuration(45)).toBe('0:45');
  });

  test('when the video is exactly one minute, then formats as 1:00', () => {
    expect(formatVideoDuration(60)).toBe('1:00');
  });

  test('when the seconds part is a single digit, then pads it with a leading zero', () => {
    expect(formatVideoDuration(65)).toBe('1:05');
  });

  test('when the video is longer than an hour, then shows total minutes without capping at 59', () => {
    expect(formatVideoDuration(3661)).toBe('61:01');
  });

  test('when the duration is zero, then returns 0:00', () => {
    expect(formatVideoDuration(0)).toBe('0:00');
  });
});

describe('getDateLabel', () => {
  const now = new Date('2024-06-15T12:00:00');

  test('when the date is the same day as now, then returns Today', () => {
    expect(getDateLabel(new Date('2024-06-15T08:00:00'), now)).toBe('Today');
  });

  test('when the date is the previous day, then returns Yesterday', () => {
    expect(getDateLabel(new Date('2024-06-14T08:00:00'), now)).toBe('Yesterday');
  });

  test('when the date is in the same year but not today or yesterday, then returns a short month and day', () => {
    const label = getDateLabel(new Date('2024-03-01T12:00:00'), now);
    expect(label).toContain('Mar');
    expect(label).toContain('1');
    expect(label).not.toContain('2024');
  });

  test('when the date is in a different year, then includes the year in the label', () => {
    const label = getDateLabel(new Date('2023-03-01T12:00:00'), now);
    expect(label).toContain('Mar');
    expect(label).toContain('2023');
  });
});

describe('assetToPhotoItem', () => {
  test('when the asset is not synced and not uploading, then its backup state is not-backed', () => {
    const asset = makeAsset();
    const item = assetToPhotoItem(asset, new Set(), new Set());
    expect(item.backupState).toBe('not-backed');
  });

  test('when the asset is in the synced set, then its backup state is backed', () => {
    const asset = makeAsset({ id: 'asset-1' });
    const item = assetToPhotoItem(asset, new Set(['asset-1']), new Set());
    expect(item.backupState).toBe('backed');
  });

  test('when the asset is currently uploading, then its backup state is uploading regardless of synced set', () => {
    const asset = makeAsset({ id: 'asset-1' });
    const item = assetToPhotoItem(asset, new Set(['asset-1']), new Set(['asset-1']));
    expect(item.backupState).toBe('uploading');
  });

  test('when the asset is a photo, then media type is photo and duration is undefined', () => {
    const asset = makeAsset({ mediaType: MediaLibrary.MediaType.photo });
    const item = assetToPhotoItem(asset, new Set(), new Set());
    expect(item.mediaType).toBe('photo');
    expect(item.duration).toBeUndefined();
  });

  test('when the asset is a video, then media type is video and duration is formatted', () => {
    const asset = makeAsset({ mediaType: MediaLibrary.MediaType.video, duration: 125 });
    const item = assetToPhotoItem(asset, new Set(), new Set());
    expect(item.mediaType).toBe('video');
    expect(item.duration).toBe('2:05');
  });
});

describe('groupAssetsByDate', () => {
  test('when all assets are on the same day, then a single group is returned', () => {
    const assets = [
      makeAsset({ id: 'a1', creationTime: new Date('2024-06-15T08:00:00').getTime() }),
      makeAsset({ id: 'a2', creationTime: new Date('2024-06-15T20:00:00').getTime() }),
    ];
    const groups = groupAssetsByDate(assets, new Set(), new Set());
    expect(groups).toHaveLength(1);
    expect(groups[0].photos).toHaveLength(2);
  });

  test('when assets span two different days, then two groups are returned', () => {
    const assets = [
      makeAsset({ id: 'a1', creationTime: new Date('2024-06-15T12:00:00').getTime() }),
      makeAsset({ id: 'a2', creationTime: new Date('2024-06-14T12:00:00').getTime() }),
    ];
    const groups = groupAssetsByDate(assets, new Set(), new Set());
    expect(groups).toHaveLength(2);
  });

  test('when given an empty asset list, then returns no groups', () => {
    expect(groupAssetsByDate([], new Set(), new Set())).toHaveLength(0);
  });

  test('when an asset is synced, then the corresponding photo item has a backed state', () => {
    const asset = makeAsset({ id: 'a1' });
    const groups = groupAssetsByDate([asset], new Set(['a1']), new Set());
    const photo = groups[0].photos[0] as import('../types').PhotoItem;
    expect(photo.backupState).toBe('backed');
  });
});

describe('getGroupSyncStatus', () => {
  const group = makeDateGroup({ photos: [makePhotoItem(), makePhotoItem()] });

  test('when sync status is scanning, then returns a scanning status', () => {
    expect(getGroupSyncStatus(group, 'scanning', 0, undefined)).toEqual({ type: 'scanning' });
  });

  test('when sync status is uploading, then returns uploading with remaining count and progress', () => {
    expect(getGroupSyncStatus(group, 'uploading', 3, 0.5)).toEqual({
      type: 'uploading',
      count: 3,
      backupProgress: 0.5,
    });
  });

  test('when sync status is fetching-cloud, then returns a fetching status', () => {
    expect(getGroupSyncStatus(group, 'fetching-cloud', 0, undefined)).toEqual({ type: 'fetching' });
  });

  test('when sync status is idle, then returns a count equal to the number of photos in the group', () => {
    expect(getGroupSyncStatus(group, 'idle', 0, undefined)).toEqual({ type: 'count', count: 2 });
  });

  test('when sync status is synced, then returns a count equal to the number of photos in the group', () => {
    expect(getGroupSyncStatus(group, 'synced', 0, undefined)).toEqual({ type: 'count', count: 2 });
  });
});

describe('buildTimelineItems', () => {
  test('when a single group with two photos is provided, then three items are produced', () => {
    const group = makeDateGroup({ photos: [makePhotoItem({ id: 'p1' }), makePhotoItem({ id: 'p2' })] });
    const { items } = buildTimelineItems([makeTimelineGroup(group)]);
    expect(items).toHaveLength(3);
    expect(items[0].type).toBe('header');
    expect(items[1].type).toBe('photo');
    expect(items[2].type).toBe('photo');
  });

  test('when a single group is provided, then headerIndices contains only index 0', () => {
    const { headerIndices } = buildTimelineItems([makeTimelineGroup(makeDateGroup())]);
    expect(headerIndices).toEqual([0]);
  });

  test('when two groups are provided, then headerIndices points to the start of each group', () => {
    const group1 = makeDateGroup({ id: 'g1', photos: [makePhotoItem({ id: 'p1' }), makePhotoItem({ id: 'p2' })] });
    const group2 = makeDateGroup({ id: 'g2', photos: [makePhotoItem({ id: 'p3' })] });
    const { items, headerIndices } = buildTimelineItems([makeTimelineGroup(group1), makeTimelineGroup(group2)]);
    expect(headerIndices).toEqual([0, 3]);
    expect(items[3].type).toBe('header');
  });

  test('when multiple groups are provided, then only the first group header has isFirst set to true', () => {
    const groups = [makeDateGroup({ id: 'g1' }), makeDateGroup({ id: 'g2' })].map((g) => makeTimelineGroup(g));
    const { items } = buildTimelineItems(groups);
    const headers = items.filter((i) => i.type === 'header') as Extract<(typeof items)[number], { type: 'header' }>[];
    expect(headers[0].isFirst).toBe(true);
    expect(headers[1].isFirst).toBe(false);
  });

  test('when given an empty group list, then returns no items and no header indices', () => {
    const { items, headerIndices } = buildTimelineItems([]);
    expect(items).toHaveLength(0);
    expect(headerIndices).toHaveLength(0);
  });
});

const makeCloudEntry = (overrides: Partial<CloudAssetEntry> = {}): CloudAssetEntry => ({
  remoteFileId: 'remote-1',
  deviceId: 'device-1',
  createdAt: new Date('2024-06-15T12:00:00').getTime(),
  fileName: 'photo.jpg',
  fileSize: 1024,
  thumbnailPath: null,
  thumbnailBucketId: null,
  thumbnailBucketFile: null,
  thumbnailType: null,
  discoveredAt: Date.now(),
  ...overrides,
});

describe('cloudEntryToPhotoItem', () => {
  test('when the entry has a jpg filename, then media type is photo', () => {
    const item = cloudEntryToPhotoItem(makeCloudEntry({ fileName: 'photo.jpg' }));
    expect(item.mediaType).toBe('photo');
  });

  test('when the entry has a video filename, then media type is video', () => {
    const item = cloudEntryToPhotoItem(makeCloudEntry({ fileName: 'clip.mp4' }));
    expect(item.mediaType).toBe('video');
  });

  test('when the entry has thumbnail data, then it is preserved in the result', () => {
    const item = cloudEntryToPhotoItem(
      makeCloudEntry({ thumbnailPath: '/cache/thumb.jpg', thumbnailBucketId: 'bucket-1', thumbnailBucketFile: 'file-1', thumbnailType: 'jpg' }),
    );
    expect(item.thumbnailPath).toBe('/cache/thumb.jpg');
    expect(item.thumbnailBucketId).toBe('bucket-1');
    expect(item.thumbnailBucketFile).toBe('file-1');
    expect(item.thumbnailType).toBe('jpg');
  });

  test('when converted, then type is cloud-only and id matches the remote file id', () => {
    const item = cloudEntryToPhotoItem(makeCloudEntry({ remoteFileId: 'abc-123' }));
    expect(item.type).toBe('cloud-only');
    expect(item.id).toBe('abc-123');
  });
});

describe('mergeCloudIntoGroups', () => {
  test('when there are no cloud items, then the local groups are returned unchanged', () => {
    const localGroups = [makeDateGroup()];
    const result = mergeCloudIntoGroups(localGroups, []);
    expect(result).toBe(localGroups);
  });

  test('when a cloud item falls on an existing local group date, then it is added to that group', () => {
    const createdAt = new Date('2024-06-15T12:00:00').getTime();
    const localGroups = [makeDateGroup({ id: new Date('2024-06-15T12:00:00').toDateString() })];
    const cloudItem = cloudEntryToPhotoItem(makeCloudEntry({ createdAt }));
    const result = mergeCloudIntoGroups(localGroups, [cloudItem]);
    expect(result[0].photos).toHaveLength(2);
  });

  test('when a cloud item has a date with no matching local group, then a new group is created for it', () => {
    const createdAt = new Date('2024-05-01T12:00:00').getTime();
    const localGroups = [makeDateGroup({ id: new Date('2024-06-15T12:00:00').toDateString() })];
    const cloudItem = cloudEntryToPhotoItem(makeCloudEntry({ createdAt }));
    const result = mergeCloudIntoGroups(localGroups, [cloudItem]);
    expect(result).toHaveLength(2);
  });

  test('when merging groups from different dates, then they are sorted from newest to oldest', () => {
    const olderAt = new Date('2024-05-01T12:00:00').getTime();
    const newerAt = new Date('2024-06-15T12:00:00').getTime();
    const localGroups = [makeDateGroup({ id: new Date(olderAt).toDateString() })];
    const cloudItem = cloudEntryToPhotoItem(makeCloudEntry({ createdAt: newerAt }));
    const result = mergeCloudIntoGroups(localGroups, [cloudItem]);
    expect(new Date(result[0].id).getTime()).toBeGreaterThan(new Date(result[1].id).getTime());
  });
});
