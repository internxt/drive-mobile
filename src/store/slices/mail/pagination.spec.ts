import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';

import { findNextPageAnchorId, mergeNewestPage, sortNewestFirst } from './pagination';

const anEmail = (id: string, { day = 1, threadId = id }: { day?: number; threadId?: string } = {}) =>
  ({ id, threadId, receivedAt: `2026-09-${String(day).padStart(2, '0')}T10:00:00Z` }) as EmailSummaryResponse;

const ids = (emails: EmailSummaryResponse[]) => emails.map((email) => email.id);

describe('Ordering the emails of a mailbox', () => {
  test('when emails are ordered, then the most recently received comes first', () => {
    expect(
      ids(sortNewestFirst([anEmail('old', { day: 1 }), anEmail('new', { day: 9 }), anEmail('mid', { day: 5 })])),
    ).toEqual(['new', 'mid', 'old']);
  });
});

describe('Choosing where the next page starts', () => {
  test('when nothing has failed, then the next page starts after the oldest email loaded', () => {
    expect(findNextPageAnchorId([anEmail('new', { day: 9 }), anEmail('old', { day: 1 })], new Set())).toBe('old');
  });

  test('when the oldest email already failed as a starting point, then the one before it is used', () => {
    expect(findNextPageAnchorId([anEmail('new', { day: 9 }), anEmail('old', { day: 1 })], new Set(['old']))).toBe(
      'new',
    );
  });

  test('when every email already failed as a starting point, then there is nowhere to start', () => {
    expect(findNextPageAnchorId([anEmail('only')], new Set(['only']))).toBeUndefined();
  });
});

describe('Merging the newest emails over the ones loaded', () => {
  test('when older pages were loaded, then they stay below the newest emails', () => {
    const merged = mergeNewestPage({
      loadedEmails: [anEmail('top', { day: 20 }), anEmail('older-page', { day: 5 })],
      newestEmails: [anEmail('new', { day: 25 }), anEmail('top', { day: 20 })],
      isDraftsMailbox: false,
    });

    expect(ids(merged)).toEqual(['new', 'top', 'older-page']);
  });

  test('when an email is no longer among the newest ones, then it is dropped', () => {
    const merged = mergeNewestPage({
      loadedEmails: [anEmail('kept', { day: 20 }), anEmail('gone', { day: 18 })],
      newestEmails: [anEmail('kept', { day: 20 }), anEmail('also-new', { day: 15 })],
      isDraftsMailbox: false,
    });

    expect(ids(merged)).toEqual(['kept', 'also-new']);
  });

  test('when a conversation comes back with a newer email, then its older row is dropped', () => {
    const merged = mergeNewestPage({
      loadedEmails: [anEmail('question', { day: 5, threadId: 'project' })],
      newestEmails: [anEmail('reply', { day: 25, threadId: 'project' })],
      isDraftsMailbox: false,
    });

    expect(ids(merged)).toEqual(['reply']);
  });

  test('when two drafts share a conversation, then both are kept', () => {
    const merged = mergeNewestPage({
      loadedEmails: [anEmail('first-draft', { day: 5, threadId: 'reply' })],
      newestEmails: [anEmail('second-draft', { day: 25, threadId: 'reply' })],
      isDraftsMailbox: true,
    });

    expect(ids(merged)).toEqual(['second-draft', 'first-draft']);
  });
});
