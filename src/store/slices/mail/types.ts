import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { EntityState } from '@reduxjs/toolkit';

import { MailboxId } from '../../../types/mail';

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
  unreadByMailbox: Partial<Record<MailboxId, number>>;
  mailboxTypeById: Record<string, MailboxId>;
  removedEmailIds: string[];
  removedEmailCountByRequestId: Record<string, number>;
};

export type EmailSnapshot = Pick<EmailSummaryResponse, 'id' | 'mailboxIds' | 'isRead'>;

export type EmailMove = { email: EmailSnapshot; toMailboxId: MailboxId };
