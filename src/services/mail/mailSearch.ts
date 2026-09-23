import { SearchQuery } from './mailbox.service';

export type SearchCriteria = {
  text: string;
  from: string[];
  to: string[];
  hasAttachment: boolean;
  isUnread: boolean;
};

export const EMPTY_SEARCH_CRITERIA: SearchCriteria = {
  text: '',
  from: [],
  to: [],
  hasAttachment: false,
  isUnread: false,
};

const removeBlankEntries = (entries: string[]): string[] =>
  entries.map((entry) => entry.trim()).filter((entry) => entry.length > 0);

/** Builds the search query from the criteria that are set, or returns null when none is. */
export const buildSearchQuery = (criteria: SearchCriteria): SearchQuery | null => {
  const text = criteria.text.trim();
  const from = removeBlankEntries(criteria.from);
  const to = removeBlankEntries(criteria.to);

  const query: SearchQuery = {
    ...(text ? { text } : {}),
    ...(from.length > 0 ? { from } : {}),
    ...(to.length > 0 ? { to } : {}),
    ...(criteria.hasAttachment ? { hasAttachment: true } : {}),
    ...(criteria.isUnread ? { unread: true } : {}),
  };
  return Object.keys(query).length > 0 ? query : null;
};
