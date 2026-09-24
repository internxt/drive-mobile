import { EmailListResponse, EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { Provider } from 'react-redux';

import { decryptListedPreviews } from '@internxt-mobile/services/mail/mailCrypto.service';
import { mailboxService } from '@internxt-mobile/services/mail/mailbox.service';
import { MailboxId } from '../../../../types/mail';
import mailReducer from '../index';
import { useMailboxEmails } from './useMailboxEmails';

jest.mock('@internxt-mobile/services/mail/mailbox.service', () => ({
  mailboxService: { listEmails: jest.fn() },
}));

jest.mock('@internxt-mobile/services/mail/mailCrypto.service', () => ({
  decryptListedPreviews: jest.fn(),
}));

jest.mock('@internxt-mobile/services/common/logger/logger.service', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const listEmailsMock = mailboxService.listEmails as jest.Mock;
const decryptListedPreviewsMock = decryptListedPreviews as jest.Mock;

const anEmail = (id: string, day: number) =>
  ({ id, threadId: id, receivedAt: `2026-09-${String(day).padStart(2, '0')}T10:00:00Z` }) as EmailSummaryResponse;

const aPage = (emails: EmailSummaryResponse[], hasMoreMails = false) =>
  ({ emails, total: emails.length, hasMoreMails }) as EmailListResponse;

const renderMailbox = () => {
  const store = configureStore({ reducer: { mail: mailReducer, auth: () => ({ user: undefined }) } });
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => useMailboxEmails(MailboxId.Inbox), { wrapper });
};

describe('Showing a mailbox on screen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    decryptListedPreviewsMock.mockImplementation(async (page: EmailListResponse) => page);
  });

  test('when the mailbox is loaded, then the screen gets its emails newest first', async () => {
    listEmailsMock.mockResolvedValueOnce(aPage([anEmail('older', 1), anEmail('newer', 9)]));
    const { result } = renderMailbox();

    await act(() => result.current.loadFirstPage());

    expect(result.current.emails.map((email) => email.id)).toEqual(['newer', 'older']);
  });

  test('when a further page failed and the user retries, then the page is asked for again and its failure clears', async () => {
    listEmailsMock
      .mockResolvedValueOnce(aPage([anEmail('newer', 9), anEmail('last', 5)], true))
      .mockRejectedValueOnce(new Error('the server is unreachable'))
      .mockRejectedValueOnce(new Error('the server is unreachable'))
      .mockResolvedValueOnce(aPage([anEmail('older', 1)]));
    const { result } = renderMailbox();
    await act(() => result.current.loadFirstPage());
    await act(() => result.current.loadNextPage());
    expect(result.current.hasNextPageFailed).toBe(true);

    await act(() => result.current.retryNextPage());

    expect(result.current.hasNextPageFailed).toBe(false);
    expect(result.current.emails.map((email) => email.id)).toEqual(['newer', 'last', 'older']);
  });
});
