import { combineReducers } from 'redux';

import { authenticationReducer } from './authentication.reducer';
import { filesReducer } from './files.reducer';
import { layoutReducer } from './layout.reducer';
import { settingsReducer } from './settings.reducer';

const rootReducer = combineReducers({
  layoutState: layoutReducer,
  authenticationState: authenticationReducer,
  filesState: filesReducer,
  settingsState: settingsReducer
});

export default rootReducer;
