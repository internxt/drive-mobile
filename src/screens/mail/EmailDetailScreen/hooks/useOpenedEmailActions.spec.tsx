import { EmailResponse, EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { Alert, AlertButton } from 'react-native';
import { Provider } from 'react-redux';

import strings from '../../../../../assets/lang/strings';
import { mailboxService } from '../../../../services/mail/mailbox.service';
import {
  deleteEmailsPermanently,
  markEmailRead,
  markEmailUnread,
  moveEmails,
} from '../../../../services/mail/mailCrypto.service';
import { notifications } from '../../../../services/NotificationsService';
import mailReducer from '../../../../store/slices/mail';
import { createInitialMailState } from '../../../../store/slices/mail/initialState';
import { MailboxId } from '../../../../types/mail';
import { useOpenedEmailActions } from './useOpenedEmailActions';

jest.mock('../../../../services/mail/mailCrypto.service', () => ({
  markEmailRead: jest.fn(),
  markEmailUnread: jest.fn(),
  moveEmails: jest.fn(),
  deleteEmailsPermanently: jest.fn(),
}));

jest.mock('../../../../services/mail/mailbox.service', () => ({
  mailboxService: { getMailboxes: jest.fn() },
}));

jest.mock('../../../../services/NotificationsService', () => ({
  notifications: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

jest.mock('../../../../services/common/logger/logger.service', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const markEmailReadMock = markEmailRead as jest.Mock;
const markEmailUnreadMock = markEmailUnread as jest.Mock;
const moveEmailsMock = moveEmails as jest.Mock;
const deleteEmailsPermanentlyMock = deleteEmailsPermanently as jest.Mock;
const getMailboxesMock = mailboxService.getMailboxes as jest.Mock;

const USER_ADDRESS = 'user@inxt.me';

const ID_OF_MAILBOX: Record<MailboxId, string> = {
  [MailboxId.Inbox]: 'id-of-inbox',
  [MailboxId.Sent]: 'id-of-sent',
  [MailboxId.Drafts]: 'id-of-drafts',
  [MailboxId.Spam]: 'id-of-spam',
  [MailboxId.Trash]: 'id-of-trash',
};

const MAILBOX_TYPE_BY_ID = Object.fromEntries(
  Object.entries(ID_OF_MAILBOX).map(([mailboxId, id]) => [id, mailboxId as MailboxId]),
);

const aMessage = (
  id: string,
  mailboxId: MailboxId,
  { isRead = true, sender = 'someone@example.com' }: { isRead?: boolean; sender?: string } = {},
) =>
  ({
    id,
    mailboxIds: [ID_OF_MAILBOX[mailboxId]],
    isRead,
    isDraft: false,
    from: [{ email: sender }],
  }) as EmailResponse;

const OPENED_EMAIL_ID = 'opened';

const renderEmailActions = ({
  messages = [],
  openedEmailSummary = aMessage(OPENED_EMAIL_ID, MailboxId.Inbox) as EmailSummaryResponse,
  areMailboxesKnown = true,
}: {
  messages?: EmailResponse[];
  openedEmailSummary?: EmailSummaryResponse;
  areMailboxesKnown?: boolean;
}) => {
  const store = configureStore({
    reducer: { mail: mailReducer },
    preloadedState: {
      mail: { ...createInitialMailState(), mailboxTypeById: areMailboxesKnown ? MAILBOX_TYPE_BY_ID : {} },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const onReadStateChanged = jest.fn();
  const onFinished = jest.fn();
  const rendered = renderHook(
    () =>
      useOpenedEmailActions({
        messages,
        openedEmailSummary,
        selfAddress: USER_ADDRESS,
        onReadStateChanged,
        onFinished,
      }),
    { wrapper },
  );
  return { ...rendered, onReadStateChanged, onFinished };
};

const movedTo = () =>
  moveEmailsMock.mock.calls
    .at(-1)?.[0]
    .map(({ email, toMailboxId }: { email: EmailResponse; toMailboxId: MailboxId }) => [email.id, toMailboxId]);

const pressAlertButton = (buttonText: string) => {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as AlertButton[];
  buttons.find((button) => button.text === buttonText)?.onPress?.();
};

describe('Acting on the opened email', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    markEmailReadMock.mockResolvedValue(undefined);
    markEmailUnreadMock.mockResolvedValue(undefined);
    moveEmailsMock.mockImplementation(async (moves) => moves);
    deleteEmailsPermanentlyMock.mockImplementation(async (emails) => emails);
  });

  test('when an unread email is opened, then only that email is marked as read', async () => {
    const { onReadStateChanged } = renderEmailActions({
      messages: [
        aMessage('older', MailboxId.Inbox, { isRead: false }),
        aMessage(OPENED_EMAIL_ID, MailboxId.Inbox, { isRead: false }),
      ],
    });

    await waitFor(() => expect(onReadStateChanged).toHaveBeenCalledWith(OPENED_EMAIL_ID, true));
    expect(markEmailReadMock).toHaveBeenCalledTimes(1);
    expect(markEmailReadMock).toHaveBeenCalledWith(OPENED_EMAIL_ID);
  });

  test('when the mailboxes are not known yet, then they are loaded and the email is not marked as read', async () => {
    getMailboxesMock.mockReturnValue(new Promise(() => undefined));
    renderEmailActions({
      messages: [aMessage(OPENED_EMAIL_ID, MailboxId.Inbox, { isRead: false })],
      areMailboxesKnown: false,
    });

    await waitFor(() => expect(getMailboxesMock).toHaveBeenCalled());
    expect(markEmailReadMock).not.toHaveBeenCalled();
  });

  test('when the email is sent to spam, then only that email is moved and the screen is left', async () => {
    const { result, onFinished } = renderEmailActions({
      messages: [aMessage('other in inbox', MailboxId.Inbox), aMessage(OPENED_EMAIL_ID, MailboxId.Inbox)],
    });

    await act(() => result.current.moveThread(MailboxId.Spam));

    expect(movedTo()).toEqual([[OPENED_EMAIL_ID, MailboxId.Spam]]);
    expect(onFinished).toHaveBeenCalled();
  });

  test('when the conversation does not bring the opened email, then the email it was opened with is the one moved', async () => {
    const openedEmailSummary = aMessage(OPENED_EMAIL_ID, MailboxId.Sent, {
      sender: USER_ADDRESS,
    }) as EmailSummaryResponse;
    const { result } = renderEmailActions({
      messages: [aMessage('received copy', MailboxId.Inbox, { sender: USER_ADDRESS })],
      openedEmailSummary,
    });

    await act(() => result.current.moveThread(MailboxId.Trash));

    expect(movedTo()).toEqual([[OPENED_EMAIL_ID, MailboxId.Trash]]);
  });

  test('when an email the user sent with themselves in hidden copy is restored, then it goes back to the inbox', async () => {
    const openedEmailSummary = aMessage(OPENED_EMAIL_ID, MailboxId.Trash, {
      sender: USER_ADDRESS,
    }) as EmailSummaryResponse;
    const emailInConversation = {
      ...aMessage(OPENED_EMAIL_ID, MailboxId.Trash, { sender: USER_ADDRESS }),
      to: [{ email: 'another@example.com' }],
      bcc: [{ email: USER_ADDRESS }],
    } as EmailResponse;
    const { result } = renderEmailActions({ messages: [emailInConversation], openedEmailSummary });

    await act(() => result.current.restoreThread());

    expect(movedTo()).toEqual([[OPENED_EMAIL_ID, MailboxId.Inbox]]);
  });

  test('when an email the user sent is restored from the trash, then it goes back to the sent mailbox', async () => {
    const { result } = renderEmailActions({
      messages: [aMessage(OPENED_EMAIL_ID, MailboxId.Trash, { sender: USER_ADDRESS })],
    });

    await act(() => result.current.restoreThread());

    expect(movedTo()).toEqual([[OPENED_EMAIL_ID, MailboxId.Sent]]);
  });

  test('when the email could not be moved, then the user is told and stays on it', async () => {
    moveEmailsMock.mockImplementation(async () => []);
    const { result, onFinished } = renderEmailActions({ messages: [aMessage(OPENED_EMAIL_ID, MailboxId.Inbox)] });

    await act(() => result.current.moveThread(MailboxId.Trash));

    expect(notifications.error).toHaveBeenCalledWith(strings.screens.email_detail.moveToTrashFailed);
    expect(onFinished).not.toHaveBeenCalled();
  });

  test('when the user confirms deleting permanently, then only that email is deleted', async () => {
    const { result, onFinished } = renderEmailActions({
      messages: [aMessage('other in trash', MailboxId.Trash), aMessage(OPENED_EMAIL_ID, MailboxId.Trash)],
    });

    act(() => result.current.confirmAndDeleteThreadPermanently());
    await act(async () => pressAlertButton(strings.screens.email_detail.deleteConfirmation.confirm));

    expect(deleteEmailsPermanentlyMock.mock.calls[0][0].map((email: EmailResponse) => email.id)).toEqual([
      OPENED_EMAIL_ID,
    ]);
    expect(onFinished).toHaveBeenCalled();
  });

  test('when the user cancels deleting permanently, then nothing is deleted', async () => {
    const { result } = renderEmailActions({ messages: [aMessage(OPENED_EMAIL_ID, MailboxId.Trash)] });

    act(() => result.current.confirmAndDeleteThreadPermanently());
    await act(async () => pressAlertButton(strings.buttons.cancel));

    expect(deleteEmailsPermanentlyMock).not.toHaveBeenCalled();
  });

  test('when marking the email as unread fails, then the user is told and stays on it', async () => {
    markEmailUnreadMock.mockRejectedValue(new Error('the server is unreachable'));
    const { result, onFinished } = renderEmailActions({ messages: [aMessage(OPENED_EMAIL_ID, MailboxId.Inbox)] });

    await act(() => result.current.markUnread());

    expect(notifications.error).toHaveBeenCalledWith(strings.screens.email_detail.markUnreadFailed);
    expect(onFinished).not.toHaveBeenCalled();
  });
});
