import { EmailListResponse, EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { configureStore } from '@reduxjs/toolkit';

import { decryptListedPreviews } from '@internxt-mobile/services/mail/mailCrypto.service';
import { mailboxService } from '@internxt-mobile/services/mail/mailbox.service';
import { MailboxId } from '../../../types/mail';
import type { AppDispatch, RootState } from '../../index';
import mailReducer, {
  loadFirstPageThunk,
  loadNextPageThunk,
  loadUnreadCountsThunk,
  mailActions,
  makeSelectMailboxEmails,
  refreshNewestEmailsThunk,
  selectMailboxList,
  selectMailboxTypeById,
  selectUnreadByMailbox,
} from './index';

jest.mock('@internxt-mobile/services/mail/mailbox.service', () => ({
  mailboxService: { listEmails: jest.fn(), getMailboxes: jest.fn() },
}));

jest.mock('@internxt-mobile/services/mail/mailCrypto.service', () => ({
  decryptListedPreviews: jest.fn(),
}));

jest.mock('@internxt-mobile/services/common/logger/logger.service', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const listEmailsMock = mailboxService.listEmails as jest.Mock;
const getMailboxesMock = mailboxService.getMailboxes as jest.Mock;
const decryptListedPreviewsMock = decryptListedPreviews as jest.Mock;

const A_MNEMONIC = 'a mnemonic';
const SERVER_UNREACHABLE = new Error('the server is unreachable');

const anEmail = (
  id: string,
  { day = 1, threadId = id, isRead = true }: { day?: number; threadId?: string; isRead?: boolean } = {},
): EmailSummaryResponse =>
  ({
    id,
    threadId,
    receivedAt: `2026-09-${String(day).padStart(2, '0')}T10:00:00Z`,
    isRead,
    hasAttachment: false,
    preview: '',
  }) as EmailSummaryResponse;

const aPage = (emails: EmailSummaryResponse[], { hasMoreMails = false }: { hasMoreMails?: boolean } = {}) =>
  ({ emails, total: emails.length, hasMoreMails }) as EmailListResponse;

const pageThatArrivesWhenTold = () => {
  let deliverPage: (page: EmailListResponse) => void = () => undefined;
  listEmailsMock.mockImplementationOnce(
    () =>
      new Promise<EmailListResponse>((resolve) => {
        deliverPage = resolve;
      }),
  );
  return { deliver: (page: EmailListResponse) => deliverPage(page) };
};

const lastAnchorAskedFor = () => listEmailsMock.mock.calls.at(-1)?.[1]?.anchorId;

const createMailStore = ({ mnemonic }: { mnemonic?: string } = { mnemonic: A_MNEMONIC }) => {
  const store = configureStore({
    reducer: { mail: mailReducer, auth: () => ({ user: mnemonic ? { mnemonic } : undefined }) },
  });
  const getState = () => store.getState() as unknown as RootState;
  const selectMailboxEmails = makeSelectMailboxEmails();
  return {
    dispatch: store.dispatch as AppDispatch,
    getState,
    shownIds: (mailboxId: MailboxId = MailboxId.Inbox) =>
      selectMailboxEmails(getState(), mailboxId).map((email) => email.id),
    shownEmails: (mailboxId: MailboxId = MailboxId.Inbox) => selectMailboxEmails(getState(), mailboxId),
    listOf: (mailboxId: MailboxId = MailboxId.Inbox) => selectMailboxList(getState(), mailboxId),
    unreadByMailbox: () => selectUnreadByMailbox(getState()),
  };
};

const ID_OF_MAILBOX: Record<MailboxId, string> = {
  [MailboxId.Inbox]: 'id-of-inbox',
  [MailboxId.Sent]: 'id-of-sent',
  [MailboxId.Drafts]: 'id-of-drafts',
  [MailboxId.Spam]: 'id-of-spam',
  [MailboxId.Trash]: 'id-of-trash',
};

const aMailboxWithUnread = (mailboxId: MailboxId, unreadEmails: number) => ({
  id: ID_OF_MAILBOX[mailboxId],
  type: mailboxId,
  unreadEmails,
});

const anEmailIn = (id: string, mailboxIds: MailboxId[], { isRead = true }: { isRead?: boolean } = {}) => ({
  id,
  mailboxIds: mailboxIds.map((mailboxId) => ID_OF_MAILBOX[mailboxId]),
  isRead,
});

const inbox = { mailboxId: MailboxId.Inbox };

describe('Scrolling through a mailbox', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    decryptListedPreviewsMock.mockImplementation(async (page: EmailListResponse) => page);
  });

  describe('Loading pages', () => {
    test('when the mailbox is opened, then its first page is listed newest first', async () => {
      listEmailsMock.mockResolvedValueOnce(
        aPage([anEmail('oldest', { day: 1 }), anEmail('newest', { day: 3 }), anEmail('middle', { day: 2 })]),
      );
      const mail = createMailStore();

      await mail.dispatch(loadFirstPageThunk(inbox));

      expect(mail.shownIds()).toEqual(['newest', 'middle', 'oldest']);
    });

    test('when the end of the list is reached, then the next page is added below what was already loaded', async () => {
      listEmailsMock
        .mockResolvedValueOnce(aPage([anEmail('recent', { day: 20 })], { hasMoreMails: true }))
        .mockResolvedValueOnce(aPage([anEmail('older', { day: 10 })]));
      const mail = createMailStore();

      await mail.dispatch(loadFirstPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      expect(mail.shownIds()).toEqual(['recent', 'older']);
    });

    test('when the server says no more emails remain, then reaching the end asks for nothing else', async () => {
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('only')]));
      const mail = createMailStore();

      await mail.dispatch(loadFirstPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      expect(listEmailsMock).toHaveBeenCalledTimes(1);
    });

    test('when the end is reached again while a page is still arriving, then that page is asked for only once', async () => {
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('recent', { day: 20 })], { hasMoreMails: true }));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      const nextPage = pageThatArrivesWhenTold();

      const nextPageLoad = mail.dispatch(loadNextPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      expect(listEmailsMock).toHaveBeenCalledTimes(2);
      nextPage.deliver(aPage([anEmail('older', { day: 10 })]));
      await nextPageLoad;
    });

    test('when an email comes back in a later page, then it is still shown once', async () => {
      listEmailsMock
        .mockResolvedValueOnce(aPage([anEmail('repeated', { day: 20 })], { hasMoreMails: true }))
        .mockResolvedValueOnce(aPage([anEmail('repeated', { day: 20 }), anEmail('older', { day: 10 })]));
      const mail = createMailStore();

      await mail.dispatch(loadFirstPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      expect(mail.shownIds()).toEqual(['repeated', 'older']);
    });

    test('when the list is reloaded while a further page is still arriving, then that page does not end up in the reloaded list', async () => {
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('recent', { day: 20 })], { hasMoreMails: true }));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      const pageFromBeforeTheReload = pageThatArrivesWhenTold();
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('just-arrived', { day: 25 })]));

      const staleNextPageLoad = mail.dispatch(loadNextPageThunk(inbox));
      await mail.dispatch(loadFirstPageThunk(inbox));
      pageFromBeforeTheReload.deliver(aPage([anEmail('stale', { day: 5 })]));
      await staleNextPageLoad;

      expect(mail.shownIds()).toEqual(['just-arrived']);
      expect(mail.listOf().isLoadingNextPage).toBe(false);
    });

    test('when reloading fails, then the emails already shown stay', async () => {
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('recent')])).mockRejectedValueOnce(SERVER_UNREACHABLE);
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));

      await mail.dispatch(loadFirstPageThunk(inbox));

      expect(mail.listOf().hasFirstPageFailed).toBe(true);
      expect(mail.shownIds()).toEqual(['recent']);
    });

    test('when a page is listed, then its previews are shown decrypted for the signed-in account', async () => {
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('encrypted')]));
      decryptListedPreviewsMock.mockImplementationOnce(async (page: EmailListResponse) => ({
        ...page,
        emails: page.emails.map((email) => ({ ...email, preview: 'The decrypted preview' })),
      }));
      const mail = createMailStore();

      await mail.dispatch(loadFirstPageThunk(inbox));

      expect(decryptListedPreviewsMock).toHaveBeenCalledWith(expect.anything(), A_MNEMONIC);
      expect(mail.shownEmails()[0].preview).toBe('The decrypted preview');
    });
  });

  describe('Choosing where the next page starts', () => {
    test('when the next page is asked for, then it starts from the oldest email loaded', async () => {
      listEmailsMock
        .mockResolvedValueOnce(
          aPage([anEmail('newest', { day: 20 }), anEmail('oldest', { day: 5 }), anEmail('middle', { day: 10 })], {
            hasMoreMails: true,
          }),
        )
        .mockResolvedValueOnce(aPage([]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));

      await mail.dispatch(loadNextPageThunk(inbox));

      expect(lastAnchorAskedFor()).toBe('oldest');
    });

    test('when a further page fails, then it is tried once more from the email before the one that failed', async () => {
      listEmailsMock
        .mockResolvedValueOnce(
          aPage([anEmail('newer', { day: 20 }), anEmail('last', { day: 10 })], { hasMoreMails: true }),
        )
        .mockRejectedValueOnce(SERVER_UNREACHABLE)
        .mockResolvedValueOnce(aPage([anEmail('older', { day: 5 })]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));

      await mail.dispatch(loadNextPageThunk(inbox));

      expect(listEmailsMock.mock.calls[1][1]).toEqual({ anchorId: 'last' });
      expect(listEmailsMock.mock.calls[2][1]).toEqual({ anchorId: 'newer' });
      expect(mail.listOf().hasNextPageFailed).toBe(false);
    });

    test('when a further page fails twice, then reaching the end again asks for nothing until the user retries', async () => {
      listEmailsMock
        .mockResolvedValueOnce(
          aPage([anEmail('newer', { day: 20 }), anEmail('last', { day: 10 })], { hasMoreMails: true }),
        )
        .mockRejectedValueOnce(SERVER_UNREACHABLE)
        .mockRejectedValueOnce(SERVER_UNREACHABLE);
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));

      await mail.dispatch(loadNextPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      expect(mail.listOf().hasNextPageFailed).toBe(true);
      expect(listEmailsMock).toHaveBeenCalledTimes(3);
    });

    test('when the user retries a further page, then it starts from the email before the last one that failed', async () => {
      listEmailsMock
        .mockResolvedValueOnce(
          aPage([anEmail('first', { day: 30 }), anEmail('second', { day: 20 }), anEmail('third', { day: 10 })], {
            hasMoreMails: true,
          }),
        )
        .mockRejectedValueOnce(SERVER_UNREACHABLE)
        .mockRejectedValueOnce(SERVER_UNREACHABLE)
        .mockResolvedValueOnce(aPage([anEmail('older', { day: 5 })]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      mail.dispatch(mailActions.nextPageRetryRequested(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      expect(lastAnchorAskedFor()).toBe('first');
      expect(mail.listOf().hasNextPageFailed).toBe(false);
    });

    test('when a further page loads after failing, then the emails already loaded stay and the new ones are added', async () => {
      listEmailsMock
        .mockResolvedValueOnce(
          aPage([anEmail('first', { day: 30 }), anEmail('second', { day: 20 }), anEmail('third', { day: 10 })], {
            hasMoreMails: true,
          }),
        )
        .mockRejectedValueOnce(SERVER_UNREACHABLE)
        .mockRejectedValueOnce(SERVER_UNREACHABLE)
        .mockResolvedValueOnce(aPage([anEmail('older', { day: 5 })]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      mail.dispatch(mailActions.nextPageRetryRequested(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      expect(mail.shownIds()).toEqual(['first', 'second', 'third', 'older']);
    });

    test('when the last loaded email is moved out of the mailbox, then the next page starts from the one before it', async () => {
      listEmailsMock
        .mockResolvedValueOnce(
          aPage([anEmail('newer', { day: 20 }), anEmail('last', { day: 10 })], { hasMoreMails: true }),
        )
        .mockResolvedValueOnce(aPage([]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));

      mail.dispatch(
        mailActions.threadMovedOut({
          moves: [{ email: anEmailIn('last', [MailboxId.Inbox]), toMailboxId: MailboxId.Trash }],
        }),
      );
      await mail.dispatch(loadNextPageThunk(inbox));

      expect(lastAnchorAskedFor()).toBe('newer');
    });

    test('when the mailbox is reloaded from scratch, then emails that failed as a starting point can be used again', async () => {
      const firstPage = aPage(
        [anEmail('first', { day: 30 }), anEmail('second', { day: 20 }), anEmail('third', { day: 10 })],
        {
          hasMoreMails: true,
        },
      );
      listEmailsMock
        .mockResolvedValueOnce(firstPage)
        .mockRejectedValueOnce(SERVER_UNREACHABLE)
        .mockRejectedValueOnce(SERVER_UNREACHABLE)
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(aPage([]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      await mail.dispatch(loadFirstPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      expect(lastAnchorAskedFor()).toBe('third');
    });

    test('when every loaded email has already failed as a starting point, then the retry starts again from the oldest one', async () => {
      listEmailsMock
        .mockResolvedValueOnce(
          aPage([anEmail('newer', { day: 20 }), anEmail('last', { day: 10 })], { hasMoreMails: true }),
        )
        .mockRejectedValueOnce(SERVER_UNREACHABLE)
        .mockRejectedValueOnce(SERVER_UNREACHABLE)
        .mockResolvedValueOnce(aPage([anEmail('older', { day: 5 })]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      mail.dispatch(mailActions.nextPageRetryRequested(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      expect(lastAnchorAskedFor()).toBe('last');
      expect(mail.shownIds()).toEqual(['newer', 'last', 'older']);
    });
  });

  describe('Coming back to the mailbox', () => {
    test('when the mailbox is shown again, then new emails appear at the top and the pages already loaded stay', async () => {
      listEmailsMock
        .mockResolvedValueOnce(
          aPage([anEmail('top', { day: 20 }), anEmail('below', { day: 15 })], { hasMoreMails: true }),
        )
        .mockResolvedValueOnce(aPage([anEmail('second-page', { day: 10 })]))
        .mockResolvedValueOnce(
          aPage([anEmail('new', { day: 25 }), anEmail('top', { day: 20 })], { hasMoreMails: true }),
        );
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      await mail.dispatch(refreshNewestEmailsThunk(inbox));

      expect(mail.shownIds()).toEqual(['new', 'top', 'below', 'second-page']);
    });

    test('when the mailbox is shown again, then an email that is gone from among the newest ones disappears', async () => {
      listEmailsMock
        .mockResolvedValueOnce(
          aPage([anEmail('kept', { day: 20 }), anEmail('gone', { day: 18 }), anEmail('also-kept', { day: 15 })], {
            hasMoreMails: true,
          }),
        )
        .mockResolvedValueOnce(
          aPage([anEmail('kept', { day: 20 }), anEmail('also-kept', { day: 15 })], { hasMoreMails: true }),
        );
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));

      await mail.dispatch(refreshNewestEmailsThunk(inbox));

      expect(mail.shownIds()).toEqual(['kept', 'also-kept']);
    });

    test('when the mailbox is shown again and a thread got a reply, then that thread is shown once', async () => {
      listEmailsMock
        .mockResolvedValueOnce(
          aPage([anEmail('newsletter', { day: 20 }), anEmail('project-question', { day: 10, threadId: 'project' })], {
            hasMoreMails: true,
          }),
        )
        .mockResolvedValueOnce(aPage([anEmail('invoice', { day: 5 })]))
        .mockResolvedValueOnce(
          aPage([anEmail('project-reply', { day: 25, threadId: 'project' }), anEmail('newsletter', { day: 20 })], {
            hasMoreMails: true,
          }),
        );
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      await mail.dispatch(refreshNewestEmailsThunk(inbox));

      expect(mail.shownIds()).toEqual(['project-reply', 'newsletter', 'invoice']);
    });

    test('when two drafts of the same thread are refreshed, then both stay listed', async () => {
      const drafts = { mailboxId: MailboxId.Drafts };
      listEmailsMock
        .mockResolvedValueOnce(
          aPage([anEmail('first-draft', { day: 20, threadId: 'reply' }), anEmail('other', { day: 18 })], {
            hasMoreMails: true,
          }),
        )
        .mockResolvedValueOnce(aPage([anEmail('second-draft', { day: 10, threadId: 'reply' })]))
        .mockResolvedValueOnce(
          aPage([anEmail('first-draft', { day: 20, threadId: 'reply' }), anEmail('other', { day: 18 })], {
            hasMoreMails: true,
          }),
        );
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(drafts));
      await mail.dispatch(loadNextPageThunk(drafts));

      await mail.dispatch(refreshNewestEmailsThunk(drafts));

      expect(mail.shownIds(MailboxId.Drafts)).toEqual(['first-draft', 'other', 'second-draft']);
    });

    test('when the whole mailbox fits in one page and is shown again, then it matches what the server has', async () => {
      listEmailsMock
        .mockResolvedValueOnce(aPage([anEmail('deleted-elsewhere', { day: 20 }), anEmail('kept', { day: 10 })]))
        .mockResolvedValueOnce(aPage([anEmail('kept', { day: 10 })]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));

      await mail.dispatch(refreshNewestEmailsThunk(inbox));

      expect(mail.shownIds()).toEqual(['kept']);
    });

    test('when the mailbox had nothing more to load and grew past a page, then reaching the end loads the rest', async () => {
      listEmailsMock
        .mockResolvedValueOnce(aPage([anEmail('old', { day: 10 })]))
        .mockResolvedValueOnce(aPage([anEmail('new', { day: 20 })], { hasMoreMails: true }))
        .mockResolvedValueOnce(aPage([]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));

      await mail.dispatch(refreshNewestEmailsThunk(inbox));
      await mail.dispatch(loadNextPageThunk(inbox));

      expect(listEmailsMock).toHaveBeenCalledTimes(3);
      expect(lastAnchorAskedFor()).toBe('old');
    });

    test('when refreshing the newest emails fails, then the emails already shown stay', async () => {
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('recent')])).mockRejectedValueOnce(SERVER_UNREACHABLE);
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));

      await mail.dispatch(refreshNewestEmailsThunk(inbox));

      expect(mail.shownIds()).toEqual(['recent']);
      expect(mail.listOf().hasFirstPageFailed).toBe(true);
    });

    test('when the mailbox is shown again while a further page is arriving, then that page is still added', async () => {
      listEmailsMock.mockResolvedValueOnce(
        aPage([anEmail('top', { day: 20 }), anEmail('below', { day: 15 })], { hasMoreMails: true }),
      );
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      const nextPage = pageThatArrivesWhenTold();
      listEmailsMock.mockResolvedValueOnce(
        aPage([anEmail('top', { day: 20 }), anEmail('below', { day: 15 })], { hasMoreMails: true }),
      );

      const nextPageLoad = mail.dispatch(loadNextPageThunk(inbox));
      await mail.dispatch(refreshNewestEmailsThunk(inbox));
      nextPage.deliver(aPage([anEmail('older', { day: 5 })]));
      await nextPageLoad;

      expect(mail.shownIds()).toEqual(['top', 'below', 'older']);
    });
  });

  describe('Applying what was done in an email', () => {
    test('when an email is marked as read elsewhere, then its row stops being unread without asking the server', async () => {
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('unread', { isRead: false })]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));

      mail.dispatch(
        mailActions.threadReadStateChanged({
          emails: [anEmailIn('unread', [MailboxId.Inbox], { isRead: false })],
          isRead: true,
        }),
      );

      expect(mail.shownEmails()[0].isRead).toBe(true);
      expect(listEmailsMock).toHaveBeenCalledTimes(1);
    });

    test('when a thread is moved out of the mailbox, then its row disappears without asking the server', async () => {
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('moved', { day: 20 }), anEmail('stays', { day: 10 })]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));

      mail.dispatch(
        mailActions.threadMovedOut({
          moves: [{ email: anEmailIn('moved', [MailboxId.Inbox]), toMailboxId: MailboxId.Trash }],
        }),
      );

      expect(mail.shownIds()).toEqual(['stays']);
      expect(listEmailsMock).toHaveBeenCalledTimes(1);
    });

    test('when a thread is deleted for good, then its row disappears without asking the server', async () => {
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('deleted', { day: 20 }), anEmail('stays', { day: 10 })]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk({ mailboxId: MailboxId.Trash }));

      mail.dispatch(mailActions.threadDeleted({ emails: [anEmailIn('deleted', [MailboxId.Trash])] }));

      expect(mail.shownIds(MailboxId.Trash)).toEqual(['stays']);
      expect(listEmailsMock).toHaveBeenCalledTimes(1);
    });

    test('when a thread is moved while the mailbox is being refreshed, then the refresh does not bring it back', async () => {
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('moved', { day: 20 }), anEmail('stays', { day: 10 })]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      const staleRefresh = pageThatArrivesWhenTold();
      const refresh = mail.dispatch(refreshNewestEmailsThunk(inbox));

      mail.dispatch(
        mailActions.threadMovedOut({
          moves: [{ email: anEmailIn('moved', [MailboxId.Inbox]), toMailboxId: MailboxId.Trash }],
        }),
      );
      staleRefresh.deliver(aPage([anEmail('moved', { day: 20 }), anEmail('stays', { day: 10 })]));
      await refresh;

      expect(mail.shownIds()).toEqual(['stays']);
    });

    test('when a moved email comes back in a list asked for after the move, then it is shown', async () => {
      listEmailsMock
        .mockResolvedValueOnce(aPage([anEmail('restored', { day: 20 })]))
        .mockResolvedValueOnce(aPage([anEmail('restored', { day: 20 })]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      mail.dispatch(
        mailActions.threadMovedOut({
          moves: [{ email: anEmailIn('restored', [MailboxId.Inbox]), toMailboxId: MailboxId.Trash }],
        }),
      );

      await mail.dispatch(refreshNewestEmailsThunk(inbox));

      expect(mail.shownIds()).toEqual(['restored']);
    });

    test('when a change is about an email that is not loaded, then nothing changes', async () => {
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('loaded')]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      const mailStateBeforeTheChange = mail.getState().mail;

      mail.dispatch(
        mailActions.threadReadStateChanged({ emails: [anEmailIn('elsewhere', [MailboxId.Inbox])], isRead: false }),
      );
      mail.dispatch(
        mailActions.threadMovedOut({
          moves: [{ email: anEmailIn('elsewhere', [MailboxId.Inbox]), toMailboxId: MailboxId.Trash }],
        }),
      );

      expect(mail.getState().mail).toBe(mailStateBeforeTheChange);
    });

    test('when an email shown in two mailboxes is read, then both mailboxes show it read', async () => {
      listEmailsMock
        .mockResolvedValueOnce(aPage([anEmail('shared', { isRead: false })]))
        .mockResolvedValueOnce(aPage([anEmail('shared', { isRead: false })]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      await mail.dispatch(loadFirstPageThunk({ mailboxId: MailboxId.Spam }));

      mail.dispatch(
        mailActions.threadReadStateChanged({
          emails: [anEmailIn('shared', [MailboxId.Inbox], { isRead: false })],
          isRead: true,
        }),
      );

      expect(mail.shownEmails()[0].isRead).toBe(true);
      expect(mail.shownEmails(MailboxId.Spam)[0].isRead).toBe(true);
    });

    test('when an email shown in two mailboxes is moved out, then it disappears from both', async () => {
      listEmailsMock
        .mockResolvedValueOnce(aPage([anEmail('shared')]))
        .mockResolvedValueOnce(aPage([anEmail('shared')]));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));
      await mail.dispatch(loadFirstPageThunk({ mailboxId: MailboxId.Spam }));

      mail.dispatch(
        mailActions.threadMovedOut({
          moves: [{ email: anEmailIn('shared', [MailboxId.Inbox]), toMailboxId: MailboxId.Trash }],
        }),
      );

      expect(mail.shownIds()).toEqual([]);
      expect(mail.shownIds(MailboxId.Spam)).toEqual([]);
      expect(mail.listOf(MailboxId.Spam).emailIds).toEqual([]);
    });
  });

  describe('Unread counts', () => {
    test('when the mailboxes are loaded, then their unread counts are saved', async () => {
      getMailboxesMock.mockResolvedValueOnce([
        aMailboxWithUnread(MailboxId.Inbox, 3),
        aMailboxWithUnread(MailboxId.Spam, 1),
      ]);
      const mail = createMailStore();

      await mail.dispatch(loadUnreadCountsThunk());

      expect(mail.unreadByMailbox()).toEqual({ [MailboxId.Inbox]: 3, [MailboxId.Spam]: 1 });
    });

    test('when loading the unread counts fails, then the counts already saved are kept', async () => {
      getMailboxesMock.mockResolvedValueOnce([aMailboxWithUnread(MailboxId.Inbox, 3)]);
      const mail = createMailStore();
      await mail.dispatch(loadUnreadCountsThunk());
      getMailboxesMock.mockRejectedValueOnce(SERVER_UNREACHABLE);

      await mail.dispatch(loadUnreadCountsThunk());

      expect(mail.unreadByMailbox()).toEqual({ [MailboxId.Inbox]: 3 });
    });

    test('when an unread email is read, then the count of its mailbox goes down without asking the server', async () => {
      getMailboxesMock.mockResolvedValueOnce([aMailboxWithUnread(MailboxId.Inbox, 3)]);
      const mail = createMailStore();
      await mail.dispatch(loadUnreadCountsThunk());

      mail.dispatch(
        mailActions.threadReadStateChanged({
          emails: [anEmailIn('unread', [MailboxId.Inbox], { isRead: false })],
          isRead: true,
        }),
      );

      expect(mail.unreadByMailbox()[MailboxId.Inbox]).toBe(2);
      expect(getMailboxesMock).toHaveBeenCalledTimes(1);
    });

    test('when a read email is marked as unread, then the count of its mailbox goes up', async () => {
      getMailboxesMock.mockResolvedValueOnce([aMailboxWithUnread(MailboxId.Spam, 1)]);
      const mail = createMailStore();
      await mail.dispatch(loadUnreadCountsThunk());

      mail.dispatch(
        mailActions.threadReadStateChanged({ emails: [anEmailIn('read', [MailboxId.Spam])], isRead: false }),
      );

      expect(mail.unreadByMailbox()[MailboxId.Spam]).toBe(2);
    });

    test('when an email is marked with the state it already had, then no count changes', async () => {
      getMailboxesMock.mockResolvedValueOnce([aMailboxWithUnread(MailboxId.Inbox, 3)]);
      const mail = createMailStore();
      await mail.dispatch(loadUnreadCountsThunk());

      mail.dispatch(
        mailActions.threadReadStateChanged({ emails: [anEmailIn('read', [MailboxId.Inbox])], isRead: true }),
      );

      expect(mail.unreadByMailbox()[MailboxId.Inbox]).toBe(3);
    });

    test('when an unread email is moved, then it counts in the mailbox it went to instead of the one it left', async () => {
      getMailboxesMock.mockResolvedValueOnce([
        aMailboxWithUnread(MailboxId.Inbox, 3),
        aMailboxWithUnread(MailboxId.Spam, 0),
      ]);
      const mail = createMailStore();
      await mail.dispatch(loadUnreadCountsThunk());

      mail.dispatch(
        mailActions.threadMovedOut({
          moves: [{ email: anEmailIn('unread', [MailboxId.Inbox], { isRead: false }), toMailboxId: MailboxId.Spam }],
        }),
      );

      expect(mail.unreadByMailbox()).toEqual({ [MailboxId.Inbox]: 2, [MailboxId.Spam]: 1 });
    });

    test('when a read email is moved, then no count changes', async () => {
      getMailboxesMock.mockResolvedValueOnce([
        aMailboxWithUnread(MailboxId.Inbox, 3),
        aMailboxWithUnread(MailboxId.Trash, 0),
      ]);
      const mail = createMailStore();
      await mail.dispatch(loadUnreadCountsThunk());

      mail.dispatch(
        mailActions.threadMovedOut({
          moves: [{ email: anEmailIn('read', [MailboxId.Inbox]), toMailboxId: MailboxId.Trash }],
        }),
      );

      expect(mail.unreadByMailbox()).toEqual({ [MailboxId.Inbox]: 3, [MailboxId.Trash]: 0 });
    });

    test('when the count of a mailbox is already zero, then reading one of its emails leaves it at zero', async () => {
      getMailboxesMock.mockResolvedValueOnce([aMailboxWithUnread(MailboxId.Inbox, 0)]);
      const mail = createMailStore();
      await mail.dispatch(loadUnreadCountsThunk());

      mail.dispatch(
        mailActions.threadReadStateChanged({
          emails: [anEmailIn('unread', [MailboxId.Inbox], { isRead: false })],
          isRead: true,
        }),
      );

      expect(mail.unreadByMailbox()[MailboxId.Inbox]).toBe(0);
    });

    test('when an unread email is deleted for good, then the count of its mailbox goes down', async () => {
      getMailboxesMock.mockResolvedValueOnce([aMailboxWithUnread(MailboxId.Trash, 2)]);
      const mail = createMailStore();
      await mail.dispatch(loadUnreadCountsThunk());

      mail.dispatch(mailActions.threadDeleted({ emails: [anEmailIn('unread', [MailboxId.Trash], { isRead: false })] }));

      expect(mail.unreadByMailbox()[MailboxId.Trash]).toBe(1);
    });

    test('when the mailboxes are loaded, then it is known which mailbox each email is in', async () => {
      getMailboxesMock.mockResolvedValueOnce([aMailboxWithUnread(MailboxId.Inbox, 3)]);
      const mail = createMailStore();

      await mail.dispatch(loadUnreadCountsThunk());

      expect(selectMailboxTypeById(mail.getState())).toEqual({ [ID_OF_MAILBOX[MailboxId.Inbox]]: MailboxId.Inbox });
    });
  });

  describe('Signing out', () => {
    test('when the user signs out, then no mailbox keeps any email', async () => {
      listEmailsMock.mockResolvedValueOnce(aPage([anEmail('private')], { hasMoreMails: true }));
      const mail = createMailStore();
      await mail.dispatch(loadFirstPageThunk(inbox));

      mail.dispatch(mailActions.resetState());

      expect(mail.shownIds()).toEqual([]);
      expect(mail.listOf().hasMoreMails).toBe(false);
    });

    test('when the user signs out, then the unread counts are cleared', async () => {
      getMailboxesMock.mockResolvedValueOnce([aMailboxWithUnread(MailboxId.Inbox, 3)]);
      const mail = createMailStore();
      await mail.dispatch(loadUnreadCountsThunk());

      mail.dispatch(mailActions.resetState());

      expect(mail.unreadByMailbox()).toEqual({});
    });
  });
});
