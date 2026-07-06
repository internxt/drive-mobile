import { act, renderHook } from '@testing-library/react-native';
import { TimelinePhotoItem } from '../types';
import { usePhotoSelection } from './usePhotoSelection';

const makeLocalItem = (id: string): TimelinePhotoItem => ({
  id,
  type: 'local',
  createdAt: 0,
  backupState: 'backed',
  mediaType: 'photo',
});

const makeCloudItem = (id: string): TimelinePhotoItem => ({
  id,
  type: 'cloud-only',
  mediaType: 'photo',
  thumbnailPath: null,
  thumbnailBucketId: null,
  thumbnailBucketFile: null,
  thumbnailType: null,
  deviceId: 'device-1',
  createdAt: 0,
  fileName: `${id}.jpg`,
});

describe('usePhotoSelection', () => {
  test('when select mode is off and the user long-presses a photo, then select mode turns on with that photo selected', () => {
    const items = [makeLocalItem('a'), makeLocalItem('b')];
    const { result } = renderHook(() => usePhotoSelection(items));

    expect(result.current.isSelectMode).toBe(false);

    act(() => result.current.enterSelectMode('a'));

    expect(result.current.isSelectMode).toBe(true);
    expect(result.current.selectedIds.has('a')).toBe(true);
    expect(result.current.selectedIds.size).toBe(1);
  });

  test('when an already-selected photo is tapped again, then it is deselected', () => {
    const items = [makeLocalItem('a')];
    const { result } = renderHook(() => usePhotoSelection(items));

    act(() => result.current.enterSelectMode('a'));
    act(() => result.current.toggleSelect('a'));

    expect(result.current.selectedIds.has('a')).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  test('when the user taps cancel, then select mode turns off and the selection is cleared', () => {
    const items = [makeLocalItem('a'), makeLocalItem('b')];
    const { result } = renderHook(() => usePhotoSelection(items));

    act(() => result.current.enterSelectMode('a'));
    act(() => result.current.toggleSelect('b'));
    act(() => result.current.exitSelectMode());

    expect(result.current.isSelectMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.selectedItems).toHaveLength(0);
  });

  test('when entering select mode without an initial id, then the selection starts empty', () => {
    const items = [makeLocalItem('a')];
    const { result } = renderHook(() => usePhotoSelection(items));

    act(() => result.current.enterSelectMode());

    expect(result.current.isSelectMode).toBe(true);
    expect(result.current.selectedIds.size).toBe(0);
  });

  test('when the underlying list changes, then selected items reflect only the ids still present', () => {
    const initialItems = [makeLocalItem('a'), makeCloudItem('b')];
    const { result, rerender } = renderHook(({ items }) => usePhotoSelection(items), {
      initialProps: { items: initialItems },
    });

    act(() => result.current.enterSelectMode('a'));
    act(() => result.current.toggleSelect('b'));
    expect(result.current.selectedItems).toHaveLength(2);

    const updatedItems = [makeLocalItem('a')];
    rerender({ items: updatedItems });

    expect(result.current.selectedItems).toHaveLength(1);
    expect(result.current.selectedItems[0].id).toBe('a');
  });

  test('when a new photo is toggled on, then it appears in the selected items list', () => {
    const items = [makeLocalItem('a'), makeCloudItem('c')];
    const { result } = renderHook(() => usePhotoSelection(items));

    act(() => result.current.enterSelectMode());
    act(() => result.current.toggleSelect('c'));

    expect(result.current.selectedItems).toHaveLength(1);
    expect(result.current.selectedItems[0].id).toBe('c');
  });
});
