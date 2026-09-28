import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { MailboxId } from '../../../types/mail';
import { createInitialMailboxListState, createInitialMailState, emailsAdapter } from './initialState';
import { mergeNewestPage } from './pagination';
import { loadFirstPageThunk, loadNextPageThunk, loadUnreadCountsThunk, refreshNewestEmailsThunk } from './thunks';
import { MailboxListState, MailState } from './types';

export { loadFirstPageThunk, loadNextPageThunk, loadUnreadCountsThunk, refreshNewestEmailsThunk } from './thunks';
export * from './selectors';

const mailboxListOf = (state: MailState, mailboxId: MailboxId): MailboxListState => {
  const mailboxList = state.mailboxes[mailboxId] ?? createInitialMailboxListState();
  state.mailboxes[mailboxId] = mailboxList;
  return mailboxList;
};

const loadedEmailsOf = (state: MailState, mailboxList: MailboxListState): EmailSummaryResponse[] =>
  mailboxList.emailIds.flatMap((emailId) => {
    const email = state.emails.entities[emailId];
    return email ? [email] : [];
  });

const showOnlyTheseEmails = (state: MailState, mailboxList: MailboxListState, emails: EmailSummaryResponse[]) => {
  emailsAdapter.setMany(state.emails, emails);
  mailboxList.emailIds = emails.map((email) => email.id);
};

const isFromAnEarlierFirstPage = (mailboxList: MailboxListState, startedWithFirstPageRequestId: string | null) =>
  startedWithFirstPageRequestId !== mailboxList.firstPageRequestId;

