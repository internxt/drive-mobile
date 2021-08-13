import { AuthenticationState } from '../redux/reducers/authentication.reducer';
import { FilesState } from '../redux/reducers/files.reducer';
import { LayoutState } from '../redux/reducers/layout.reducer';
import { SettingsState } from '../redux/reducers/settings.reducer';

export interface IStoreReducers {
  layoutState: LayoutState,
  authenticationState: AuthenticationState,
  filesState: FilesState,
  settingsState: SettingsState
}