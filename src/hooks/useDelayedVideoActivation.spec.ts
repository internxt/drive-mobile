import { act, renderHook } from '@testing-library/react-native';
import { useDelayedVideoActivation, VIDEO_ACTIVATION_DELAY_MS } from './useDelayedVideoActivation';

describe('Delayed video activation', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('when the page becomes visible, then the video turns on only after the delay', () => {
    const { result } = renderHook(() => useDelayedVideoActivation(true));

    act(() => {
      jest.advanceTimersByTime(VIDEO_ACTIVATION_DELAY_MS - 1);
    });
    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  test('when the page stops being visible, then the video turns off at once', () => {
    const { result, rerender } = renderHook(({ isActive }) => useDelayedVideoActivation(isActive), {
      initialProps: { isActive: true },
    });
    act(() => {
      jest.advanceTimersByTime(VIDEO_ACTIVATION_DELAY_MS);
    });

    rerender({ isActive: false });

    expect(result.current).toBe(false);
  });

  test('when the user swipes past the page before the delay ends, then the video never turns on', () => {
    const { result, rerender } = renderHook(({ isActive }) => useDelayedVideoActivation(isActive), {
      initialProps: { isActive: true },
    });
    act(() => {
      jest.advanceTimersByTime(VIDEO_ACTIVATION_DELAY_MS / 2);
    });

    rerender({ isActive: false });
    act(() => {
      jest.advanceTimersByTime(VIDEO_ACTIVATION_DELAY_MS);
    });

    expect(result.current).toBe(false);
  });
});
