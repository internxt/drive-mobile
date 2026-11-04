import { EmailListResponse, EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { configureStore } from '@reduxjs/toolkit';
import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { decryptListedPreviews } from '@internxt-mobile/services/mail/mailCrypto.service';
import { mailboxService } from '@internxt-mobile/services/mail/mailbox.service';
import strings from '../../../../assets/lang/strings';
import mailReducer from '../../../store/slices/mail';
import { MailboxId } from '../../../types/mail';
import { MailboxScreenProps } from '../../../types/navigation';
import MailboxListScreen from './index';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock('@internxt-mobile/services/mail/mailbox.service', () => ({
  mailboxService: { listEmails: jest.fn(), getMailboxes: jest.fn() },
}));

jest.mock('@internxt-mobile/services/mail/mailCrypto.service', () => ({
  collectDecryptedPreviews: jest.fn(),
  decryptListedPreviews: jest.fn(),
}));

jest.mock('@internxt-mobile/services/common/logger/logger.service', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('../components/MailListSkeleton', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return { MailListSkeleton: () => <MockView testID="mail-list-skeleton" /> };
});

jest.mock('tailwind-rn', () => ({ useTailwind: () => () => ({}) }));

jest.mock('../../../hooks/useColor', () => ({
  __esModule: true,
  default: () => () => '#000000',
}));

const listEmailsMock = mailboxService.listEmails as jest.Mock;
const getMailboxesMock = mailboxService.getMailboxes as jest.Mock;
const decryptListedPreviewsMock = decryptListedPreviews as jest.Mock;

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const anEmail = (id: string) =>
  ({ id, threadId: id, subject: `Subject ${id}`, receivedAt: '2026-09-09T10:00:00Z' }) as EmailSummaryResponse;

const aPage = (emails: EmailSummaryResponse[]) => ({ emails, total: emails.length, hasMoreMails: false }) as EmailListResponse;

const renderInbox = () => {
  const store = configureStore({
    reducer: {
      mail: mailReducer,
      auth: () => ({ user: { mnemonic: 'a mnemonic' } }),
      app: () => ({ language: 'en' }),
    },
  });
  const navigation = {
    navigate: jest.fn(),
    openDrawer: jest.fn(),
  } as unknown as MailboxScreenProps['navigation'];
  const route = { key: 'mailbox-inbox', name: MailboxId.Inbox } as MailboxScreenProps['route'];
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <Provider store={store}>
        <MailboxListScreen navigation={navigation} route={route} />
      </Provider>
    </SafeAreaProvider>,
  );
};

describe('Opening a mailbox for the first time', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getMailboxesMock.mockResolvedValue([]);
    decryptListedPreviewsMock.mockImplementation(async (page: EmailListResponse) => page);
  });

  test('when the mailbox opens and its first load has not started yet, then it shows the loading skeleton and not the empty message', () => {
    listEmailsMock.mockReturnValue(new Promise(() => undefined));

    const screen = renderInbox();

    expect(screen.getByTestId('mail-list-skeleton')).toBeTruthy();
    expect(screen.queryByText(strings.screens.mail.empty[MailboxId.Inbox])).toBeNull();
  });

  test('when the first load is still in progress, then it keeps showing the loading skeleton', async () => {
    listEmailsMock.mockReturnValue(new Promise(() => undefined));
    const screen = renderInbox();

    await waitFor(() => expect(listEmailsMock).toHaveBeenCalledTimes(1));

    expect(screen.getByTestId('mail-list-skeleton')).toBeTruthy();
    expect(screen.queryByText(strings.screens.mail.empty[MailboxId.Inbox])).toBeNull();
  });

  test('when the mailbox has no emails, then the empty message appears only after the first load finishes', async () => {
    listEmailsMock.mockResolvedValue(aPage([]));
    const screen = renderInbox();
    expect(screen.queryByText(strings.screens.mail.empty[MailboxId.Inbox])).toBeNull();

    expect(await screen.findByText(strings.screens.mail.empty[MailboxId.Inbox])).toBeTruthy();
    expect(screen.queryByTestId('mail-list-skeleton')).toBeNull();
  });

  test('when the mailbox has emails, then they replace the loading skeleton without showing the empty message', async () => {
    listEmailsMock.mockResolvedValue(aPage([anEmail('first')]));
    const screen = renderInbox();

    expect(await screen.findByText('Subject first')).toBeTruthy();
    expect(screen.queryByTestId('mail-list-skeleton')).toBeNull();
    expect(screen.queryByText(strings.screens.mail.empty[MailboxId.Inbox])).toBeNull();
  });
});
