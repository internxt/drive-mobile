import { GroupBoundary, findLastAtOrBefore } from './photoTimelineGroups';

const SKELETON_GROUP_ID = '__skeleton__';

export interface TimelineAnchor {
  startIndex: number;
  label: string;
}

export interface TimelineDateIndex {
  yearAnchors: TimelineAnchor[];
  monthAnchors: TimelineAnchor[];
}

export interface TimelineLayoutMetrics {
  cellSize: number;
  contentTopInset: number;
  numColumns: number;
}

const formatMonthLabel = (date: Date): string => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

/**
 * Derives the year and month anchors used to position the scrubber rail.
 *
 * Year anchors sit on the LAST (oldest) boundary of each year; month anchors sit on the FIRST
 * (newest) boundary of each month instead. Both results are ordered by `startIndex` ascending and
 * can be binary searched.
 *
 * @param boundaries day boundaries of the flat timeline, ordered by `startIndex` ascending.
 */
export const buildTimelineDateIndex = (boundaries: GroupBoundary[]): TimelineDateIndex => {
  const validEntries = boundaries.reduce<Array<{ boundary: GroupBoundary; date: Date }>>((entries, boundary) => {
    if (boundary.id === SKELETON_GROUP_ID) {
      return entries;
    }
    const date = new Date(boundary.id);
    if (Number.isNaN(date.getTime())) {
      return entries;
    }
    entries.push({ boundary, date });
    return entries;
  }, []);

  const yearAnchors: TimelineAnchor[] = [];
  const monthAnchors: TimelineAnchor[] = [];
  let lastMonthKey: string | null = null;

  for (let i = 0; i < validEntries.length; i++) {
    const { boundary, date } = validEntries[i];
    const year = date.getFullYear();
    const monthKey = `${year}-${date.getMonth()}`;

    const nextYear = validEntries[i + 1]?.date.getFullYear() ?? null;
    if (year !== nextYear) {
      yearAnchors.push({ startIndex: boundary.startIndex, label: `${year}` });
    }

    if (monthKey !== lastMonthKey) {
      monthAnchors.push({ startIndex: boundary.startIndex, label: formatMonthLabel(date) });
      lastMonthKey = monthKey;
    }
  }

  return { yearAnchors, monthAnchors };
};

/**
 * Scroll offset in pixels at which the row containing the given item starts.
 *
 * @param params.index item index in the flat timeline.
 * @param params.cellSize height of a grid row in pixels.
 * @param params.contentTopInset pixels above the first row (list top padding plus list header).
 * @param params.numColumns columns in the grid.
 */
export const getOffsetForIndex = ({
  index,
  cellSize,
  contentTopInset,
  numColumns,
}: TimelineLayoutMetrics & { index: number }): number => contentTopInset + Math.floor(index / numColumns) * cellSize;

/**
 * Index of the first item on the row visible at the given scroll offset. Inverse of
 * {@link getOffsetForIndex}.
 *
 * @param params.offset scroll offset in pixels.
 * @param params.cellSize height of a grid row in pixels.
 * @param params.contentTopInset pixels above the first row (list top padding plus list header).
 * @param params.numColumns columns in the grid.
 */
export const getIndexForOffset = ({
  offset,
  cellSize,
  contentTopInset,
  numColumns,
}: TimelineLayoutMetrics & { offset: number }): number => {
  if (cellSize <= 0) {
    return 0;
  }
  const row = Math.floor((offset - contentTopInset) / cellSize);
  return Math.max(0, row) * numColumns;
};

/**
 * Position along the scrubber rail, in pixels from its top, matching a scroll offset. Clamped to
 * [0, railHeight]. Callable from a worklet and from the JS thread.
 *
 * @param params.scrollY scroll offset in pixels.
 * @param params.maxScroll maximum scroll offset in pixels.
 * @param params.railHeight rail length in pixels.
 */
export const getRailAnchorForScroll = ({
  scrollY,
  maxScroll,
  railHeight,
}: {
  scrollY: number;
  maxScroll: number;
  railHeight: number;
}): number => {
  'worklet';
  const fraction = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0;
  return fraction * railHeight;
};

/**
 * Total scrollable content height of the timeline, derived from the item count instead of measured,
 * so it is available on the first render.
 *
 * @param params.itemCount items in the flat timeline.
 * @param params.cellSize height of a grid row in pixels.
 * @param params.contentTopInset pixels above the first row (list top padding plus list header).
 * @param params.paddingBottom list bottom padding in pixels.
 * @param params.numColumns columns in the grid.
 */
export const getTimelineContentHeight = ({
  itemCount,
  cellSize,
  contentTopInset,
  paddingBottom,
  numColumns,
}: TimelineLayoutMetrics & { itemCount: number; paddingBottom: number }): number =>
  contentTopInset + Math.ceil(itemCount / numColumns) * cellSize + paddingBottom;

/**
 * Last anchor starting at or before the given item index, or undefined when the index precedes
 * every anchor. Runs a binary search.
 *
 * @param anchors anchors ordered by `startIndex` ascending.
 * @param index item index in the flat timeline.
 */
export const findAnchorForIndex = (anchors: TimelineAnchor[], index: number): TimelineAnchor | undefined =>
  findLastAtOrBefore(anchors, index);
