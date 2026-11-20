import * as MediaLibrary from 'expo-media-library/legacy';
import { CloudAssetEntry } from 'src/services/photos/database/photosLocalDB';
import { GroupSyncStatus } from '../components/GroupHeader/PhotosGroupHeader';
import { TimelineDateGroup } from '../components/PhotosTimeline';
import { PhotoDateGroup, PhotoItem } from '../types';
import {
  GroupBoundary,
  assetToPhotoItem,
  buildFlatTimeline,
  cloudEntryToPhotoItem,
  filterCloudItemsAfterDayOf,
  findGroupForIndex,
  formatVideoDuration,
  getWithheldPhotoPositions,
  getDateLabel,
  getGroupSyncStatus,
  groupAssetsByDate,
  mergeCloudIntoGroups,
  withholdPhotosInsertedAbove,
} from './photoTimelineGroups';

jest.mock('expo-media-library/legacy', () => ({
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
  createdAt: new Date('2024-06-15T12:00:00').getTime(),
  modificationTime: new Date('2024-06-15T12:00:00').getTime(),
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

describe('video duration formatter', () => {
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

describe('date label formatting', () => {
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

describe('local asset to photo item conversion', () => {
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

  test('when a device asset is converted to a timeline item, then its modification time is carried over', () => {
    const asset = makeAsset({ modificationTime: new Date('2024-07-01T09:30:00').getTime() });
    const item = assetToPhotoItem(asset, new Set(), new Set());
    expect(item.modificationTime).toBe(new Date('2024-07-01T09:30:00').getTime());
  });

  test('when the asset is in the cloud-deleted set, then its backup state is cloud-deleted', () => {
    const asset = makeAsset({ id: 'asset-1' });
    const item = assetToPhotoItem(asset, new Set(), new Set(), undefined, undefined, new Set(['asset-1']));
    expect(item.backupState).toBe('cloud-deleted');
  });

  test('when the asset is both synced and cloud-deleted, then synced takes priority', () => {
    const asset = makeAsset({ id: 'asset-1' });
    const item = assetToPhotoItem(
      asset,
      new Set(['asset-1']),
      new Set(),
      undefined,
      undefined,
      new Set(['asset-1']),
    );
    expect(item.backupState).toBe('backed');
  });

  test('when the asset is both uploading and cloud-deleted, then uploading takes priority', () => {
    const asset = makeAsset({ id: 'asset-1' });
    const item = assetToPhotoItem(
      asset,
      new Set(),
      new Set(['asset-1']),
      undefined,
      undefined,
      new Set(['asset-1']),
    );
    expect(item.backupState).toBe('uploading');
  });
});

describe('grouping assets by date', () => {
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
    const photo = groups[0].photos[0] as PhotoItem;
    expect(photo.backupState).toBe('backed');
  });

  test('when an asset is cloud-deleted, then the corresponding photo item has a cloud-deleted state', () => {
    const asset = makeAsset({ id: 'a1' });
    const groups = groupAssetsByDate([asset], new Set(), new Set(), undefined, undefined, new Set(['a1']));
    const photo = groups[0].photos[0] as PhotoItem;
    expect(photo.backupState).toBe('cloud-deleted');
  });
});

describe('group sync status', () => {
  const group = makeDateGroup({ photos: [makePhotoItem(), makePhotoItem()] });

  test('when sync status is scanning, then returns a scanning status', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'scanning',
        remainingCount: 0,
        backupProgress: undefined,
        isFetchingCloudHistory: false,
        isPaused: false,
        disabledReason: null,
        assetUploadErroredCount: 0,
      }),
    ).toEqual({ type: 'scanning' });
  });

  test('when sync status is uploading, then returns uploading with remaining count and progress', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'uploading',
        remainingCount: 3,
        backupProgress: 0.5,
        isFetchingCloudHistory: false,
        isPaused: false,
        disabledReason: null,
        assetUploadErroredCount: 0,
      }),
    ).toEqual({
      type: 'uploading',
      count: 3,
      backupProgress: 0.5,
    });
  });

  test('when isFetchingCloudHistory is true and sync status is idle, then returns a fetching status', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'idle',
        remainingCount: 0,
        backupProgress: undefined,
        isFetchingCloudHistory: true,
        isPaused: false,
        disabledReason: null,
        assetUploadErroredCount: 0,
      }),
    ).toEqual({ type: 'fetching' });
  });

  test('when sync status is idle, then returns a count equal to the number of photos in the group', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'idle',
        remainingCount: 0,
        backupProgress: undefined,
        isFetchingCloudHistory: false,
        isPaused: false,
        disabledReason: null,
        assetUploadErroredCount: 0,
      }),
    ).toEqual({ type: 'count', count: 2 });
  });

  test('when sync status is synced and cloud history is not fetching, then returns completed status', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'synced',
        remainingCount: 0,
        backupProgress: undefined,
        isFetchingCloudHistory: false,
        isPaused: false,
        disabledReason: null,
        assetUploadErroredCount: 0,
      }),
    ).toEqual({ type: 'completed' });
  });

  test('when sync status is synced and cloud history is fetching, then returns fetching status', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'synced',
        remainingCount: 0,
        backupProgress: undefined,
        isFetchingCloudHistory: true,
        isPaused: false,
        disabledReason: null,
        assetUploadErroredCount: 0,
      }),
    ).toEqual({ type: 'fetching' });
  });

  test('when sync status is paused, then returns paused status with remaining count', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'paused',
        remainingCount: 5,
        backupProgress: undefined,
        isFetchingCloudHistory: false,
        isPaused: false,
        disabledReason: null,
        assetUploadErroredCount: 0,
      }),
    ).toEqual({ type: 'paused', count: 5 });
  });

  test('when the backup is paused and sync status is idle, then returns paused regardless of sync status', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'idle',
        remainingCount: 5,
        backupProgress: undefined,
        isFetchingCloudHistory: false,
        isPaused: true,
        disabledReason: null,
        assetUploadErroredCount: 0,
      }),
    ).toEqual({ type: 'paused', count: 5 });
  });

  test('when the backup is paused and sync status is scanning, then returns paused regardless of sync status', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'scanning',
        remainingCount: 5,
        backupProgress: undefined,
        isFetchingCloudHistory: false,
        isPaused: true,
        disabledReason: null,
        assetUploadErroredCount: 0,
      }),
    ).toEqual({ type: 'paused', count: 5 });
  });

  test('when the backup is paused and sync status is pausing, then returns pausing', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'pausing',
        remainingCount: 5,
        backupProgress: undefined,
        isFetchingCloudHistory: false,
        isPaused: true,
        disabledReason: null,
        assetUploadErroredCount: 0,
      }),
    ).toEqual({ type: 'pausing' });
  });

  test('when the backup is paused and cloud history is fetching, then paused takes priority over fetching', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'idle',
        remainingCount: 5,
        backupProgress: undefined,
        isFetchingCloudHistory: true,
        isPaused: true,
        disabledReason: null,
        assetUploadErroredCount: 0,
      }),
    ).toEqual({ type: 'paused', count: 5 });
  });

  test('when storage is full, then returns storage full status regardless of sync status', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'uploading',
        remainingCount: 3,
        backupProgress: 0.5,
        isFetchingCloudHistory: false,
        isPaused: false,
        disabledReason: 'quota-exceeded',
        assetUploadErroredCount: 0,
      }),
    ).toEqual({ type: 'paused-storage-full' });
  });

  test('when storage is full and backup is also manually paused, then storage full status takes priority', () => {
    expect(
      getGroupSyncStatus({
        group,
        syncStatus: 'paused',
        remainingCount: 5,
        backupProgress: undefined,
        isFetchingCloudHistory: false,
        isPaused: true,
        disabledReason: 'quota-exceeded',
        assetUploadErroredCount: 0,
      }),
    ).toEqual({ type: 'paused-storage-full' });
  });
});

