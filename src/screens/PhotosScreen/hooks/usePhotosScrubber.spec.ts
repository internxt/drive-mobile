import { act, renderHook } from '@testing-library/react-native';
import { GroupBoundary } from '../utils/photoTimelineGroups';
import { getUserScrollingAfterEvent, MeasuredTimelineContent, usePhotosScrubber } from './usePhotosScrubber';

jest.mock('react-native-reanimated', () => {
  const { useRef } = jest.requireActual('react');
  const useStableValue = <Value>(initial: Value) => useRef({ value: initial }).current;
  return {
    useSharedValue: useStableValue,
    useAnimatedReaction: jest.fn(),
    useEvent: () => ({ workletEventHandler: { registerForEvents: jest.fn(), unregisterFromEvents: jest.fn() } }),
    withTiming: (toValue: number) => toValue,
    withDelay: (_delay: number, animation: number) => animation,
    withSequence: (...animations: number[]) => animations[animations.length - 1],
  };
});

const RELEASE_TIMEOUT_MS = 400;
const NUM_COLUMNS = 3;
const ROW_HEIGHT = 100;
const CONTENT_TOP_INSET = 64;
const LIST_PADDING_BOTTOM = 80;
const CONTAINER_HEIGHT = 800;

const makeBoundary = (startIndex: number, date: Date): GroupBoundary => ({
  startIndex,
  id: date.toDateString(),
  label: date.toDateString(),
  syncStatus: { type: 'none' },
});

const boundaries: GroupBoundary[] = [
  makeBoundary(0, new Date(2025, 6, 10)),
  makeBoundary(150, new Date(2025, 2, 4)),
  makeBoundary(300, new Date(2024, 9, 1)),
];

const measureContent = (itemCount: number): MeasuredTimelineContent => ({
  height: CONTENT_TOP_INSET + Math.ceil(itemCount / NUM_COLUMNS) * ROW_HEIGHT + LIST_PADDING_BOTTOM,
  itemCount,
});

type ScrubberProps = { itemCount: number; isEnabled: boolean };

const renderScrubber = (initialProps: ScrubberProps = { itemCount: 450, isEnabled: true }) =>
  renderHook(
    ({ itemCount, isEnabled }: ScrubberProps) =>
      usePhotosScrubber({
        listRef: Object.assign(jest.fn(), { observe: jest.fn() }) as never,
        boundaries,
        itemCount,
        measuredContent: measureContent(itemCount),
        contentTopInset: CONTENT_TOP_INSET,
        containerHeight: CONTAINER_HEIGHT,
        numColumns: NUM_COLUMNS,
        listPaddingBottom: LIST_PADDING_BOTTOM,
        isEnabled,
      }),
    { initialProps },
  );

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('photos scrubber', () => {
  test('when the timeline is shorter than two screens, then the scrubber is not available', () => {
    const { result } = renderScrubber({ itemCount: 30, isEnabled: true });

    expect(result.current.isAvailable).toBe(false);
  });

  test('when the timeline is long and selection mode is off, then the scrubber is available', () => {
    const { result } = renderScrubber();

    expect(result.current.isAvailable).toBe(true);
  });

  test('when selection mode is on, then the scrubber is not available', () => {
    const { result } = renderScrubber({ itemCount: 450, isEnabled: false });

    expect(result.current.isAvailable).toBe(false);
  });

  test('when the year markers are placed, then each one sits where its year ends in the measured list', () => {
    const { result } = renderScrubber();

    const railHeight = result.current.railHeight;
    const maxScroll = measureContent(450).height - CONTAINER_HEIGHT;
    const year2025EndOffset = CONTENT_TOP_INSET + (150 / NUM_COLUMNS) * ROW_HEIGHT;

    expect(result.current.yearMarkers[0]).toEqual({ label: '2025', y: (year2025EndOffset / maxScroll) * railHeight });
  });

  test('when the timeline spans several months, then the drag has one label per month in timeline order', () => {
    const { result } = renderScrubber();

    expect(result.current.drag.monthLabels.value).toEqual(['Jul 2025', 'Mar 2025', 'Oct 2024']);
  });

  test('when the timeline grows during a drag, then the year markers stay put until the drag ends', () => {
    const { result, rerender } = renderScrubber();
    const markersBeforeGrowth = result.current.yearMarkers;

    act(() => result.current.onScrubStart(1));
    rerender({ itemCount: 900, isEnabled: true });
    expect(result.current.yearMarkers).toBe(markersBeforeGrowth);

    act(() => result.current.onScrubEnd(1));
    expect(result.current.yearMarkers).not.toEqual(markersBeforeGrowth);
  });

  test('when the list never reaches the released position, then the handle follows the scroll again after a short wait', () => {
    const { result } = renderScrubber();
    const { drag } = result.current;

    drag.dragCount.value = 1;
    act(() => result.current.onScrubStart(1));
    drag.isDragging.value = true;
    drag.isReleasing.value = true;
    act(() => result.current.onScrubEnd(1));

    act(() => {
      jest.advanceTimersByTime(RELEASE_TIMEOUT_MS);
    });

    expect(drag.isDragging.value).toBe(false);
    expect(drag.isReleasing.value).toBe(false);
  });

  test('when a newer drag starts before the release wait ends, then the newer drag stays pinned', () => {
    const { result } = renderScrubber();
    const { drag } = result.current;

    drag.dragCount.value = 1;
    act(() => result.current.onScrubStart(1));
    drag.isReleasing.value = true;
    act(() => result.current.onScrubEnd(1));

    drag.dragCount.value = 2;
    drag.isDragging.value = true;
    drag.isReleasing.value = false;
    act(() => result.current.onScrubStart(2));
    act(() => {
      jest.advanceTimersByTime(RELEASE_TIMEOUT_MS);
    });

    expect(drag.isDragging.value).toBe(true);
  });
});

describe('telling scrolling by the user apart from other scrolling', () => {
  test('when the user puts a finger on the list and drags, then the scrolling counts as scrolling by the user', () => {
    expect(getUserScrollingAfterEvent('onScrollBeginDrag', false)).toBe(true);
  });

  test('when the user lifts the finger and the list keeps gliding, then the gliding still counts as scrolling by the user', () => {
    const afterLift = getUserScrollingAfterEvent('onScrollEndDrag', true);

    expect(getUserScrollingAfterEvent('onMomentumScrollBegin', afterLift)).toBe(true);
  });

  test('when the list stops gliding, then later scrolling no longer counts as scrolling by the user', () => {
    const afterStop = getUserScrollingAfterEvent('onMomentumScrollEnd', true);

    expect(getUserScrollingAfterEvent('onScroll', afterStop)).toBe(false);
  });

  test('when the list moves without the user touching it, then the scrolling does not count as scrolling by the user', () => {
    expect(getUserScrollingAfterEvent('onScroll', false)).toBe(false);
  });

  test('when an event name carries a view prefix, then it is still recognised', () => {
    expect(getUserScrollingAfterEvent('123onScrollBeginDrag', false)).toBe(true);
  });
});
