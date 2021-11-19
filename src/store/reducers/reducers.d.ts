import { Dispatch } from 'react';
import { NavigationStackProp } from 'react-navigation-stack';
import { AuthenticationState } from './authentication.reducer';
import { FilesState } from './files.reducer';
import { LayoutState } from './layout.reducer';
import { SettingsState } from './settings.reducer';

interface InheritedProps {
  navigation: NavigationStackProp;
  dispatch: Dispatch;
}
interface Reducers extends InheritedProps {
  authenticationState: AuthenticationState;
  filesState: FilesState;
  layoutState: LayoutState;
  settingsState: SettingsState;
}
