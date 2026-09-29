import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { createEntityAdapter } from '@reduxjs/toolkit';

import { MailboxListState, MailState } from './types';

export const emailsAdapter = createEntityAdapter<EmailSummaryResponse>();

export const createInitialMailboxListState = (): MailboxListState => ({
  emailIds: [],
  hasMoreMails: false,
  failedAnchorIds: [],
  isLoadingFirstPage: false,
  isLoadingNextPage: false,
  isRefreshingNewestEmails: false,
  hasFirstPageFailed: false,
  hasNextPageFailed: false,
  firstPageRequestId: null,
});

export const createInitialMailState = (): MailState => ({
  emails: emailsAdapter.getInitialState(),
  mailboxes: {},
  unreadByMailbox: {},
  mailboxTypeById: {},
  removedEmailIds: [],
  removedEmailCountByRequestId: {},
});
