import { combineReducers } from "redux";

import { authentication } from "./authentication.reducer";

const rootReducer = combineReducers({
  authentication
});

export default rootReducer;
