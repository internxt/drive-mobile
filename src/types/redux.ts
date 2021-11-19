import { AuthenticationState } from '../store/reducers/authentication.reducer';
import { FilesState } from '../store/reducers/files.reducer';
import { LayoutState } from '../store/reducers/layout.reducer';
import { SettingsState } from '../store/reducers/settings.reducer';

export interface IStoreReducers {
  layoutState: LayoutState;
  authenticationState: AuthenticationState;
  filesState: FilesState;
  settingsState: SettingsState;
}
