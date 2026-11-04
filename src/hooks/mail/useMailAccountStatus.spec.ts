import { renderHook, waitFor } from '@testing-library/react-native';

import { HTTP_FORBIDDEN, HTTP_INTERNAL_SERVER_ERROR } from '../../services/common/httpStatusCodes';
import { mailboxService } from '../../services/mail/mailbox.service';
import { useMailAccountStatus } from './useMailAccountStatus';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock('../../services/mail/mailbox.service', () => ({
  mailboxService: { getMailAccountKeys: jest.fn() },
}));

const getMailAccountKeysMock = jest.mocked(mailboxService.getMailAccountKeys);

describe('Checking whether the user has a mail account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when the user has never set up a mail account, then the account is reported as not set up', async () => {
    getMailAccountKeysMock.mockRejectedValue({ status: HTTP_FORBIDDEN, data: { code: 'MAIL_NOT_SETUP' } });

    const { result } = renderHook(() => useMailAccountStatus({ isEnabled: true }));

    await waitFor(() => expect(result.current).toBe('notSetUp'));
  });

  test('when the user has a mail account, then the account is reported as ready', async () => {
    getMailAccountKeysMock.mockResolvedValue({} as Awaited<ReturnType<typeof mailboxService.getMailAccountKeys>>);

    const { result } = renderHook(() => useMailAccountStatus({ isEnabled: true }));

    await waitFor(() => expect(getMailAccountKeysMock).toHaveBeenCalledTimes(1));
    expect(result.current).toBe('ready');
  });

  test('when the server cannot be reached, then the account is not reported as missing', async () => {
    getMailAccountKeysMock.mockRejectedValue({ status: HTTP_INTERNAL_SERVER_ERROR });

    const { result } = renderHook(() => useMailAccountStatus({ isEnabled: true }));

    await waitFor(() => expect(getMailAccountKeysMock).toHaveBeenCalledTimes(1));
    expect(result.current).toBe('ready');
  });

  test('when the plan does not include Mail, then the account is not checked', () => {
    renderHook(() => useMailAccountStatus({ isEnabled: false }));

    expect(getMailAccountKeysMock).not.toHaveBeenCalled();
  });
});
