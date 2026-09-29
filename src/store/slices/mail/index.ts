import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { createSlice, isAnyOf, isFulfilled, isPending, isRejected, PayloadAction } from '@reduxjs/toolkit';

import { MailboxId } from '../../../types/mail';
import { createInitialMailboxListState, createInitialMailState, emailsAdapter } from './initialState';
import { mergeNewestPage } from './pagination';
import { loadFirstPageThunk, loadNextPageThunk, loadUnreadCountsThunk, refreshNewestEmailsThunk } from './thunks';
import { EmailMove, EmailSnapshot, MailboxListState, MailState } from './types';

export * from './selectors';
export { loadFirstPageThunk, loadNextPageThunk, loadUnreadCountsThunk, refreshNewestEmailsThunk } from './thunks';
export type { EmailMove } from './types';

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

const updateUnreadCount = (state: MailState, mailboxId: MailboxId, difference: number) => {
  const unreadCount = state.unreadByMailbox[mailboxId];
  if (unreadCount !== undefined) {
    state.unreadByMailbox[mailboxId] = Math.max(0, unreadCount + difference);
  }
};

const updateUnreadCountOfEmailMailboxes = (state: MailState, email: EmailSnapshot, difference: number) => {
  email.mailboxIds.forEach((id) => {
    const mailboxId = state.mailboxTypeById[id];
    if (mailboxId) {
      updateUnreadCount(state, mailboxId, difference);
    }
  });
};

const removeEmails = (state: MailState, emailIds: string[]) => {
  const isAnyListRequestInFlight = Object.keys(state.removedEmailCountByRequestId).length > 0;
  if (isAnyListRequestInFlight) {
    state.removedEmailIds.push(...emailIds);
  }
  const loadedEmailIds = new Set(emailIds.filter((emailId) => state.emails.entities[emailId]));
  if (loadedEmailIds.size === 0) {
    return;
  }
  Object.values(state.mailboxes).forEach((mailboxList) => {
    if (mailboxList) {
      mailboxList.emailIds = mailboxList.emailIds.filter((emailId) => !loadedEmailIds.has(emailId));
    }
  });
  emailsAdapter.removeMany(state.emails, [...loadedEmailIds]);
};

const excludeEmailsRemovedSinceListRequest = (
  state: MailState,
  requestId: string,
  emails: EmailSummaryResponse[],
): EmailSummaryResponse[] => {
  const removedEmailCount = state.removedEmailCountByRequestId[requestId] ?? state.removedEmailIds.length;
  const emailIdsRemovedSinceRequest = new Set(state.removedEmailIds.slice(removedEmailCount));
  return emails.filter((email) => !emailIdsRemovedSinceRequest.has(email.id));
};

const LIST_THUNKS = [loadFirstPageThunk, loadNextPageThunk, refreshNewestEmailsThunk] as const;

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
    threadReadStateChanged: (state, action: PayloadAction<{ emails: EmailSnapshot[]; isRead: boolean }>) => {
      const { emails, isRead } = action.payload;
      const changedEmails = emails.filter((email) => email.isRead !== isRead);
      changedEmails.forEach((email) => updateUnreadCountOfEmailMailboxes(state, email, isRead ? -1 : 1));
      const loadedEmailIds = changedEmails.map((email) => email.id).filter((emailId) => state.emails.entities[emailId]);
      if (loadedEmailIds.length > 0) {
        emailsAdapter.updateMany(
          state.emails,
          loadedEmailIds.map((emailId) => ({ id: emailId, changes: { isRead } })),
        );
      }
    },
    threadMovedOut: (state, action: PayloadAction<{ moves: EmailMove[] }>) => {
      const { moves } = action.payload;
      moves
        .filter(({ email }) => !email.isRead)
        .forEach(({ email, toMailboxId }) => {
          updateUnreadCountOfEmailMailboxes(state, email, -1);
          updateUnreadCount(state, toMailboxId, 1);
        });
      removeEmails(
        state,
        moves.map(({ email }) => email.id),
      );
    },
    threadDeleted: (state, action: PayloadAction<{ emails: EmailSnapshot[] }>) => {
      const { emails } = action.payload;
      emails.filter((email) => !email.isRead).forEach((email) => updateUnreadCountOfEmailMailboxes(state, email, -1));
      removeEmails(
        state,
        emails.map((email) => email.id),
      );
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
        showOnlyTheseEmails(
          state,
          mailboxList,
          excludeEmailsRemovedSinceListRequest(state, action.meta.requestId, action.payload.emails),
        );
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
        const nextPageEmails = excludeEmailsRemovedSinceListRequest(state, action.meta.requestId, nextPage.emails);
        emailsAdapter.setMany(state.emails, nextPageEmails);
        const loadedEmailIds = new Set(mailboxList.emailIds);
        mailboxList.emailIds.push(
          ...nextPageEmails.map((email) => email.id).filter((emailId) => !loadedEmailIds.has(emailId)),
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
        const newestEmails = excludeEmailsRemovedSinceListRequest(state, action.meta.requestId, newestPage.emails);
        if (!newestPage.hasMoreMails) {
          mailboxList.hasMoreMails = false;
          showOnlyTheseEmails(state, mailboxList, newestEmails);
          return;
        }
        mailboxList.hasMoreMails = true;
        showOnlyTheseEmails(
          state,
          mailboxList,
          mergeNewestPage({
            loadedEmails: loadedEmailsOf(state, mailboxList),
            newestEmails,
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
        state.unreadByMailbox = action.payload.unreadByMailbox;
        state.mailboxTypeById = action.payload.mailboxTypeById;
      })
      .addMatcher(isPending(...LIST_THUNKS), (state, action) => {
        state.removedEmailCountByRequestId[action.meta.requestId] = state.removedEmailIds.length;
      })
      .addMatcher(isAnyOf(isFulfilled(...LIST_THUNKS), isRejected(...LIST_THUNKS)), (state, action) => {
        delete state.removedEmailCountByRequestId[action.meta.requestId];
        if (Object.keys(state.removedEmailCountByRequestId).length === 0) {
          state.removedEmailIds = [];
        }
      });
  },
});

export const mailActions = mailSlice.actions;

export default mailSlice.reducer;
