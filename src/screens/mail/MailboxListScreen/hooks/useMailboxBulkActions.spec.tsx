import { EmailResponse, EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { Alert, AlertButton } from 'react-native';
import { Provider } from 'react-redux';

import strings from '../../../../../assets/lang/strings';
import asyncStorageService from '../../../../services/AsyncStorageService';
import {
  deleteEmailsPermanently,
  moveEmails,
  updateEmailsReadState,
} from '../../../../services/mail/mailCrypto.service';
import { mailboxService } from '../../../../services/mail/mailbox.service';
import { notifications } from '../../../../services/NotificationsService';
import mailReducer from '../../../../store/slices/mail';
import { createInitialMailState } from '../../../../store/slices/mail/initialState';
import { MailboxId } from '../../../../types/mail';
import { useMailboxBulkActions } from './useMailboxBulkActions';

jest.mock('../../../../services/mail/mailCrypto.service', () => ({
  moveEmails: jest.fn(),
  deleteEmailsPermanently: jest.fn(),
  updateEmailsReadState: jest.fn(),
}));

jest.mock('../../../../services/mail/mailbox.service', () => ({
  mailboxService: { getThread: jest.fn() },
}));

jest.mock('../../../../services/AsyncStorageService', () => ({
  __esModule: true,
  default: { getItem: jest.fn() },
}));

jest.mock('../../../../services/NotificationsService', () => ({
  notifications: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

jest.mock('../../../../services/common/logger/logger.service', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const moveEmailsMock = moveEmails as jest.Mock;
const deleteEmailsPermanentlyMock = deleteEmailsPermanently as jest.Mock;
const updateEmailsReadStateMock = updateEmailsReadState as jest.Mock;
const getThreadMock = mailboxService.getThread as jest.Mock;
const getItemMock = asyncStorageService.getItem as jest.Mock;

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

const aMessage = (id: string, mailboxId: MailboxId, { sender = 'someone@example.com' }: { sender?: string } = {}) =>
  ({
    id,
    mailboxIds: [ID_OF_MAILBOX[mailboxId]],
    isRead: true,
    isDraft: false,
    from: [{ email: sender }],
  }) as EmailResponse;

const aRow = (id: string, { isRead = true }: { isRead?: boolean } = {}) =>
  ({ id, mailboxIds: [ID_OF_MAILBOX[MailboxId.Inbox]], isRead }) as EmailSummaryResponse;

const threadsByRowId = (threads: Record<string, EmailResponse[]>) =>
  getThreadMock.mockImplementation(async (emailId: string) => {
    const thread = threads[emailId];
    if (!thread) {
      throw new Error('the server is unreachable');
    }
    return thread;
  });

const renderBulkActions = ({
  mailboxId,
  selectedEmails,
}: {
  mailboxId: MailboxId;
  selectedEmails: EmailSummaryResponse[];
}) => {
  const store = configureStore({
    reducer: { mail: mailReducer },
    preloadedState: { mail: { ...createInitialMailState(), mailboxTypeById: MAILBOX_TYPE_BY_ID } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const onFinished = jest.fn();
  const rendered = renderHook(() => useMailboxBulkActions({ mailboxId, selectedEmails, onFinished }), { wrapper });
  return { ...rendered, onFinished };
};

const movedTo = () =>
  moveEmailsMock.mock.calls
    .at(-1)?.[0]
    .map(({ email, toMailboxId }: { email: EmailResponse; toMailboxId: MailboxId }) => [email.id, toMailboxId]);

const pressAlertButton = (buttonText: string) => {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as AlertButton[];
  buttons.find((button) => button.text === buttonText)?.onPress?.();
};

describe('Acting on several conversations of a mailbox at once', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    getItemMock.mockResolvedValue(USER_ADDRESS);
    moveEmailsMock.mockImplementation(async (moves) => moves);
    deleteEmailsPermanentlyMock.mockImplementation(async (emails) => emails);
    updateEmailsReadStateMock.mockImplementation(async (emails) => emails);
  });

  test('when conversations are sent to spam, then every message of theirs in the inbox is moved', async () => {
    threadsByRowId({
      first: [aMessage('older in first', MailboxId.Inbox), aMessage('first', MailboxId.Inbox)],
      second: [aMessage('reply', MailboxId.Sent, { sender: USER_ADDRESS }), aMessage('second', MailboxId.Inbox)],
    });
    const { result, onFinished } = renderBulkActions({
      mailboxId: MailboxId.Inbox,
      selectedEmails: [aRow('first'), aRow('second')],
    });

    await act(() => result.current.moveSelected(MailboxId.Spam));

    expect(movedTo()).toEqual([
      ['older in first', MailboxId.Spam],
      ['first', MailboxId.Spam],
      ['second', MailboxId.Spam],
    ]);
    expect(notifications.error).not.toHaveBeenCalled();
    expect(onFinished).toHaveBeenCalled();
  });

  test('when conversations are restored, then each message goes back to where it came from', async () => {
    threadsByRowId({
      received: [aMessage('received', MailboxId.Trash)],
      reply: [aMessage('reply', MailboxId.Trash, { sender: USER_ADDRESS })],
    });
    const { result } = renderBulkActions({
      mailboxId: MailboxId.Trash,
      selectedEmails: [aRow('received'), aRow('reply')],
    });
    await act(async () => undefined);

    await act(() => result.current.restoreSelected());

    expect(movedTo()).toEqual([
      ['received', MailboxId.Inbox],
      ['reply', MailboxId.Sent],
    ]);
  });

  test('when a conversation cannot be loaded, then the others are moved and the user is told how many failed', async () => {
    threadsByRowId({ loads: [aMessage('loads', MailboxId.Inbox)] });
    const { result, onFinished } = renderBulkActions({
      mailboxId: MailboxId.Inbox,
      selectedEmails: [aRow('loads'), aRow('fails')],
    });

    await act(() => result.current.moveSelected(MailboxId.Trash));

    expect(movedTo()).toEqual([['loads', MailboxId.Trash]]);
    expect(notifications.error).toHaveBeenCalledWith(
      strings.formatString(strings.screens.mail.bulkActionFailed, 1, 2) as string,
    );
    expect(onFinished).toHaveBeenCalled();
  });

  test('when a message of a conversation could not be moved, then that conversation counts as failed', async () => {
    moveEmailsMock.mockImplementation(async (moves) => moves.slice(1));
    threadsByRowId({ first: [aMessage('stuck', MailboxId.Inbox), aMessage('first', MailboxId.Inbox)] });
    const { result } = renderBulkActions({ mailboxId: MailboxId.Inbox, selectedEmails: [aRow('first')] });

    await act(() => result.current.moveSelected(MailboxId.Trash));

    expect(notifications.error).toHaveBeenCalledWith(
      strings.formatString(strings.screens.mail.bulkActionFailed, 1, 1) as string,
    );
  });

  test('when conversations are marked as read, then only the unread ones are changed and no conversation is fetched', async () => {
    const { result } = renderBulkActions({
      mailboxId: MailboxId.Inbox,
      selectedEmails: [aRow('unread', { isRead: false }), aRow('read')],
    });

    await act(() => result.current.markSelectedRead());

    expect(updateEmailsReadStateMock).toHaveBeenCalledWith([expect.objectContaining({ id: 'unread' })], true);
    expect(getThreadMock).not.toHaveBeenCalled();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  test('when the user confirms deleting permanently, then only the messages in the trash are deleted', async () => {
    threadsByRowId({ trashed: [aMessage('trashed', MailboxId.Trash), aMessage('still in inbox', MailboxId.Inbox)] });
    const { result } = renderBulkActions({ mailboxId: MailboxId.Trash, selectedEmails: [aRow('trashed')] });

    result.current.confirmAndDeleteSelectedPermanently();
    await act(async () => pressAlertButton(strings.screens.email_detail.deleteConfirmation.confirm));

    expect(deleteEmailsPermanentlyMock.mock.calls[0][0].map((email: EmailResponse) => email.id)).toEqual(['trashed']);
  });

  test('when the user cancels deleting permanently, then nothing is deleted', async () => {
    const { result } = renderBulkActions({ mailboxId: MailboxId.Trash, selectedEmails: [aRow('trashed')] });

    result.current.confirmAndDeleteSelectedPermanently();
    await act(async () => pressAlertButton(strings.buttons.cancel));

    expect(deleteEmailsPermanentlyMock).not.toHaveBeenCalled();
    expect(getThreadMock).not.toHaveBeenCalled();
  });
});
