import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { EntityState } from '@reduxjs/toolkit';

import { MailboxId } from '../../../types/mail';

/** How far the list of one mailbox has been loaded, and whether loading it is in progress or failed. */
export type MailboxListState = {
  emailIds: string[];
  hasMoreMails: boolean;
  failedAnchorIds: string[];
  isLoadingFirstPage: boolean;
  isLoadingNextPage: boolean;
  isRefreshingNewestEmails: boolean;
  hasFirstPageFailed: boolean;
  hasNextPageFailed: boolean;
  firstPageRequestId: string | null;
};

export type MailState = {
  emails: EntityState<EmailSummaryResponse>;
  mailboxes: Partial<Record<MailboxId, MailboxListState>>;
};
