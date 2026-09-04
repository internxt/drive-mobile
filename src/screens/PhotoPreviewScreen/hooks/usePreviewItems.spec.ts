import { act, renderHook } from '@testing-library/react-native';
import { CloudPhotoItem, PhotoItem } from '../../PhotosScreen/types';
import { usePreviewItems } from './usePreviewItems';

const makeItem = (id: string, backupState: PhotoItem['backupState']): PhotoItem => ({
  id,
  type: 'local',
  createdAt: 0,
  modificationTime: 0,
  backupState,
  mediaType: 'photo',
});

const makeCloudItem = (id: string, overrides: Partial<CloudPhotoItem> = {}): CloudPhotoItem => ({
  id,
  type: 'cloud-only',
  mediaType: 'photo',
  fileName: 'photo.dng',
  thumbnailPath: null,
  thumbnailBucketId: null,
  thumbnailBucketFile: null,
  thumbnailType: null,
  deviceId: 'device-1',
  folderDate: 0,
  uploadedAt: 0,
  isFavorite: false,
  ...overrides,
});

describe('usePreviewItems', () => {
  test('when the hook mounts, then the initial index points to the item matching initialId', () => {
    const items = [makeItem('a', 'backed'), makeItem('b', 'backed'), makeItem('c', 'backed')];

    const { result } = renderHook(() => usePreviewItems('b', items));

    expect(result.current.currentIndex).toBe(1);
  });

  test('when markAssetBackedUp is called, then the matching item is reported as backed', () => {
    const items = [makeItem('a', 'cloud-deleted')];
    const { result } = renderHook(() => usePreviewItems('a', items));

    act(() => result.current.markAssetBackedUp('a'));

    expect((result.current.items[0] as PhotoItem).backupState).toBe('backed');
  });

  test('when an asset is marked backed up and the current index moves to another item and back, then it is still reported as backed', () => {
    const items = [makeItem('a', 'cloud-deleted'), makeItem('b', 'backed')];
    const { result } = renderHook(() => usePreviewItems('a', items));

    act(() => result.current.markAssetBackedUp('a'));
    act(() => result.current.setCurrentIndex(1));
    act(() => result.current.setCurrentIndex(0));

    expect((result.current.items[0] as PhotoItem).backupState).toBe('backed');
  });

  test('when one item is marked backed up, then other items are left unchanged', () => {
    const items = [makeItem('a', 'cloud-deleted'), makeItem('b', 'not-backed')];
    const { result } = renderHook(() => usePreviewItems('a', items));

    act(() => result.current.markAssetBackedUp('a'));

    expect((result.current.items[1] as PhotoItem).backupState).toBe('not-backed');
  });

  test('when no asset has been marked backed up, then items are returned as-is', () => {
    const items = [makeItem('a', 'cloud-deleted')];
    const { result } = renderHook(() => usePreviewItems('a', items));

    expect(result.current.items).toEqual(items);
  });

  test('when markThumbnailBackfilled is called, then the matching cloud item gets the new thumbnail refs', () => {
    const items = [makeCloudItem('a')];
    const { result } = renderHook(() => usePreviewItems('a', items));

    act(() =>
      result.current.markThumbnailBackfilled('a', {
        thumbnailBucketId: 'bucket-1',
        thumbnailBucketFile: 'file-1',
        thumbnailType: 'JPEG',
        thumbnailPath: '/local/thumb.jpg',
      }),
    );

    expect(result.current.items[0]).toMatchObject({
      thumbnailBucketId: 'bucket-1',
      thumbnailBucketFile: 'file-1',
      thumbnailType: 'JPEG',
      thumbnailPath: '/local/thumb.jpg',
    });
  });

  test('when one cloud item is backfilled, then other items are left unchanged', () => {
    const items = [makeCloudItem('a'), makeCloudItem('b')];
    const { result } = renderHook(() => usePreviewItems('a', items));

    act(() =>
      result.current.markThumbnailBackfilled('a', {
        thumbnailBucketId: 'bucket-1',
        thumbnailBucketFile: 'file-1',
        thumbnailType: 'JPEG',
        thumbnailPath: '/local/thumb.jpg',
      }),
    );

    expect((result.current.items[1] as CloudPhotoItem).thumbnailBucketFile).toBeNull();
  });
});
