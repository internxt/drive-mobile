import { AuthenticationState } from '../redux/reducers/authentication.reducer';
import { FilesState } from '../redux/reducers/files.reducer';
import { LayoutState } from '../redux/reducers/layout.reducer';
import { PhotosState } from '../redux/reducers/photos.reducer';
import { SettingsState } from '../redux/reducers/settings.reducer';

export interface IStoreReducers {
  layoutState: LayoutState,
  authenticationState: AuthenticationState,
  photosState: PhotosState,
  filesState: FilesState,
  settingsState: SettingsState
}