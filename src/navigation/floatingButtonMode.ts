import { getDrawerStatusFromState } from '@react-navigation/drawer';
import { DrawerNavigationState, NavigationState, ParamListBase, PartialState } from '@react-navigation/native';

import { FloatingActionButtonMode } from '../components/FloatingActionButton';
import { MailStackParamList, TabExplorerStackParamList } from '../types/navigation';

type NestedState = NavigationState | PartialState<NavigationState>;

const INITIAL_TAB: keyof TabExplorerStackParamList = 'Home';
const MAILBOX_LIST_SCREEN: keyof MailStackParamList = 'MailboxDrawer';
const UPLOAD_TABS = new Set<string>(['Home', 'Drive', 'Shared']);

const getFocusedRoute = (state: NestedState | undefined) => {
  if (!state) {
    return undefined;
  }
  const isStack = state.type === undefined || state.type === 'stack';
  const fallbackIndex = isStack ? state.routes.length - 1 : 0;
  return state.routes[state.index ?? fallbackIndex];
};

const isDrawerOpen = (drawerState: NestedState | undefined) =>
  !!drawerState &&
  'history' in drawerState &&
  !!drawerState.history &&
  getDrawerStatusFromState(drawerState as DrawerNavigationState<ParamListBase>) === 'open';

/** Returns the floating button of the screen focused in the tab explorer, or `null` when it has none. */
export const getFloatingButtonMode = (tabExplorerState: NestedState | undefined): FloatingActionButtonMode | null => {
  const tabRoute = getFocusedRoute(tabExplorerState);
  const tabName = tabRoute?.name ?? INITIAL_TAB;

  if (UPLOAD_TABS.has(tabName)) {
    return 'upload';
  }
  if (tabName !== 'Mail') {
    return null;
  }

  const mailRoute = getFocusedRoute(tabRoute?.state);
  const mailScreenName = mailRoute?.name ?? MAILBOX_LIST_SCREEN;
  if (mailScreenName !== MAILBOX_LIST_SCREEN || isDrawerOpen(mailRoute?.state)) {
    return null;
  }
  return 'compose';
};
