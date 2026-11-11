import { Platform } from 'react-native';
import { CloudPhotoItem, PhotoItem } from '../types';
import {
  getThumbnailSource,
  isItemBacked,
  isItemCloudDeleted,
  isItemSelectable,
  isLocalItemNotBacked,
} from './photoUtils';

const makeLocalItem = (overrides: Partial<PhotoItem> = {}): PhotoItem => ({
  id: 'asset-1',
  type: 'local',
  uri: 'file:///photo.jpg',
  createdAt: Date.now(),
  modificationTime: Date.now(),
  backupState: 'not-backed',
  mediaType: 'photo',
  ...overrides,
});

const makeCloudItem = (overrides: Partial<CloudPhotoItem> = {}): CloudPhotoItem => ({
  id: 'remote-1',
  type: 'cloud-only',
  mediaType: 'photo',
  thumbnailPath: null,
  thumbnailBucketId: null,
  thumbnailBucketFile: null,
  thumbnailType: null,
  deviceId: 'device-1',
  folderDate: Date.now(),
  uploadedAt: Date.now(),
  isFavorite: false,
  fileName: 'photo.jpg',
  ...overrides,
});

describe('isItemCloudDeleted', () => {
  test('when a local item has cloud-deleted backup state, then it is cloud-deleted', () => {
    expect(isItemCloudDeleted(makeLocalItem({ backupState: 'cloud-deleted' }))).toBe(true);
  });

  test('when a local item has not-backed backup state, then it is not cloud-deleted', () => {
    expect(isItemCloudDeleted(makeLocalItem({ backupState: 'not-backed' }))).toBe(false);
  });

  test('when the item is cloud-only, then it is not cloud-deleted', () => {
    expect(isItemCloudDeleted(makeCloudItem())).toBe(false);
  });
});

describe('isItemSelectable', () => {
  test('when an item is cloud-deleted, then it is not selectable', () => {
    expect(isItemSelectable(makeLocalItem({ backupState: 'cloud-deleted' }))).toBe(false);
  });

  test('when a local item is not-backed, then it is selectable', () => {
    expect(isItemSelectable(makeLocalItem({ backupState: 'not-backed' }))).toBe(true);
  });

  test('when a local item is backed, then it is selectable', () => {
    expect(isItemSelectable(makeLocalItem({ backupState: 'backed' }))).toBe(true);
  });

  test('when the item is cloud-only, then it is selectable', () => {
    expect(isItemSelectable(makeCloudItem())).toBe(true);
  });
});

describe('isItemBacked', () => {
  test('when the item is cloud-only, then it is backed', () => {
    expect(isItemBacked(makeCloudItem())).toBe(true);
  });

  test('when a local item has backed state, then it is backed', () => {
    expect(isItemBacked(makeLocalItem({ backupState: 'backed' }))).toBe(true);
  });

  test('when a local item is cloud-deleted, then it is not backed', () => {
    expect(isItemBacked(makeLocalItem({ backupState: 'cloud-deleted' }))).toBe(false);
  });
});

describe('isLocalItemNotBacked', () => {
  test('when a local item is not-backed, then it is true', () => {
    expect(isLocalItemNotBacked(makeLocalItem({ backupState: 'not-backed' }))).toBe(true);
  });

  test('when a local item is cloud-deleted, then it is false', () => {
    expect(isLocalItemNotBacked(makeLocalItem({ backupState: 'cloud-deleted' }))).toBe(false);
  });
});

describe('getThumbnailSource', () => {
  const ANDROID_FILE_URI = 'file:///storage/emulated/0/Pictures/photo.png';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('when a local photo is edited on the device, then its thumbnail gets a different cache key', () => {
    const beforeEdit = getThumbnailSource(makeLocalItem({ modificationTime: 1000 }), 'ph://asset');
    const afterEdit = getThumbnailSource(makeLocalItem({ modificationTime: 2000 }), 'ph://asset');

    expect(afterEdit.cacheKey).not.toBe(beforeEdit.cacheKey);
  });

  test('when a local photo is shown on iOS, then its uri is left as it is', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    expect(getThumbnailSource(makeLocalItem(), 'ph://asset').uri).toBe('ph://asset');
  });

  test('when a local photo file is edited on Android, then its thumbnail uri changes too', () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    const beforeEdit = getThumbnailSource(makeLocalItem({ modificationTime: 1000 }), ANDROID_FILE_URI);
    const afterEdit = getThumbnailSource(makeLocalItem({ modificationTime: 2000 }), ANDROID_FILE_URI);

    expect(beforeEdit.uri.startsWith(ANDROID_FILE_URI)).toBe(true);
    expect(afterEdit.uri).not.toBe(beforeEdit.uri);
  });

  test('when a local photo on Android comes from the media library provider, then its uri is left as it is', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const contentUri = 'content://media/external/images/media/1';

    expect(getThumbnailSource(makeLocalItem(), contentUri).uri).toBe(contentUri);
  });

  test('when the item is only in the cloud, then its uri is left as it is and no cache key is given', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const cloudThumbnail = 'file:///data/thumbnails/photo.jpg';

    expect(getThumbnailSource(makeCloudItem(), cloudThumbnail)).toEqual({ uri: cloudThumbnail });
  });
});
