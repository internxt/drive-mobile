import { GroupBoundary } from './photoTimelineGroups';
import {
  buildTimelineDateIndex,
  findLastIndexAtOrBefore,
  getOffsetForIndex,
  getPlaceholderBackdropFrame,
  getRailAnchorForScroll,
  getRowHeightFromContent,
} from './photoTimelineLayout';

const makeBoundary = (overrides: Partial<GroupBoundary> = {}): GroupBoundary => ({
  startIndex: 0,
  id: new Date(2024, 0, 1).toDateString(),
  label: '1 Jan 2024',
  syncStatus: { type: 'none' },
  ...overrides,
});

describe('building the year and month anchors of the timeline', () => {
  test('when the timeline spans several years, then one anchor is produced per year', () => {
    const boundaries: GroupBoundary[] = [
      makeBoundary({ startIndex: 0, id: new Date(2026, 7, 1).toDateString() }),
      makeBoundary({ startIndex: 30, id: new Date(2025, 5, 1).toDateString() }),
      makeBoundary({ startIndex: 90, id: new Date(2024, 2, 1).toDateString() }),
    ];

    const { yearAnchors } = buildTimelineDateIndex(boundaries);

    expect(yearAnchors.map((a) => a.label)).toEqual(['2026', '2025', '2024']);
    expect(yearAnchors.map((a) => a.startIndex)).toEqual([0, 30, 90]);
  });

  test('when a year has photos in more than one month, then the year anchor lands on its oldest boundary', () => {
    const boundaries: GroupBoundary[] = [
      makeBoundary({ startIndex: 0, id: new Date(2023, 11, 20).toDateString() }),
      makeBoundary({ startIndex: 12, id: new Date(2023, 5, 10).toDateString() }),
      makeBoundary({ startIndex: 24, id: new Date(2023, 0, 5).toDateString() }),
      makeBoundary({ startIndex: 36, id: new Date(2022, 11, 30).toDateString() }),
    ];

    const { yearAnchors } = buildTimelineDateIndex(boundaries);

    expect(yearAnchors.map((a) => a.label)).toEqual(['2023', '2022']);
    expect(yearAnchors.map((a) => a.startIndex)).toEqual([24, 36]);
  });

  test('when a month has photos in more than one day, then only the first day becomes the month anchor', () => {
    const boundaries: GroupBoundary[] = [
      makeBoundary({ startIndex: 0, id: new Date(2024, 5, 20).toDateString() }),
      makeBoundary({ startIndex: 12, id: new Date(2024, 5, 10).toDateString() }),
      makeBoundary({ startIndex: 24, id: new Date(2024, 5, 1).toDateString() }),
    ];

    const { monthAnchors } = buildTimelineDateIndex(boundaries);

    expect(monthAnchors).toHaveLength(1);
    expect(monthAnchors[0].startIndex).toBe(0);
  });

  test('when the skeleton group is present, then it is not turned into an anchor', () => {
    const boundaries: GroupBoundary[] = [
      makeBoundary({ startIndex: 0, id: new Date(2024, 5, 1).toDateString() }),
      makeBoundary({ startIndex: 12, id: '__skeleton__', label: '' }),
    ];

    const { yearAnchors, monthAnchors } = buildTimelineDateIndex(boundaries);

    expect(yearAnchors).toHaveLength(1);
    expect(monthAnchors).toHaveLength(1);
  });

  test('when every month of a year has photos, then each month label is the short English month and the year', () => {
    const daysNewestFirst = Array.from({ length: 12 }, (_, monthsBack) => new Date(2025, 11 - monthsBack, 20));
    const boundaries = daysNewestFirst.map((day, dayIndex) =>
      makeBoundary({ startIndex: dayIndex * 3, id: day.toDateString() }),
    );

    const { yearAnchors, monthAnchors } = buildTimelineDateIndex(boundaries);

    expect(monthAnchors.map((anchor) => anchor.label)).toEqual(
      daysNewestFirst.map((day) => day.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
    );
    expect(yearAnchors).toEqual([{ startIndex: 33, label: '2025' }]);
  });

  test('when the timeline is empty, then no anchors are produced', () => {
    const { yearAnchors, monthAnchors } = buildTimelineDateIndex([]);

    expect(yearAnchors).toEqual([]);
    expect(monthAnchors).toEqual([]);
  });
});

describe('converting between an item position and a scroll offset', () => {
  test('when an item index is given, then its pixel offset accounts for the header inset and the row height', () => {
    const offset = getOffsetForIndex({ index: 7, rowHeight: 120, contentTopInset: 64, numColumns: 3 });

    // row = floor(7 / 3) = 2
    expect(offset).toBe(64 + 2 * 120);
  });

  test('when a scroll offset falls inside a month, then that month is the one reported', () => {
    const boundaries: GroupBoundary[] = [
      makeBoundary({ startIndex: 0, id: new Date(2024, 7, 15).toDateString() }),
      makeBoundary({ startIndex: 30, id: new Date(2024, 6, 10).toDateString() }),
      makeBoundary({ startIndex: 60, id: new Date(2024, 5, 1).toDateString() }),
    ];
    const { monthAnchors } = buildTimelineDateIndex(boundaries);
    const metrics = { rowHeight: 120, contentTopInset: 64, numColumns: 3 };
    const monthOffsets = monthAnchors.map((anchor) => getOffsetForIndex({ index: anchor.startIndex, ...metrics }));

    const offset = getOffsetForIndex({ index: 40, ...metrics });

    expect(monthAnchors[findLastIndexAtOrBefore(monthOffsets, offset)].startIndex).toBe(30);
  });
});

describe('deriving the row height from the measured list', () => {
  test('when the list reports its content height, then the row height excludes the header inset and the bottom padding', () => {
    const rowHeight = getRowHeightFromContent({
      contentHeight: 64 + 4 * 144.5 + 80,
      itemCount: 10,
      contentTopInset: 64,
      paddingBottom: 80,
      numColumns: 3,
    });

    expect(rowHeight).toBeCloseTo(144.5);
  });

  test('when there are no items, then the row height is zero', () => {
    expect(
      getRowHeightFromContent({
        contentHeight: 500,
        itemCount: 0,
        contentTopInset: 64,
        paddingBottom: 80,
        numColumns: 3,
      }),
    ).toBe(0);
  });
});

describe('placing the scrubber handle for a scroll position', () => {
  test('when the list is scrolled halfway, then the handle sits halfway down the rail', () => {
    expect(getRailAnchorForScroll({ scrollY: 500, maxScroll: 1000, railHeight: 400 })).toBe(200);
  });

  test('when the list is at the very top, then the handle sits at the top of the rail', () => {
    expect(getRailAnchorForScroll({ scrollY: 0, maxScroll: 1000, railHeight: 400 })).toBe(0);
  });

  test('when the list is scrolled past its end, then the handle stops at the bottom of the rail', () => {
    expect(getRailAnchorForScroll({ scrollY: 1800, maxScroll: 1000, railHeight: 400 })).toBe(400);
  });

  test('when the list is overscrolled above the top, then the handle stops at the top of the rail', () => {
    expect(getRailAnchorForScroll({ scrollY: -120, maxScroll: 1000, railHeight: 400 })).toBe(0);
  });

  test('when there is nothing to scroll, then the handle sits at the top of the rail', () => {
    expect(getRailAnchorForScroll({ scrollY: 300, maxScroll: 0, railHeight: 400 })).toBe(0);
  });
});

describe('finding the last value at or before a target', () => {
  test('when the target precedes every value, then nothing is found', () => {
    expect(findLastIndexAtOrBefore([10, 20], 5)).toBe(-1);
  });

  test('when the target matches or passes a value, then that value is the one found', () => {
    const values = [0, 10, 20];

    expect(findLastIndexAtOrBefore(values, 20)).toBe(2);
    expect(findLastIndexAtOrBefore(values, 25)).toBe(2);
    expect(findLastIndexAtOrBefore(values, 15)).toBe(1);
  });
});

describe('placing the placeholder grid behind the timeline', () => {
  const ROW_HEIGHT = 100;
  const TOP_INSET = 64;
  const VIEWPORT_HEIGHT = 800;

  test('when the list is at the top, then the grid starts under the header and has no row offset', () => {
    expect(
      getPlaceholderBackdropFrame({
        scrollOffset: 0,
        contentTopInset: TOP_INSET,
        rowHeight: ROW_HEIGHT,
        rowCount: 50,
        viewportHeight: VIEWPORT_HEIGHT,
      }),
    ).toEqual({ visibleTop: TOP_INSET, visibleHeight: VIEWPORT_HEIGHT - TOP_INSET, firstRowOffset: 0 });
  });

  test('when the list is scrolled partway into a row, then the grid shifts up by that same amount', () => {
    const frame = getPlaceholderBackdropFrame({
      scrollOffset: TOP_INSET + 5 * ROW_HEIGHT + 30,
      contentTopInset: TOP_INSET,
      rowHeight: ROW_HEIGHT,
      rowCount: 50,
      viewportHeight: VIEWPORT_HEIGHT,
    });

    expect(frame).toEqual({ visibleTop: 0, visibleHeight: VIEWPORT_HEIGHT, firstRowOffset: -30 });
  });

  test('when the list is scrolled to an exact row edge, then the grid has no row offset', () => {
    const frame = getPlaceholderBackdropFrame({
      scrollOffset: TOP_INSET + 7 * ROW_HEIGHT,
      contentTopInset: TOP_INSET,
      rowHeight: ROW_HEIGHT,
      rowCount: 50,
      viewportHeight: VIEWPORT_HEIGHT,
    });

    expect(frame.firstRowOffset).toBe(0);
  });

  test('when the end of the timeline is in view, then the grid stops before the last row', () => {
    const rowCount = 10;
    const scrollOffset = TOP_INSET + rowCount * ROW_HEIGHT - 500;

    const frame = getPlaceholderBackdropFrame({
      scrollOffset,
      contentTopInset: TOP_INSET,
      rowHeight: ROW_HEIGHT,
      rowCount,
      viewportHeight: VIEWPORT_HEIGHT,
    });

    expect(frame.visibleTop + frame.visibleHeight).toBe(500 - ROW_HEIGHT);
  });

  test('when the timeline has a single row or no measured height yet, then no grid is shown', () => {
    const singleRow = getPlaceholderBackdropFrame({
      scrollOffset: 0,
      contentTopInset: TOP_INSET,
      rowHeight: ROW_HEIGHT,
      rowCount: 1,
      viewportHeight: VIEWPORT_HEIGHT,
    });
    const unmeasured = getPlaceholderBackdropFrame({
      scrollOffset: 0,
      contentTopInset: TOP_INSET,
      rowHeight: 0,
      rowCount: 50,
      viewportHeight: VIEWPORT_HEIGHT,
    });

    expect(singleRow.visibleHeight).toBe(0);
    expect(unmeasured.visibleHeight).toBe(0);
  });
});
