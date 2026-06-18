import { act, renderHook } from '@testing-library/react-native';
import useDebouncedValue from './useDebouncedValue';

jest.useFakeTimers();

describe('useDebouncedValue', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  test('when the hook mounts, then the initial value is returned immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('hello', 300));

    expect(result.current).toBe('hello');
  });

  test('when the value changes, then the debounced value does not update before the delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });
    act(() => {
      jest.advanceTimersByTime(299);
    });

    expect(result.current).toBe('first');
  });

  test('when the delay elapses after a value change, then the debounced value updates', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('second');
  });

  test('when the value changes multiple times before the delay elapses, then only the last value is applied', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });
    act(() => jest.advanceTimersByTime(100));

    rerender({ value: 'third' });
    act(() => jest.advanceTimersByTime(100));

    rerender({ value: 'fourth' });
    act(() => jest.advanceTimersByTime(300));

    expect(result.current).toBe('fourth');
  });

  test('when the hook unmounts before the delay elapses, then the debounced value does not update', () => {
    const { result, rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });
    unmount();
    act(() => jest.advanceTimersByTime(300));

    expect(result.current).toBe('first');
  });

  test('when used with an array value, then it debounces reference changes correctly', () => {
    const initialIds = ['a', 'b'];
    const { result, rerender } = renderHook(({ ids }) => useDebouncedValue(ids, 400), {
      initialProps: { ids: initialIds },
    });

    const updatedIds = ['a', 'b', 'c'];
    rerender({ ids: updatedIds });
    act(() => jest.advanceTimersByTime(400));

    expect(result.current).toEqual(['a', 'b', 'c']);
    expect(result.current).toBe(updatedIds);
  });
});
