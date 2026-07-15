import { act, renderHook } from '@testing-library/react-native';
import { PhotoItem } from '../../PhotosScreen/types';
import { usePreviewItems } from './usePreviewItems';

const makeItem = (id: string, backupState: PhotoItem['backupState']): PhotoItem => ({
  id,
  type: 'local',
  createdAt: 0,
  backupState,
  mediaType: 'photo',
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
});
