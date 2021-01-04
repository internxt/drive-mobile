import { combineReducers } from 'redux';

import { authenticationReducer } from './authentication.reducer';
import { filesReducer } from './files.reducer';
import { layoutReducer } from './layout.reducer';
import { settingsReducer } from './settings.reducer';

const appReducer = combineReducers({
  layoutState: layoutReducer,
  authenticationState: authenticationReducer,
  filesState: filesReducer,
  settingsState: settingsReducer
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'USER_SIGNOUT') {
    state = undefined
  }

  return appReducer(state, action)
}

export default rootReducer;