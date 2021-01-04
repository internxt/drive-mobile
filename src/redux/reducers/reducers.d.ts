import { AuthenticationState } from './authentication.reducer'
import { FilesState } from './files.reducer';
import { LayoutState } from './layout.reducer';
import { SettingsState } from './settings.reducer';

interface Reducers {
    authenticationState: AuthenticationState
    filesState: FilesState
    layoutState: LayoutState
    settingsState: SettingsState
}