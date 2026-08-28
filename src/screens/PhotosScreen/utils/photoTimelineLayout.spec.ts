import { GroupBoundary } from './photoTimelineGroups';
import {
  buildTimelineDateIndex,
  findAnchorForIndex,
  getIndexForOffset,
  getOffsetForIndex,
  getTimelineContentHeight,
} from './photoTimelineLayout';

const makeBoundary = (overrides: Partial<GroupBoundary> = {}): GroupBoundary => ({
  startIndex: 0,
  id: new Date(2024, 0, 1).toDateString(),
  label: '1 Jan 2024',
  syncStatus: { type: 'none' },
  ...overrides,
});

describe('buildTimelineDateIndex', () => {
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

  test('when the timeline is empty, then no anchors are produced', () => {
    const { yearAnchors, monthAnchors } = buildTimelineDateIndex([]);

    expect(yearAnchors).toEqual([]);
    expect(monthAnchors).toEqual([]);
  });
});

describe('getOffsetForIndex / getIndexForOffset', () => {
  test('when an item index is given, then its pixel offset accounts for the header inset and the row height', () => {
    const offset = getOffsetForIndex({ index: 7, cellSize: 120, contentTopInset: 64, numColumns: 3 });

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

    const cellSize = 120;
    const contentTopInset = 64;
    const numColumns = 3;

    // Offset that lands inside the second month's range (index 30..59)
    const offset = getOffsetForIndex({ index: 40, cellSize, contentTopInset, numColumns });
    const index = getIndexForOffset({ offset, cellSize, contentTopInset, numColumns });
    const anchor = findAnchorForIndex(monthAnchors, index);

    expect(anchor?.startIndex).toBe(30);
  });
});

describe('findAnchorForIndex', () => {
  test('when the index precedes every anchor, then no anchor is returned', () => {
    const anchors = [{ startIndex: 10, label: 'a' }];

    expect(findAnchorForIndex(anchors, 5)).toBeUndefined();
  });

  test('when the index matches the last anchor exactly, then that anchor is returned', () => {
    const anchors = [
      { startIndex: 0, label: 'a' },
      { startIndex: 10, label: 'b' },
      { startIndex: 20, label: 'c' },
    ];

    expect(findAnchorForIndex(anchors, 20)?.label).toBe('c');
    expect(findAnchorForIndex(anchors, 25)?.label).toBe('c');
    expect(findAnchorForIndex(anchors, 15)?.label).toBe('b');
  });
});

describe('getTimelineContentHeight', () => {
  test('when the content is shorter than the viewport, then the scroll range never collapses to zero', () => {
    const contentHeight = getTimelineContentHeight({
      itemCount: 3,
      cellSize: 120,
      contentTopInset: 64,
      paddingBottom: 80,
      numColumns: 3,
    });

    // 1 row of 3 items + header inset + bottom padding
    expect(contentHeight).toBe(64 + 120 + 80);
    const maxScroll = Math.max(1, contentHeight - 900);
    expect(maxScroll).toBe(1);
  });
});
