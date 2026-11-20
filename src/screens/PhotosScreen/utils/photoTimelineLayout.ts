import { GroupBoundary } from './photoTimelineGroups';

export interface TimelineAnchor {
  startIndex: number;
  label: string;
}

export interface TimelineDateIndex {
  yearAnchors: TimelineAnchor[];
  monthAnchors: TimelineAnchor[];
}

export interface TimelineLayoutMetrics {
  rowHeight: number;
  contentTopInset: number;
  numColumns: number;
}

// `Date.prototype.toDateString()` format, e.g. "Wed Nov 18 2026": English month, four-digit year.
const DATE_STRING_PATTERN = /^[A-Z][a-z]{2} ([A-Z][a-z]{2}) \d{2} (\d{4})$/;

/**
 * Derives the year and month anchors used to position the scrubber rail.
 *
 * Year anchors sit on the LAST (oldest) boundary of each year; month anchors sit on the FIRST
 * (newest) boundary of each month instead. Both results are ordered by `startIndex` ascending and
 * can be binary searched.
 *
 * @param boundaries day boundaries of the flat timeline, ordered by `startIndex` ascending, with ids
 * in `Date.prototype.toDateString()` format. Other ids are skipped.
 */
export const buildTimelineDateIndex = (boundaries: GroupBoundary[]): TimelineDateIndex => {
  const datedBoundaries = boundaries.reduce<Array<{ boundary: GroupBoundary; year: string; month: string }>>(
    (entries, boundary) => {
      const dateParts = DATE_STRING_PATTERN.exec(boundary.id);
      if (!dateParts) {
        return entries;
      }
      entries.push({ boundary, month: dateParts[1], year: dateParts[2] });
      return entries;
    },
    [],
  );

  const yearAnchors: TimelineAnchor[] = [];
  const monthAnchors: TimelineAnchor[] = [];
  let lastMonthLabel: string | null = null;

  for (let entryIndex = 0; entryIndex < datedBoundaries.length; entryIndex++) {
    const { boundary, year, month } = datedBoundaries[entryIndex];
    const monthLabel = `${month} ${Number(year)}`;

    const nextYear = datedBoundaries[entryIndex + 1]?.year ?? null;
    if (year !== nextYear) {
      yearAnchors.push({ startIndex: boundary.startIndex, label: `${Number(year)}` });
    }

    if (monthLabel !== lastMonthLabel) {
      monthAnchors.push({ startIndex: boundary.startIndex, label: monthLabel });
      lastMonthLabel = monthLabel;
    }
  }

  return { yearAnchors, monthAnchors };
};

/**
 * Scroll offset in pixels at which the row containing the given item starts.
 *
 * @param params.index item index in the flat timeline.
 * @param params.rowHeight height of a grid row in pixels.
 * @param params.contentTopInset pixels above the first row (list top padding plus list header).
 * @param params.numColumns columns in the grid.
 */
export const getOffsetForIndex = ({
  index,
  rowHeight,
  contentTopInset,
  numColumns,
}: TimelineLayoutMetrics & { index: number }): number => contentTopInset + Math.floor(index / numColumns) * rowHeight;

/**
 * Height of a grid row, derived from the measured content height of a list with `itemCount` items.
 * Returns 0 when there are no rows.
 *
 * @param params.contentHeight measured content height of the list in pixels.
 * @param params.contentTopInset pixels above the first row (list top padding plus list header).
 * @param params.paddingBottom list bottom padding in pixels.
 */
export const getRowHeightFromContent = ({
  contentHeight,
  itemCount,
  contentTopInset,
  paddingBottom,
  numColumns,
}: {
  contentHeight: number;
  itemCount: number;
  contentTopInset: number;
  paddingBottom: number;
  numColumns: number;
}): number => {
  const rowCount = Math.ceil(itemCount / numColumns);
  if (rowCount === 0) {
    return 0;
  }
  return Math.max(0, (contentHeight - contentTopInset - paddingBottom) / rowCount);
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
 * Index of the last value less than or equal to `target`, or -1 when every value is greater. Runs a
 * binary search. Callable from a worklet and from the JS thread.
 *
 * @param values numbers ordered ascending.
 */
export const findLastIndexAtOrBefore = (values: number[], target: number): number => {
  'worklet';
  let low = 0;
  let high = values.length - 1;
  let foundIndex = -1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    if (values[middle] <= target) {
      foundIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return foundIndex;
};
