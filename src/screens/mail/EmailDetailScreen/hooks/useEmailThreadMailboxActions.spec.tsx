import { EmailResponse } from '@internxt/sdk/dist/mail/types';
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
import { useEmailThreadMailboxActions } from './useEmailThreadMailboxActions';

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

const renderThreadActions = ({
  messages,
  mailboxId,
  areMailboxesKnown = true,
}: {
  messages: EmailResponse[];
  mailboxId: MailboxId;
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
  const reloadThread = jest.fn().mockResolvedValue(undefined);
  const onFinished = jest.fn();
  const rendered = renderHook(
    () =>
      useEmailThreadMailboxActions({
        messages,
        mailboxId,
        selfAddress: USER_ADDRESS,
        onReadStateChanged,
        reloadThread,
        onFinished,
      }),
    { wrapper },
  );
  return { ...rendered, onReadStateChanged, reloadThread, onFinished };
};

const movedTo = () =>
  moveEmailsMock.mock.calls
    .at(-1)?.[0]
    .map(({ email, toMailboxId }: { email: EmailResponse; toMailboxId: MailboxId }) => [email.id, toMailboxId]);

const pressAlertButton = (buttonText: string) => {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as AlertButton[];
  buttons.find((button) => button.text === buttonText)?.onPress?.();
};

describe('Acting on a conversation from the mailbox it was opened in', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    markEmailReadMock.mockResolvedValue(undefined);
    markEmailUnreadMock.mockResolvedValue(undefined);
    moveEmailsMock.mockImplementation(async (moves) => moves);
    deleteEmailsPermanentlyMock.mockImplementation(async (emails) => emails);
  });

  test('when a conversation is opened, then its latest unread message in that mailbox is marked as read', async () => {
    const { onReadStateChanged } = renderThreadActions({
      messages: [
        aMessage('received', MailboxId.Inbox, { isRead: false }),
        aMessage('reply', MailboxId.Sent, { sender: USER_ADDRESS }),
      ],
      mailboxId: MailboxId.Inbox,
    });

    await waitFor(() => expect(onReadStateChanged).toHaveBeenCalledWith('received', true));
    expect(markEmailReadMock).toHaveBeenCalledTimes(1);
    expect(markEmailReadMock).toHaveBeenCalledWith('received');
  });

  test('when the mailboxes are not known yet, then they are loaded and no message is acted on', async () => {
    getMailboxesMock.mockReturnValue(new Promise(() => undefined));
    const { result } = renderThreadActions({
      messages: [aMessage('received', MailboxId.Inbox, { isRead: false })],
      mailboxId: MailboxId.Inbox,
      areMailboxesKnown: false,
    });

    await waitFor(() => expect(getMailboxesMock).toHaveBeenCalled());
    expect(result.current.messagesInMailbox).toEqual([]);
    expect(markEmailReadMock).not.toHaveBeenCalled();
  });

  test('when a conversation is sent to spam, then only its messages in the inbox are moved and the screen is left', async () => {
    const { result, onFinished } = renderThreadActions({
      messages: [aMessage('received', MailboxId.Inbox), aMessage('reply', MailboxId.Sent, { sender: USER_ADDRESS })],
      mailboxId: MailboxId.Inbox,
    });

    await act(() => result.current.moveThread(MailboxId.Spam));

    expect(movedTo()).toEqual([['received', MailboxId.Spam]]);
    expect(onFinished).toHaveBeenCalled();
  });

  test('when a conversation is restored from the trash, then each message goes back to where it came from', async () => {
    const { result } = renderThreadActions({
      messages: [
        aMessage('received', MailboxId.Trash),
        aMessage('reply', MailboxId.Trash, { sender: USER_ADDRESS }),
        aMessage('still in inbox', MailboxId.Inbox),
      ],
      mailboxId: MailboxId.Trash,
    });

    await act(() => result.current.restoreThread());

    expect(movedTo()).toEqual([
      ['received', MailboxId.Inbox],
      ['reply', MailboxId.Sent],
    ]);
  });

  test('when only some messages could be moved, then the user is told and the conversation is loaded again', async () => {
    moveEmailsMock.mockImplementation(async (moves) => moves.slice(0, 1));
    const { result, onFinished, reloadThread } = renderThreadActions({
      messages: [aMessage('first', MailboxId.Inbox), aMessage('second', MailboxId.Inbox)],
      mailboxId: MailboxId.Inbox,
    });

    await act(() => result.current.moveThread(MailboxId.Trash));

    expect(notifications.error).toHaveBeenCalledWith(strings.screens.email_detail.moveFailed);
    expect(reloadThread).toHaveBeenCalled();
    expect(onFinished).not.toHaveBeenCalled();
  });

  test('when no message could be moved, then the user is told and the conversation stays as it was', async () => {
    moveEmailsMock.mockImplementation(async () => []);
    const { result, onFinished, reloadThread } = renderThreadActions({
      messages: [aMessage('received', MailboxId.Inbox)],
      mailboxId: MailboxId.Inbox,
    });

    await act(() => result.current.moveThread(MailboxId.Trash));

    expect(notifications.error).toHaveBeenCalledWith(strings.screens.email_detail.moveFailed);
    expect(reloadThread).not.toHaveBeenCalled();
    expect(onFinished).not.toHaveBeenCalled();
  });

  test('when the user confirms deleting permanently, then only the messages in the trash are deleted', async () => {
    const { result, onFinished } = renderThreadActions({
      messages: [aMessage('in trash', MailboxId.Trash), aMessage('still in inbox', MailboxId.Inbox)],
      mailboxId: MailboxId.Trash,
    });

    result.current.confirmAndDeleteThreadPermanently();
    await act(async () => pressAlertButton(strings.screens.email_detail.deleteConfirmation.confirm));

    expect(deleteEmailsPermanentlyMock.mock.calls[0][0].map((email: EmailResponse) => email.id)).toEqual(['in trash']);
    expect(onFinished).toHaveBeenCalled();
  });

  test('when the user cancels deleting permanently, then nothing is deleted', async () => {
    const { result } = renderThreadActions({
      messages: [aMessage('in trash', MailboxId.Trash)],
      mailboxId: MailboxId.Trash,
    });

    result.current.confirmAndDeleteThreadPermanently();
    await act(async () => pressAlertButton(strings.buttons.cancel));

    expect(deleteEmailsPermanentlyMock).not.toHaveBeenCalled();
  });

  test('when marking the conversation as unread fails, then the user is told and stays on it', async () => {
    markEmailUnreadMock.mockRejectedValue(new Error('the server is unreachable'));
    const { result, onFinished } = renderThreadActions({
      messages: [aMessage('received', MailboxId.Inbox)],
      mailboxId: MailboxId.Inbox,
    });

    await act(() => result.current.markUnread());

    expect(notifications.error).toHaveBeenCalledWith(strings.screens.email_detail.markUnreadFailed);
    expect(onFinished).not.toHaveBeenCalled();
  });
});
