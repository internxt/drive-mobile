import { EmailListResponse, MailboxResponse } from '@internxt/sdk/dist/mail/types';
import { createAsyncThunk } from '@reduxjs/toolkit';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import { describeErrorForLog } from '@internxt-mobile/services/mail/errorDescription';
import { decryptListedPreviews } from '@internxt-mobile/services/mail/mailCrypto.service';
import { mailboxService } from '@internxt-mobile/services/mail/mailbox.service';
import { MailboxId } from '../../../types/mail';
import type { RootState } from '../../index';
import { findNextPageAnchorId } from './pagination';
import { selectLoadedEmails, selectMailboxList } from './selectors';
import { MailState } from './types';

const MAX_NEXT_PAGE_ATTEMPTS = 2;

type MailboxThunkArgument = { mailboxId: MailboxId };

type StartedWith = { startedWithFirstPageRequestId: string | null };

export type NextPageResult = StartedWith & { nextPage: EmailListResponse | null };
export type NextPageFailure = StartedWith & { failedAnchorIds: string[] };
export type NewestEmailsResult = StartedWith & { newestPage: EmailListResponse };

/** Lists one page of a mailbox with its previews decrypted. */
const listPageWithDecryptedPreviews = async ({
  mailboxId,
  mnemonic,
  anchorId,
}: {
  mailboxId: MailboxId;
  mnemonic?: string;
  anchorId?: string;
}): Promise<EmailListResponse> =>
  decryptListedPreviews(await mailboxService.listEmails(mailboxId, { anchorId }), mnemonic);

/** Loads the first page of a mailbox, replacing everything loaded in it. */
export const loadFirstPageThunk = createAsyncThunk<EmailListResponse, MailboxThunkArgument, { state: RootState }>(
  'mail/loadFirstPage',
  async ({ mailboxId }, { getState }) => {
    try {
      const firstPage = await listPageWithDecryptedPreviews({ mailboxId, mnemonic: getState().auth.user?.mnemonic });
      return firstPage;
    } catch (error) {
      logger.error(`Failed to list emails for ${mailboxId}`, describeErrorForLog(error));
      throw error;
    }
  },
);

/**
 * Loads the next page of a mailbox, continuing after the oldest email loaded. A page that fails is tried
 * once more from the email before; if that fails too, no further page is loaded until the failure is
 * cleared.
 */
export const loadNextPageThunk = createAsyncThunk<
  NextPageResult,
  MailboxThunkArgument,
  { state: RootState; rejectValue: NextPageFailure }
>(
  'mail/loadNextPage',
  async ({ mailboxId }, { getState, rejectWithValue }) => {
    const startedWithFirstPageRequestId = selectMailboxList(getState(), mailboxId).firstPageRequestId;
    const failedAnchorIds = new Set(selectMailboxList(getState(), mailboxId).failedAnchorIds);

    for (let attempt = 1; attempt <= MAX_NEXT_PAGE_ATTEMPTS; attempt += 1) {
      const loadedEmails = selectLoadedEmails(getState(), mailboxId);
      if (!findNextPageAnchorId(loadedEmails, failedAnchorIds)) {
        failedAnchorIds.clear();
      }
      const anchorId = findNextPageAnchorId(loadedEmails, failedAnchorIds);
      if (!anchorId) {
        return { startedWithFirstPageRequestId, nextPage: null };
      }
      try {
        const nextPage = await listPageWithDecryptedPreviews({
          mailboxId,
          mnemonic: getState().auth.user?.mnemonic,
          anchorId,
        });
        return { startedWithFirstPageRequestId, nextPage };
      } catch (error) {
        logger.error(`Failed to list more emails for ${mailboxId}`, describeErrorForLog(error));
        failedAnchorIds.add(anchorId);
      }
    }

    return rejectWithValue({ startedWithFirstPageRequestId, failedAnchorIds: [...failedAnchorIds] });
  },
  {
    condition: ({ mailboxId }, { getState }) => {
      const { isLoadingNextPage, hasNextPageFailed, hasMoreMails } = selectMailboxList(getState(), mailboxId);
      return !isLoadingNextPage && !hasNextPageFailed && hasMoreMails;
    },
  },
);

/** Loads the first page of a mailbox again and merges it over the emails loaded, keeping older pages. */
export const refreshNewestEmailsThunk = createAsyncThunk<
  NewestEmailsResult,
  MailboxThunkArgument,
  { state: RootState; rejectValue: StartedWith }
>(
  'mail/refreshNewestEmails',
  async ({ mailboxId }, { getState, rejectWithValue }) => {
    const startedWithFirstPageRequestId = selectMailboxList(getState(), mailboxId).firstPageRequestId;
    try {
      const newestPage = await listPageWithDecryptedPreviews({ mailboxId, mnemonic: getState().auth.user?.mnemonic });
      return { startedWithFirstPageRequestId, newestPage };
    } catch (error) {
      logger.error(`Failed to refresh the newest emails of ${mailboxId}`, describeErrorForLog(error));
      return rejectWithValue({ startedWithFirstPageRequestId });
    }
  },
  {
    condition: ({ mailboxId }, { getState }) => !selectMailboxList(getState(), mailboxId).isRefreshingNewestEmails,
  },
);

type MailboxesSummary = Pick<MailState, 'unreadByMailbox' | 'mailboxTypeById'>;

const summarizeMailboxes = (mailboxes: MailboxResponse[]): MailboxesSummary =>
  mailboxes.reduce<MailboxesSummary>(
    (summary, mailbox) => {
      if (mailbox.type) {
        const mailboxId = mailbox.type as MailboxId;
        summary.unreadByMailbox[mailboxId] = mailbox.unreadEmails;
        summary.mailboxTypeById[mailbox.id] = mailboxId;
      }
      return summary;
    },
    { unreadByMailbox: {}, mailboxTypeById: {} },
  );

/** Loads the unread count of every mailbox and the mailbox each mailbox id belongs to. */
export const loadUnreadCountsThunk = createAsyncThunk<MailboxesSummary>('mail/loadUnreadCounts', async () => {
  try {
    const mailboxes = await mailboxService.getMailboxes();
    return summarizeMailboxes(mailboxes);
  } catch (error) {
    logger.error('Failed to load mailbox unread counts', describeErrorForLog(error));
    throw error;
  }
});
