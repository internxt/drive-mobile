import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { createSelector } from '@reduxjs/toolkit';
import { shallowEqual } from 'react-redux';

import { MailboxId } from '../../../types/mail';
import type { RootState } from '../../index';
import { createInitialMailboxListState } from './initialState';
import { sortNewestFirst } from './pagination';
import { MailboxListState } from './types';

const NOT_LOADED_MAILBOX_LIST: MailboxListState = createInitialMailboxListState();

/**
 * @param state - The app state.
 * @param mailboxId - The mailbox.
 * @returns How far the mailbox has been loaded; an empty list when it was never loaded.
 */
export const selectMailboxList = (state: RootState, mailboxId: MailboxId): MailboxListState =>
  state.mail.mailboxes[mailboxId] ?? NOT_LOADED_MAILBOX_LIST;

/**
 * @param state - The app state.
 * @param mailboxId - The mailbox.
 * @returns The emails loaded in the mailbox, in no particular order.
 */
export const selectLoadedEmails = (state: RootState, mailboxId: MailboxId): EmailSummaryResponse[] => {
  const { entities } = state.mail.emails;
  return selectMailboxList(state, mailboxId).emailIds.flatMap((emailId) => {
    const email = entities[emailId];
    return email ? [email] : [];
  });
};

/**
 * Creates a selector of the emails of one mailbox, newest first, that keeps returning the same array while
 * those emails do not change, so a change to another mailbox does not render this one again.
 *
 * @returns The selector.
 */
export const makeSelectMailboxEmails = () =>
  createSelector([selectLoadedEmails], sortNewestFirst, { memoizeOptions: { resultEqualityCheck: shallowEqual } });