export const mailSlice = createSlice({
  name: 'mail',
  initialState: createInitialMailState(),
  reducers: {
    resetState: () => createInitialMailState(),
    nextPageRetryRequested: (state, action: PayloadAction<{ mailboxId: MailboxId }>) => {
      mailboxListOf(state, action.payload.mailboxId).hasNextPageFailed = false;
    },
    threadReadStateChanged: (state, action: PayloadAction<{ emailIds: string[]; isRead: boolean }>) => {
      const { emailIds, isRead } = action.payload;
      const loadedEmailIds = emailIds.filter((emailId) => state.emails.entities[emailId]);
      if (loadedEmailIds.length === 0) {
        return;
      }
      emailsAdapter.updateMany(
        state.emails,
        loadedEmailIds.map((emailId) => ({ id: emailId, changes: { isRead } })),
      );
    },
    threadMovedOut: (state, action: PayloadAction<{ emailIds: string[] }>) => {
      const movedEmailIds = new Set(action.payload.emailIds.filter((emailId) => state.emails.entities[emailId]));
      if (movedEmailIds.size === 0) {
        return;
      }
      Object.values(state.mailboxes).forEach((mailboxList) => {
        if (mailboxList) {
          mailboxList.emailIds = mailboxList.emailIds.filter((emailId) => !movedEmailIds.has(emailId));
        }
      });
      emailsAdapter.removeMany(state.emails, [...movedEmailIds]);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadFirstPageThunk.pending, (state, action) => {
        const mailboxList = mailboxListOf(state, action.meta.arg.mailboxId);
        mailboxList.firstPageRequestId = action.meta.requestId;
        mailboxList.hasMoreMails = false;
        mailboxList.failedAnchorIds = [];
        mailboxList.isLoadingNextPage = false;
        mailboxList.hasNextPageFailed = false;
        mailboxList.hasFirstPageFailed = false;
        mailboxList.isLoadingFirstPage = true;
      })
      .addCase(loadFirstPageThunk.fulfilled, (state, action) => {
        const mailboxList = mailboxListOf(state, action.meta.arg.mailboxId);
        if (isFromAnEarlierFirstPage(mailboxList, action.meta.requestId)) {
          return;
        }
        mailboxList.isLoadingFirstPage = false;
        mailboxList.hasMoreMails = action.payload.hasMoreMails;
        showOnlyTheseEmails(state, mailboxList, action.payload.emails);
      })
      .addCase(loadFirstPageThunk.rejected, (state, action) => {
        const mailboxList = mailboxListOf(state, action.meta.arg.mailboxId);
        if (isFromAnEarlierFirstPage(mailboxList, action.meta.requestId)) {
          return;
        }
        mailboxList.isLoadingFirstPage = false;
        mailboxList.hasFirstPageFailed = true;
      })
      .addCase(loadNextPageThunk.pending, (state, action) => {
        const mailboxList = mailboxListOf(state, action.meta.arg.mailboxId);
        mailboxList.isLoadingNextPage = true;
        mailboxList.hasNextPageFailed = false;
      })
      .addCase(loadNextPageThunk.fulfilled, (state, action) => {
        const mailboxList = mailboxListOf(state, action.meta.arg.mailboxId);
        const { startedWithFirstPageRequestId, nextPage } = action.payload;
        if (isFromAnEarlierFirstPage(mailboxList, startedWithFirstPageRequestId)) {
          return;
        }
        mailboxList.isLoadingNextPage = false;
        mailboxList.failedAnchorIds = [];
        if (!nextPage) {
          return;
        }
        mailboxList.hasMoreMails = nextPage.hasMoreMails;
        emailsAdapter.setMany(state.emails, nextPage.emails);
        const loadedEmailIds = new Set(mailboxList.emailIds);
        mailboxList.emailIds.push(
          ...nextPage.emails.map((email) => email.id).filter((emailId) => !loadedEmailIds.has(emailId)),
        );
      })
      .addCase(loadNextPageThunk.rejected, (state, action) => {
        const mailboxList = mailboxListOf(state, action.meta.arg.mailboxId);
        if (!action.payload || isFromAnEarlierFirstPage(mailboxList, action.payload.startedWithFirstPageRequestId)) {
          return;
        }
        mailboxList.isLoadingNextPage = false;
        mailboxList.failedAnchorIds = action.payload.failedAnchorIds;
        mailboxList.hasNextPageFailed = true;
      })
      .addCase(refreshNewestEmailsThunk.pending, (state, action) => {
        mailboxListOf(state, action.meta.arg.mailboxId).isRefreshingNewestEmails = true;
      })
      .addCase(refreshNewestEmailsThunk.fulfilled, (state, action) => {
        const { mailboxId } = action.meta.arg;
        const mailboxList = mailboxListOf(state, mailboxId);
        const { startedWithFirstPageRequestId, newestPage } = action.payload;
        mailboxList.isRefreshingNewestEmails = false;
        if (isFromAnEarlierFirstPage(mailboxList, startedWithFirstPageRequestId)) {
          return;
        }
        mailboxList.hasFirstPageFailed = false;
        if (!newestPage.hasMoreMails) {
          mailboxList.hasMoreMails = false;
          showOnlyTheseEmails(state, mailboxList, newestPage.emails);
          return;
        }
        mailboxList.hasMoreMails = true;
        showOnlyTheseEmails(
          state,
          mailboxList,
          mergeNewestPage({
            loadedEmails: loadedEmailsOf(state, mailboxList),
            newestEmails: newestPage.emails,
            isDraftsMailbox: mailboxId === MailboxId.Drafts,
          }),
        );
      })
      .addCase(refreshNewestEmailsThunk.rejected, (state, action) => {
        const mailboxList = mailboxListOf(state, action.meta.arg.mailboxId);
        mailboxList.isRefreshingNewestEmails = false;
        if (!action.payload || isFromAnEarlierFirstPage(mailboxList, action.payload.startedWithFirstPageRequestId)) {
          return;
        }
        mailboxList.hasFirstPageFailed = true;
      })
      .addCase(loadUnreadCountsThunk.fulfilled, (state, action) => {
        state.unreadByMailbox = action.payload;
      });
  },
});

export const mailActions = mailSlice.actions;

export default mailSlice.reducer;