describe('building flat photo timeline', () => {
  test('when a single group with two photos is provided, then photos contains those two photos and one boundary', () => {
    const group = makeDateGroup({ id: 'g1', label: 'Today', photos: [makePhotoItem({ id: 'p1' }), makePhotoItem({ id: 'p2' })] });
    const { photos, boundaries } = buildFlatTimeline([makeTimelineGroup(group)]);
    expect(photos).toHaveLength(2);
    expect(photos[0].id).toBe('p1');
    expect(photos[1].id).toBe('p2');
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0]).toMatchObject({ startIndex: 0, id: 'g1', label: 'Today' });
  });

  test('when two groups are provided, then photos are concatenated and boundaries point to the correct start indices', () => {
    const group1 = makeDateGroup({ id: 'g1', photos: [makePhotoItem({ id: 'p1' }), makePhotoItem({ id: 'p2' })] });
    const group2 = makeDateGroup({ id: 'g2', photos: [makePhotoItem({ id: 'p3' })] });
    const { photos, boundaries } = buildFlatTimeline([makeTimelineGroup(group1), makeTimelineGroup(group2)]);
    expect(photos).toHaveLength(3);
    expect(boundaries[0].startIndex).toBe(0);
    expect(boundaries[1].startIndex).toBe(2);
    expect(boundaries[1].id).toBe('g2');
  });

  test('when given an empty group list, then photos and boundaries are both empty', () => {
    const { photos, boundaries } = buildFlatTimeline([]);
    expect(photos).toHaveLength(0);
    expect(boundaries).toHaveLength(0);
  });

  test('when a group has a sync status, then the boundary carries that sync status', () => {
    const group = makeDateGroup({ id: 'g1', photos: [makePhotoItem({})] });
    const syncStatus: GroupSyncStatus = { type: 'uploading', count: 3 };
    const { boundaries } = buildFlatTimeline([{ group, syncStatus }]);
    expect(boundaries[0].syncStatus).toEqual(syncStatus);
  });
});

