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

const formatMonthLabel = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

/**
 * Derives the year and month anchors used to position the scrubber rail.
 *
 * Year anchors sit on the LAST (oldest) boundary of each year — reaching "2023" on the rail means
 * you've scrolled through all of 2023, down to its earliest month, not that you've just entered it
 * from 2024. Month anchors sit on the FIRST (newest) boundary of each month instead, because
 * findAnchorForIndex needs that to correctly attribute every index within a month to that month
 * (see the inline comment below for why the two can't share the same rule). Both results are
 * ordered by `startIndex` ascending and can be binary searched.
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

    // Anchor at the boundary right before the year changes — the LAST (oldest) day of this year,
    // not the first. Static label position, never looked up by index, so which boundary within the
    // year it lands on doesn't affect correctness — only where it reads on the rail.
    const nextYear = validEntries[i + 1]?.date.getFullYear() ?? null;
    if (year !== nextYear) {
      yearAnchors.push({ startIndex: boundary.startIndex, label: `${year}` });
    }

    // Anchor at the FIRST (newest) day of the month, unlike yearAnchors above: findAnchorForIndex
    // looks up "the last anchor with startIndex <= index" so the drag pill can label every index
    // scrolled through — that only attributes indices to the right month if the anchor sits at the
    // start of the month's span. Anchoring at the end instead would make the pill show the previous
    // (more recent) month for nearly the whole scroll through any given month.
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
}: TimelineLayoutMetrics & { index: number }): number =>
  contentTopInset + Math.floor(index / numColumns) * cellSize;

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
 * every anchor. Runs a binary search (via findLastAtOrBefore), so it is safe to call on every
 * frame of a drag.
 *
 * @param anchors anchors ordered by `startIndex` ascending.
 * @param index item index in the flat timeline.
 */
export const findAnchorForIndex = (anchors: TimelineAnchor[], index: number): TimelineAnchor | undefined =>
  findLastAtOrBefore(anchors, index);
