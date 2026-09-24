import { EmailListResponse, EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { Provider } from 'react-redux';

import { decryptListedPreviews } from '@internxt-mobile/services/mail/mailCrypto.service';
import { SEARCH_PAGE_SIZE, mailboxService } from '@internxt-mobile/services/mail/mailbox.service';
import { EMPTY_SEARCH_CRITERIA } from '@internxt-mobile/services/mail/mailSearch';
import { useMailSearch } from './useMailSearch';

jest.mock('@internxt-mobile/services/mail/mailbox.service', () => ({
  SEARCH_PAGE_SIZE: 25,
  mailboxService: { searchEmails: jest.fn() },
}));

jest.mock('@internxt-mobile/services/mail/mailCrypto.service', () => ({
  decryptListedPreviews: jest.fn(),
}));

jest.mock('@internxt-mobile/services/common/logger/logger.service', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const searchEmailsMock = mailboxService.searchEmails as jest.Mock;
const decryptListedPreviewsMock = decryptListedPreviews as jest.Mock;

const SERVER_UNREACHABLE = new Error('the server is unreachable');
const INVOICE_SEARCH = { ...EMPTY_SEARCH_CRITERIA, text: 'invoice' };

const anEmail = (id: string) => ({ id, threadId: id }) as EmailSummaryResponse;

const idsFrom = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix}-${index}`);

const aPage = (ids: string[], hasMoreMails = false) =>
  ({ emails: ids.map(anEmail), total: ids.length, hasMoreMails }) as EmailListResponse;

const shownIds = (emails: EmailSummaryResponse[]) => emails.map((email) => email.id);

const resultsThatArriveWhenTold = () => {
  let deliverPage: (page: EmailListResponse) => void = () => undefined;
  searchEmailsMock.mockImplementationOnce(
    () =>
      new Promise<EmailListResponse>((resolve) => {
        deliverPage = resolve;
      }),
  );
  return { deliver: (page: EmailListResponse) => deliverPage(page) };
};

const renderSearch = () => {
  const store = configureStore({ reducer: { auth: () => ({ user: { mnemonic: 'a mnemonic' } }) } });
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => useMailSearch(), { wrapper });
};

describe('Searching the emails of every mailbox', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    decryptListedPreviewsMock.mockImplementation(async (page: EmailListResponse) => page);
  });

  test('when nothing is asked for, then nothing is searched and the screen stays waiting', async () => {
    const { result } = renderSearch();

    await act(() => result.current.search(EMPTY_SEARCH_CRITERIA));

    expect(searchEmailsMock).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('idle');
  });

  test('when a search is sent, then its results are shown', async () => {
    searchEmailsMock.mockResolvedValueOnce(aPage(['first', 'second']));
    const { result } = renderSearch();

    await act(() => result.current.search(INVOICE_SEARCH));

    expect(result.current.phase).toBe('loaded');
    expect(shownIds(result.current.emails)).toEqual(['first', 'second']);
  });

  test('when an older search answers after a newer one, then only the newer results are shown', async () => {
    const olderSearch = resultsThatArriveWhenTold();
    searchEmailsMock.mockResolvedValueOnce(aPage(['newer']));
    const { result } = renderSearch();

    act(() => {
      result.current.search({ ...EMPTY_SEARCH_CRITERIA, text: 'inv' });
    });
    await act(() => result.current.search(INVOICE_SEARCH));
    await act(async () => olderSearch.deliver(aPage(['older'])));

    expect(shownIds(result.current.emails)).toEqual(['newer']);
  });

  test('when the search fails and the user retries, then the results are shown', async () => {
    searchEmailsMock.mockRejectedValueOnce(SERVER_UNREACHABLE).mockResolvedValueOnce(aPage(['found']));
    const { result } = renderSearch();

    await act(() => result.current.search(INVOICE_SEARCH));
    expect(result.current.phase).toBe('failed');
    await act(() => result.current.retry());

    expect(result.current.phase).toBe('loaded');
    expect(shownIds(result.current.emails)).toEqual(['found']);
  });

  test('when the end of the results is reached, then the next page starts after the ones shown', async () => {
    searchEmailsMock.mockResolvedValueOnce(aPage(['first', 'second'], true)).mockResolvedValueOnce(aPage(['third']));
    const { result } = renderSearch();

    await act(() => result.current.search(INVOICE_SEARCH));
    await act(() => result.current.loadNextPage());

    expect(searchEmailsMock).toHaveBeenLastCalledWith({ text: 'invoice' }, { position: 2 });
    expect(shownIds(result.current.emails)).toEqual(['first', 'second', 'third']);
    expect(result.current.hasMoreMails).toBe(false);
  });

  test('when the next page fails and the user retries, then it is asked for again and its failure clears', async () => {
    searchEmailsMock
      .mockResolvedValueOnce(aPage(['first'], true))
      .mockRejectedValueOnce(SERVER_UNREACHABLE)
      .mockResolvedValueOnce(aPage(['second']));
    const { result } = renderSearch();

    await act(() => result.current.search(INVOICE_SEARCH));
    await act(() => result.current.loadNextPage());
    expect(result.current.hasNextPageFailed).toBe(true);
    await act(() => result.current.retryNextPage());

    expect(result.current.hasNextPageFailed).toBe(false);
    expect(shownIds(result.current.emails)).toEqual(['first', 'second']);
  });

  test('when the user comes back and the results changed, then the new ones replace them', async () => {
    searchEmailsMock.mockResolvedValueOnce(aPage(['deleted', 'kept'])).mockResolvedValueOnce(aPage(['kept']));
    const { result } = renderSearch();

    await act(() => result.current.search(INVOICE_SEARCH));
    await act(() => result.current.refresh());

    expect(shownIds(result.current.emails)).toEqual(['kept']);
  });

  test('when the user comes back after loading several pages, then every result shown is asked for again', async () => {
    const firstPageIds = idsFrom('first', SEARCH_PAGE_SIZE);
    const secondPageIds = idsFrom('second', SEARCH_PAGE_SIZE);
    searchEmailsMock
      .mockResolvedValueOnce(aPage(firstPageIds, true))
      .mockResolvedValueOnce(aPage(secondPageIds, true))
      .mockResolvedValueOnce(aPage([...firstPageIds, ...secondPageIds], true));
    const { result } = renderSearch();

    await act(() => result.current.search(INVOICE_SEARCH));
    await act(() => result.current.loadNextPage());
    await act(() => result.current.refresh());

    expect(searchEmailsMock).toHaveBeenLastCalledWith(
      { text: 'invoice' },
      { position: 0, limit: 2 * SEARCH_PAGE_SIZE },
    );
    expect(result.current.emails).toHaveLength(2 * SEARCH_PAGE_SIZE);
  });

  test('when the end of the results is reached twice while the next page arrives, then it is asked for only once', async () => {
    searchEmailsMock.mockResolvedValueOnce(aPage(['first'], true));
    const { result } = renderSearch();
    await act(() => result.current.search(INVOICE_SEARCH));
    const nextPage = resultsThatArriveWhenTold();

    await act(async () => {
      result.current.loadNextPage();
      result.current.loadNextPage();
    });
    await act(async () => nextPage.deliver(aPage(['second'])));

    expect(searchEmailsMock).toHaveBeenCalledTimes(2);
    expect(shownIds(result.current.emails)).toEqual(['first', 'second']);
  });

  test('when there are no more results, then reaching the end asks for nothing else', async () => {
    searchEmailsMock.mockResolvedValueOnce(aPage(['only']));
    const { result } = renderSearch();

    await act(() => result.current.search(INVOICE_SEARCH));
    await act(() => result.current.loadNextPage());

    expect(searchEmailsMock).toHaveBeenCalledTimes(1);
  });

  test('when the text is cleared after a search, then the results go away and the screen waits again', async () => {
    searchEmailsMock.mockResolvedValueOnce(aPage(['found']));
    const { result } = renderSearch();

    await act(() => result.current.search(INVOICE_SEARCH));
    await act(() => result.current.search(EMPTY_SEARCH_CRITERIA));

    expect(result.current.phase).toBe('idle');
    expect(result.current.emails).toEqual([]);
  });

  test('when the user comes back and the search fails, then the results already shown stay', async () => {
    searchEmailsMock.mockResolvedValueOnce(aPage(['kept'])).mockRejectedValueOnce(SERVER_UNREACHABLE);
    const { result } = renderSearch();

    await act(() => result.current.search(INVOICE_SEARCH));
    await act(() => result.current.refresh());

    expect(result.current.phase).toBe('loaded');
    expect(shownIds(result.current.emails)).toEqual(['kept']);
  });

  test('when the results are shown, then their previews are decrypted for the signed-in account', async () => {
    searchEmailsMock.mockResolvedValueOnce(aPage(['encrypted']));
    const { result } = renderSearch();

    await act(() => result.current.search(INVOICE_SEARCH));

    expect(decryptListedPreviewsMock).toHaveBeenCalledWith(expect.anything(), 'a mnemonic');
  });
});
