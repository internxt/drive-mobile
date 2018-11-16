import { combineReducers } from "redux";

import { authenticationReducer } from "./authentication.reducer";
import { filesReducer } from "./files.reducer";
import { layoutReducer } from "./layout.reducer";

const rootReducer = combineReducers({
  layoutState: layoutReducer,
  authenticationState: authenticationReducer,
  filesState: filesReducer
});

export default rootReducer;
