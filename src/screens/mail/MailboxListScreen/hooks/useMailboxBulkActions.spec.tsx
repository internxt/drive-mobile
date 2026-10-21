import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
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

jest.mock('../../../../services/AsyncStorageService', () => ({
  __esModule: true,
  default: { getItem: jest.fn() },
}));

jest.mock('../../../../services/NotificationsService', () => ({
  notifications: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

const moveEmailsMock = moveEmails as jest.Mock;
const deleteEmailsPermanentlyMock = deleteEmailsPermanently as jest.Mock;
const updateEmailsReadStateMock = updateEmailsReadState as jest.Mock;
const getItemMock = asyncStorageService.getItem as jest.Mock;

const USER_ADDRESS = 'user@inxt.me';

const aRow = (
  id: string,
  { isRead = true, sender = 'someone@example.com' }: { isRead?: boolean; sender?: string } = {},
) =>
  ({ id, mailboxIds: ['id-of-a-mailbox'], isRead, isDraft: false, from: [{ email: sender }] }) as EmailSummaryResponse;

const renderBulkActions = (selectedEmails: EmailSummaryResponse[]) => {
  const store = configureStore({
    reducer: { mail: mailReducer },
    preloadedState: { mail: createInitialMailState() },
  });
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const onFinished = jest.fn();
  const rendered = renderHook(() => useMailboxBulkActions({ selectedEmails, onFinished }), { wrapper });
  return { ...rendered, onFinished };
};

const movedTo = () =>
  moveEmailsMock.mock.calls
    .at(-1)?.[0]
    .map(({ email, toMailboxId }: { email: EmailSummaryResponse; toMailboxId: MailboxId }) => [email.id, toMailboxId]);

const pressAlertButton = (buttonText: string) => {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as AlertButton[];
  buttons.find((button) => button.text === buttonText)?.onPress?.();
};

describe('Acting on several emails of a mailbox at once', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    getItemMock.mockResolvedValue(USER_ADDRESS);
    moveEmailsMock.mockImplementation(async (moves) => moves);
    deleteEmailsPermanentlyMock.mockImplementation(async (emails) => emails);
    updateEmailsReadStateMock.mockImplementation(async (emails) => emails);
  });

  test('when emails are sent to spam, then exactly the selected emails are moved', async () => {
    const { result, onFinished } = renderBulkActions([aRow('first'), aRow('second')]);

    await act(() => result.current.moveSelected(MailboxId.Spam));

    expect(movedTo()).toEqual([
      ['first', MailboxId.Spam],
      ['second', MailboxId.Spam],
    ]);
    expect(notifications.error).not.toHaveBeenCalled();
    expect(onFinished).toHaveBeenCalled();
  });

  test('when emails are restored, then each one goes back to where it came from', async () => {
    const { result } = renderBulkActions([aRow('received'), aRow('reply', { sender: USER_ADDRESS })]);
    await act(async () => undefined);

    await act(() => result.current.restoreSelected());

    expect(movedTo()).toEqual([
      ['received', MailboxId.Inbox],
      ['reply', MailboxId.Sent],
    ]);
  });

  test('when some emails could not be moved, then the user is told how many failed', async () => {
    moveEmailsMock.mockImplementation(async (moves) => moves.slice(1));
    const { result, onFinished } = renderBulkActions([aRow('stuck'), aRow('moved')]);

    await act(() => result.current.moveSelected(MailboxId.Trash));

    expect(notifications.error).toHaveBeenCalledWith(
      strings.formatString(strings.screens.mail.bulkActionFailed, 1, 2) as string,
    );
    expect(onFinished).toHaveBeenCalled();
  });

  test('when emails are marked as read, then only the unread ones are changed', async () => {
    const { result } = renderBulkActions([aRow('unread', { isRead: false }), aRow('read')]);

    await act(() => result.current.markSelectedRead());

    expect(updateEmailsReadStateMock).toHaveBeenCalledWith([expect.objectContaining({ id: 'unread' })], true);
    expect(notifications.error).not.toHaveBeenCalled();
  });

  test('when the user confirms deleting permanently, then exactly the selected emails are deleted', async () => {
    const { result } = renderBulkActions([aRow('trashed')]);

    result.current.confirmAndDeleteSelectedPermanently();
    await act(async () => pressAlertButton(strings.screens.email_detail.deleteConfirmation.confirm));

    expect(deleteEmailsPermanentlyMock.mock.calls[0][0].map((email: EmailSummaryResponse) => email.id)).toEqual([
      'trashed',
    ]);
  });

  test('when the user cancels deleting permanently, then nothing is deleted', async () => {
    const { result } = renderBulkActions([aRow('trashed')]);

    result.current.confirmAndDeleteSelectedPermanently();
    await act(async () => pressAlertButton(strings.buttons.cancel));

    expect(deleteEmailsPermanentlyMock).not.toHaveBeenCalled();
  });
});
