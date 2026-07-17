import { CloudPhotoItem, PhotoItem } from '../types';
import { isItemBacked, isItemCloudDeleted, isItemSelectable, isLocalItemNotBacked } from './photoUtils';

const makeLocalItem = (overrides: Partial<PhotoItem> = {}): PhotoItem => ({
  id: 'asset-1',
  type: 'local',
  uri: 'file:///photo.jpg',
  createdAt: Date.now(),
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
  createdAt: Date.now(),
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
