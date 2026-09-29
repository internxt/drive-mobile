import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { decryptListedPreviews } from '@internxt-mobile/services/mail/mailCrypto.service';
import { mailboxService } from '@internxt-mobile/services/mail/mailbox.service';
import strings from '../../../../assets/lang/strings';
import mailReducer from '../../../store/slices/mail';
import { MailScreenProps } from '../../../types/navigation';
import { MailSearchScreen } from './index';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock('@internxt-mobile/services/mail/mailbox.service', () => ({
  mailboxService: { searchEmails: jest.fn() },
}));

jest.mock('@internxt-mobile/services/mail/mailCrypto.service', () => ({
  decryptListedPreviews: jest.fn(),
}));

jest.mock('@internxt-mobile/services/common/logger/logger.service', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('tailwind-rn', () => ({ useTailwind: () => () => ({}) }));

jest.mock('../../../hooks/useColor', () => ({
  __esModule: true,
  default: () => () => '#000000',
}));

const searchEmailsMock = mailboxService.searchEmails as jest.Mock;
const decryptListedPreviewsMock = decryptListedPreviews as jest.Mock;

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderSearchScreen = () => {
  const store = configureStore({
    reducer: {
      mail: mailReducer,
      auth: () => ({ user: { mnemonic: 'a mnemonic' } }),
      app: () => ({ language: 'en' }),
    },
  });
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  } as unknown as MailScreenProps<'MailSearch'>['navigation'];
  const route = { key: 'mail-search', name: 'MailSearch' } as MailScreenProps<'MailSearch'>['route'];
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <Provider store={store}>
        <MailSearchScreen navigation={navigation} route={route} />
      </Provider>
    </SafeAreaProvider>,
  );
};

describe('Searching from the search screen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    searchEmailsMock.mockResolvedValue({ emails: [], total: 0, hasMoreMails: false });
    decryptListedPreviewsMock.mockImplementation(async (page) => page);
  });

  test('when a search is sent, then the server is asked only once', async () => {
    const screen = renderSearchScreen();
    const input = screen.getByPlaceholderText(strings.screens.mail.search.placeholder);

    fireEvent.changeText(input, 'invoice');
    await act(async () => {
      fireEvent(input, 'submitEditing');
    });

    expect(await screen.findByText(strings.screens.mail.search.noResults)).toBeTruthy();
    expect(searchEmailsMock).toHaveBeenCalledTimes(1);
  });
});
