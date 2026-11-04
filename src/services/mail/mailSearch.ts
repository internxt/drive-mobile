import dayjs from 'dayjs';

import { SearchQuery } from './mailbox.service';
import { parseRecipients } from './parseRecipients';

export type DatePreset = 'anyDate' | 'today' | 'last7Days' | 'last30Days' | 'thisYear' | 'lastYear';

export type DateFilter = { preset: DatePreset } | { preset: 'customRange'; startDate: Date; endDate: Date };

export type SearchCriteria = {
  text: string;
  from: string[];
  to: string[];
  hasAttachment: boolean;
  isUnread: boolean;
  date: DateFilter;
};

export const ANY_DATE: DateFilter = { preset: 'anyDate' };

export const EMPTY_SEARCH_CRITERIA: SearchCriteria = {
  text: '',
  from: [],
  to: [],
  hasAttachment: false,
  isUnread: false,
  date: ANY_DATE,
};

const RECENT_DAYS_BY_PRESET = { last7Days: 7, last30Days: 30 };

const removeBlankEntries = (entries: string[]): string[] =>
  entries.map((entry) => entry.trim()).filter((entry) => entry.length > 0);

/**
 * Returns the `after` (inclusive) and `before` (exclusive) bounds of the date filter, counted in whole
 * local days from `now`. The last day of a custom range is included.
 */
export const getDateBounds = (date: DateFilter, now: Date): Pick<SearchQuery, 'after' | 'before'> => {
  const startOfToday = dayjs(now).startOf('day');
  switch (date.preset) {
    case 'anyDate':
      return {};
    case 'today':
      return { after: startOfToday.toISOString() };
    case 'last7Days':
    case 'last30Days':
      return { after: startOfToday.subtract(RECENT_DAYS_BY_PRESET[date.preset] - 1, 'day').toISOString() };
    case 'thisYear':
      return { after: startOfToday.startOf('year').toISOString() };
    case 'lastYear':
      return {
        after: startOfToday.startOf('year').subtract(1, 'year').toISOString(),
        before: startOfToday.startOf('year').toISOString(),
      };
    case 'customRange':
      return {
        after: dayjs(date.startDate).startOf('day').toISOString(),
        before: dayjs(date.endDate).startOf('day').add(1, 'day').toISOString(),
      };
  }
};

/** Builds the search query from the criteria that are set, or returns null when none is. */
export const buildSearchQuery = (criteria: SearchCriteria, now = new Date()): SearchQuery | null => {
  const text = criteria.text.trim();
  const from = removeBlankEntries(criteria.from);
  const to = removeBlankEntries(criteria.to);

  const query: SearchQuery = {
    ...(text ? { text } : {}),
    ...(from.length > 0 ? { from } : {}),
    ...(to.length > 0 ? { to } : {}),
    ...(criteria.hasAttachment ? { hasAttachment: true } : {}),
    ...(criteria.isUnread ? { unread: true } : {}),
    ...getDateBounds(criteria.date, now),
  };
  return Object.keys(query).length > 0 ? query : null;
};

/** Adds the addresses and names in the typed text to the emails, skipping the ones already there. */
export const addEmailEntries = (emails: string[], typedText: string): string[] => {
  const { emails: typedEmails, invalid: typedNames } = parseRecipients(typedText);
  const currentEmails = new Set(emails.map((email) => email.toLowerCase()));
  const newEmails = [...typedEmails, ...typedNames].filter((email) => !currentEmails.has(email.toLowerCase()));
  return [...emails, ...newEmails];
};