const makeCloudEntry = (overrides: Partial<CloudAssetEntry> = {}): CloudAssetEntry => ({
  remoteFileId: 'remote-1',
  deviceId: 'device-1',
  folderDate: new Date('2024-06-15T12:00:00').getTime(),
  uploadedAt: new Date('2024-06-15T12:00:00').getTime(),
  isFavorite: false,
  fileName: 'photo.jpg',
  fileSize: 1024,
  fileId: null,
  thumbnailPath: null,
  thumbnailBucketId: null,
  thumbnailBucketFile: null,
  thumbnailType: null,
  discoveredAt: Date.now(),
  ...overrides,
});

describe('cloud entry to photo item conversion', () => {
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
      makeCloudEntry({
        thumbnailPath: '/cache/thumb.jpg',
        thumbnailBucketId: 'bucket-1',
        thumbnailBucketFile: 'file-1',
        thumbnailType: 'jpg',
      }),
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

describe('finding the group that owns a given flat index', () => {
  const makeBoundary = (startIndex: number, id: string): GroupBoundary => ({
    startIndex,
    id,
    label: id,
    syncStatus: { type: 'count', count: 1 },
  });

  test('when boundaries is empty, then returns undefined', () => {
    expect(findGroupForIndex([], 0)).toBeUndefined();
  });

  test('when index falls within the only group, then that group is returned', () => {
    const b = makeBoundary(0, 'day-a');
    expect(findGroupForIndex([b], 5)).toEqual(b);
  });

  test('when index is exactly at the start of a group, then that group is returned', () => {
    const a = makeBoundary(0, 'day-a');
    const b = makeBoundary(3, 'day-b');
    expect(findGroupForIndex([a, b], 3)).toEqual(b);
  });

  test('when index is one before a boundary, then the preceding group is returned', () => {
    const a = makeBoundary(0, 'day-a');
    const b = makeBoundary(3, 'day-b');
    expect(findGroupForIndex([a, b], 2)).toEqual(a);
  });

  test('when index falls within a middle group, then that group is returned', () => {
    const a = makeBoundary(0, 'day-a');
    const b = makeBoundary(3, 'day-b');
    const c = makeBoundary(7, 'day-c');
    expect(findGroupForIndex([a, b, c], 5)).toEqual(b);
  });

  test('when index is in the last group, then the last group is returned', () => {
    const a = makeBoundary(0, 'day-a');
    const b = makeBoundary(3, 'day-b');
    const c = makeBoundary(7, 'day-c');
    expect(findGroupForIndex([a, b, c], 10)).toEqual(c);
  });
});

describe('merging cloud items into local groups', () => {
  test('when there are no cloud items, then the local groups are returned unchanged', () => {
    const localGroups = [makeDateGroup()];
    const result = mergeCloudIntoGroups(localGroups, []);
    expect(result).toBe(localGroups);
  });

  test('when a cloud item falls on an existing local group date, then it is added to that group', () => {
    const folderDate = new Date('2024-06-15T12:00:00').getTime();
    const localGroups = [makeDateGroup({ id: new Date('2024-06-15T12:00:00').toDateString() })];
    const cloudItem = cloudEntryToPhotoItem(makeCloudEntry({ folderDate }));
    const result = mergeCloudIntoGroups(localGroups, [cloudItem]);
    expect(result[0].photos).toHaveLength(2);
  });

  test('when a cloud item has a date with no matching local group, then a new group is created for it', () => {
    const folderDate = new Date('2024-05-01T12:00:00').getTime();
    const localGroups = [makeDateGroup({ id: new Date('2024-06-15T12:00:00').toDateString() })];
    const cloudItem = cloudEntryToPhotoItem(makeCloudEntry({ folderDate }));
    const result = mergeCloudIntoGroups(localGroups, [cloudItem]);
    expect(result).toHaveLength(2);
  });

  test('when merging groups from different dates, then they are sorted from newest to oldest', () => {
    const olderAt = new Date('2024-05-01T12:00:00').getTime();
    const newerAt = new Date('2024-06-15T12:00:00').getTime();
    const localGroups = [makeDateGroup({ id: new Date(olderAt).toDateString() })];
    const cloudItem = cloudEntryToPhotoItem(makeCloudEntry({ folderDate: newerAt }));
    const result = mergeCloudIntoGroups(localGroups, [cloudItem]);
    expect(new Date(result[0].id).getTime()).toBeGreaterThan(new Date(result[1].id).getTime());
  });
});

describe('keeping cloud items from the days after a given day', () => {
  const dayStart = new Date('2024-06-15T00:00:00').getTime();
  const nextDayStart = new Date('2024-06-16T00:00:00').getTime();

  test('when a cloud photo is from a later day, then it is kept', () => {
    const laterItem = cloudEntryToPhotoItem(
      makeCloudEntry({ remoteFileId: 'later', folderDate: new Date('2024-07-01T12:00:00').getTime() }),
    );

    const keptItems = filterCloudItemsAfterDayOf([laterItem], dayStart + 20 * 60 * 60 * 1000);

    expect(keptItems.map((item) => item.id)).toEqual(['later']);
  });

  test('when a cloud photo is from the same day or an earlier one, then it is left out', () => {
    const sameDayItem = cloudEntryToPhotoItem(
      makeCloudEntry({ remoteFileId: 'same-day', folderDate: new Date('2024-06-15T01:00:00').getTime() }),
    );
    const earlierItem = cloudEntryToPhotoItem(
      makeCloudEntry({ remoteFileId: 'earlier', folderDate: new Date('2024-06-14T23:00:00').getTime() }),
    );

    expect(filterCloudItemsAfterDayOf([sameDayItem, earlierItem], dayStart + 20 * 60 * 60 * 1000)).toEqual([]);
  });

  test('when cloud photos fall right before or at the start of the next day, then only the one in the next day is kept', () => {
    const lastMomentOfDay = cloudEntryToPhotoItem(
      makeCloudEntry({ remoteFileId: 'end-of-day', folderDate: nextDayStart - 1 }),
    );
    const firstMomentOfNextDay = cloudEntryToPhotoItem(
      makeCloudEntry({ remoteFileId: 'next-day', folderDate: nextDayStart }),
    );

    const keptItems = filterCloudItemsAfterDayOf([lastMomentOfDay, firstMomentOfNextDay], dayStart);

    expect(keptItems.map((item) => item.id)).toEqual(['next-day']);
  });
});

describe('holding back photos inserted above the visible ones', () => {
  const photoWithId = (id: string) => makePhotoItem({ id });
  const groupWithPhotos = (id: string, photoIds: string[]) =>
    makeTimelineGroup(makeDateGroup({ id, photos: photoIds.map(photoWithId) }));
  const collectPhotoIds = (groups: TimelineDateGroup[]) =>
    groups.flatMap((timelineGroup) => timelineGroup.group.photos.map((photo) => photo.id));

  test('when a new photo arrives above the first visible photo, then it is held back', () => {
    const groups = [groupWithPhotos('day-1', ['a', 'new', 'b']), groupWithPhotos('day-2', ['c'])];

    const keptGroups = withholdPhotosInsertedAbove({
      groups,
      displayedPhotoIds: new Set(['a', 'b', 'c']),
      firstVisiblePhotoId: 'c',
    });

    expect(collectPhotoIds(keptGroups)).toEqual(['a', 'b', 'c']);
  });

  test('when a new photo arrives below the first visible photo, then it is shown', () => {
    const groups = [groupWithPhotos('day-1', ['a', 'b']), groupWithPhotos('day-2', ['c', 'new'])];

    const keptGroups = withholdPhotosInsertedAbove({
      groups,
      displayedPhotoIds: new Set(['a', 'b', 'c']),
      firstVisiblePhotoId: 'b',
    });

    expect(keptGroups).toBe(groups);
  });

  test('when every photo of a new day is held back, then that day is not shown', () => {
    const groups = [groupWithPhotos('new-day', ['new']), groupWithPhotos('day-1', ['a', 'b'])];

    const keptGroups = withholdPhotosInsertedAbove({
      groups,
      displayedPhotoIds: new Set(['a', 'b']),
      firstVisiblePhotoId: 'b',
    });

    expect(keptGroups.map((timelineGroup) => timelineGroup.group.id)).toEqual(['day-1']);
  });

  test('when the first visible photo is no longer in the timeline, then every photo is shown', () => {
    const groups = [groupWithPhotos('day-1', ['new', 'a'])];

    const keptGroups = withholdPhotosInsertedAbove({
      groups,
      displayedPhotoIds: new Set(['a', 'gone']),
      firstVisiblePhotoId: 'gone',
    });

    expect(keptGroups).toBe(groups);
  });

  test('when a photo above the visible ones is removed, then it disappears right away', () => {
    const groups = [groupWithPhotos('day-1', ['a', 'c'])];

    const keptGroups = withholdPhotosInsertedAbove({
      groups,
      displayedPhotoIds: new Set(['a', 'b', 'c']),
      firstVisiblePhotoId: 'c',
    });

    expect(collectPhotoIds(keptGroups)).toEqual(['a', 'c']);
  });
});

describe('locating the photos held back above the visible ones', () => {
  const photoWithId = (id: string) => makePhotoItem({ id });
  const groupWithPhotos = (id: string, photoIds: string[]) =>
    makeTimelineGroup(makeDateGroup({ id, photos: photoIds.map(photoWithId) }));

  test('when new photos are held back, then the position of the lowest one is reported', () => {
    const groups = [groupWithPhotos('day-1', ['new-1', 'a', 'new-2']), groupWithPhotos('day-2', ['b', 'c'])];

    const { positionById, lastWithheldPosition } = getWithheldPhotoPositions({
      groups,
      displayedPhotoIds: new Set(['a', 'b', 'c']),
      firstVisiblePhotoId: 'c',
    });

    expect(lastWithheldPosition).toBe(2);
    expect(positionById.get('b')).toBe(3);
  });

  test('when the new photos are below the first visible photo, then none is reported as held back', () => {
    const groups = [groupWithPhotos('day-1', ['a', 'b']), groupWithPhotos('day-2', ['new'])];

    const { lastWithheldPosition } = getWithheldPhotoPositions({
      groups,
      displayedPhotoIds: new Set(['a', 'b']),
      firstVisiblePhotoId: 'b',
    });

    expect(lastWithheldPosition).toBe(-1);
  });

  test('when the first visible photo is no longer in the timeline, then none is reported as held back', () => {
    const groups = [groupWithPhotos('day-1', ['new', 'a'])];

    const { lastWithheldPosition } = getWithheldPhotoPositions({
      groups,
      displayedPhotoIds: new Set(['a']),
      firstVisiblePhotoId: 'deleted',
    });

    expect(lastWithheldPosition).toBe(-1);
  });
});
