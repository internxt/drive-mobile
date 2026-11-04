import { NavigationState, PartialState } from '@react-navigation/native';

import { getFloatingButtonMode } from './floatingButtonMode';

type NestedState = PartialState<NavigationState>;

const TAB_NAMES = ['Home', 'Drive', 'Shared', 'Mail', 'Photos', 'Settings'];
const MAILBOX_LIST_SCREEN = 'MailboxDrawer';

const tabsFocusedOn = (tabName: string, tabState?: NestedState): NestedState => ({
  type: 'tab',
  index: TAB_NAMES.indexOf(tabName),
  routes: TAB_NAMES.map((name) => ({ name, state: name === tabName ? tabState : undefined })),
});

const mailStackFocusedOn = (screenName: string, screenState?: NestedState): NestedState => {
  const screensBelow = screenName === MAILBOX_LIST_SCREEN ? [] : [{ name: MAILBOX_LIST_SCREEN }];
  return {
    type: 'stack',
    index: screensBelow.length,
    routes: [...screensBelow, { name: screenName, state: screenState }],
  };
};

const mailboxDrawer = (status: 'open' | 'closed'): NestedState =>
  ({
    type: 'drawer',
    index: 0,
    routes: [{ name: 'inbox' }],
    history:
      status === 'open'
        ? [
            { type: 'route', key: 'inbox' },
            { type: 'drawer', status: 'open' },
          ]
        : [],
  }) as unknown as NestedState;

describe('The floating button shown on each tab', () => {
  test('when nothing has been navigated yet, then the home tab shows the upload button', () => {
    expect(getFloatingButtonMode(undefined)).toBe('upload');
  });

  test.each([
    ['home', 'Home'],
    ['drive', 'Drive'],
    ['shared', 'Shared'],
  ])('when the %s tab is open, then the upload button is shown', (_, tabName) => {
    expect(getFloatingButtonMode(tabsFocusedOn(tabName))).toBe('upload');
  });

  test.each([
    ['photos', 'Photos'],
    ['settings', 'Settings'],
  ])('when the %s tab is open, then no button is shown', (_, tabName) => {
    expect(getFloatingButtonMode(tabsFocusedOn(tabName))).toBeNull();
  });

  test('when mail has just been opened, then the compose button is shown', () => {
    expect(getFloatingButtonMode(tabsFocusedOn('Mail'))).toBe('compose');
  });

  test('when a mailbox is on screen with its menu closed, then the compose button is shown', () => {
    const state = tabsFocusedOn('Mail', mailStackFocusedOn(MAILBOX_LIST_SCREEN, mailboxDrawer('closed')));

    expect(getFloatingButtonMode(state)).toBe('compose');
  });

  test('when the menu of mailboxes is open, then no button is shown', () => {
    const state = tabsFocusedOn('Mail', mailStackFocusedOn(MAILBOX_LIST_SCREEN, mailboxDrawer('open')));

    expect(getFloatingButtonMode(state)).toBeNull();
  });

  test('when mail is opened from a link straight into a conversation, then no button is shown', () => {
    const stateFromLink: NestedState = { routes: [{ name: MAILBOX_LIST_SCREEN }, { name: 'EmailDetail' }] };

    expect(getFloatingButtonMode(tabsFocusedOn('Mail', stateFromLink))).toBeNull();
  });

  test.each([
    ['a conversation', 'EmailDetail'],
    ['the mail search', 'MailSearch'],
  ])('when %s is open, then no button is shown', (_, screen) => {
    expect(getFloatingButtonMode(tabsFocusedOn('Mail', mailStackFocusedOn(screen)))).toBeNull();
  });
});
